"""
Cœur du Coach IA cétogène (RAG local + LLM pas cher + garde-fou santé).

Simple par choix : un seul fichier qui fait le travail. Moins de pièces = moins de bugs.
- Base de connaissance : ChromaDB locale (gratuit, pas de Pinecone).
- LLM : modèle pas cher via OpenRouter (défaut: qwen3 / deepseek).
- Garde-fou : jamais de conseil médical inventé, toujours orienter vers le pro.
"""

import os
import json
from pathlib import Path

# ------------------------------------------------ config ------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent

# Charger les variables d'environnement du fichier .env (clés API) si présent
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except Exception:
    pass

KB_PATH = BASE_DIR / "knowledge-base" / "sample-docs.json"
CHROMA_DIR = BASE_DIR / "data" / "chroma"
# Collection curatée (ingérée via scripts/ingest_kb.py depuis context/theme_*.json)
COLLECTION = "elan_keto_kb"

# LLM via OpenRouter (pas cher). Surcharge par .env si présent.
RAG_LLM_MODEL = os.environ.get("RAG_MODEL", "qwen/qwen3-32b:free")
EMBED_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")

# Journaux simples
import logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("keto-coach")

# ------------------------------------------------ Chroma (vector store local)
def get_chroma():
    import chromadb
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client

def ensure_collection():
    """Crée (si besoin) la collection et indexe la base de connaissance."""
    import chromadb

    client = get_chroma()
    col = client.get_or_create_collection(name=COLLECTION, metadata={"hnsw:space": "cosine"})
    if col.count() > 0:
        return col

    # Charger les documents
    if not KB_PATH.exists():
        logger.warning("knowledge-base introuvable, collection vide")
        return col

    import json
    data = json.loads(KB_PATH.read_text(encoding="utf-8"))
    docs = data.get("documents", [])

    # Chroma exige des IDs, documents et optional metadata
    ids = [d["id"] for d in docs]
    texts = [d["content"] for d in docs]
    metadatas = [{
        "title": d.get("title", ""),
        "category": d.get("category", ""),
        "phase": ",".join(d.get("phase", [])),
        "symptoms": ",".join(d.get("symptoms", [])),
        "sources": ",".join(d.get("sources", [])),
        "keywords": ",".join(d.get("keywords", [])),
    } for d in docs]

    col.add(ids=ids, documents=texts, metadatas=metadatas)
    logger.info("Indexé %d documents dans ChromaDB", len(ids))
    return col


# ------------------------------------------------ RAG (recherche locale, fiable)
def search(question: str, k: int = 4):
    """Recherche les docs les plus proches. Retourne [] si rien, jamais d'aléatoire."""
    try:
        col = ensure_collection()
        # Chroma fait l'embedding localement (all-MiniLM par défaut) → aucune clé externe.
        results = col.query(query_texts=[question], n_results=min(k, col.count() or 1))
        ids = results.get("ids", [[]])[0]
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        out = []
        for i, doc_id in enumerate(ids):
            out.append({
                "id": doc_id,
                "content": docs[i] if i < len(docs) else "",
                "metadata": metas[i] if i < len(metas) else {},
            })
        return out
    except Exception as exc:
        logger.warning("RAG search échec: %s", exc)
        return []


# ------------------------------------------------ Garde-fou santé (non négociable)
# On PRIORISE la sécurité MAIS sans bloquer les questions légitimes de coaching.
# Deux catégories :
#  - DANGER/déclencheur fort → redirige vers le pro (symptôme inquiétant, diagnostic).
#  - Sujet courant (diabète, électrolytes, poids) → on répond depuis la base, mais
#    on ajoute la note de prudence.
# Liste ciblée sur le DANGER, pas sur les thèmes de coaching.
DANGER_KEYWORDS = [
    # symptômes/états inquiétants
    "douleur", "douleurs", "poitrine", "essoufflé", "essaoufflee", "souffle",
    "malaise", "évanouir", "vertige", "vertiges", "vomissement", "vomissements",
    "saignement", "fièvre", "fievre", "infection",
    # demandes médicales à risque
    "diagnostic", "traitement", "médicament", "medicament", "ordonnance",
    "contre-indication", "contre indication", "arrêter le régime", "arreter le regime",
    "est-ce grave", "vais-je", "dois-je arrêter", "dois je arreter",
    # santé mentale / urgence
    "angoisse", "phobie", "suicide", "dépressif", "déprimé", "urgence", "danger",
]
# Note de prudence ajoutée aux réponses normales (produit santé)
SAFETY_NOTE = (
    "\n\n⚠️ *Rappel santé* : je suis une app de suivi, pas un médecin. En cas de "
    "doute médical, de diagnostic, ou de signe inquiétant, consulte ton médecin "
    "ou un professionnel de santé."
)

def is_danger(request: str) -> bool:
    """True si la demande évoque un DANGER/symptôme nécessitant un pro.
    False pour les questions de coaching légitimes (diabète, poids, etc.)."""
    r = request.lower()
    return any(kw in r for kw in DANGER_KEYWORDS)


def guardrail(request: str, docs):
    if is_danger(request):
        return {"medical_ref": True, "redirect": True, "docs": docs}
    if not docs:
        return {
            "medical_ref": False, "redirect": False, "docs": [],
            "response": (
                "Ma base de connaissances ne me permet pas de te répondre avec précision. "
                "Reformule, ou consulte ton accompagnateur si c'est important. 💚"
            ),
        }
    return {"medical_ref": False, "redirect": False, "docs": docs}


# ------------------------------------------------ LLM pas cher (OpenRouter)
def ask_llm(question, retrieved):
    """Génère la réponse du coach à partir des documents récupérés (jamais à vide)."""
    openai_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        return fallback_response(question, retrieved)

    # Construire le contexte à partir des docs récupérés seulement.
    contexte = "\n\n".join(
        f"[{d['metadata'].get('title', (d['id'] or ''))}]\n{d['content']}"
        for d in retrieved
    )

    prompt = f"""Tu es un coach bienveillant et précis en accompagnement cétogène.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT à partir du contexte ci-dessous. Si l'info n'y est pas, dis-le et oriente.
- Ne cite JAMAIS de chiffre, étude ou conseil non présent dans le contexte.
- Ton : encourageant, concret, jamais alarmant. Maximum 140 mots.
- Si la question touche un diagnostic ou un traitement, rappelle de consulter un professionnel.

CONTEXTE :
{contexte}

QUESTION : {question}"""

    try:
        from openai import OpenAI
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=openai_key,
        )
        resp = client.chat.completions.create(
            model=RAG_LLM_MODEL,
            messages=[
                {"role": "system", "content": "Tu es un coach précis, honnête, jamais halluciné."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=320,
        )
        content = (resp.choices[0].message.content or "").strip()
        return content if content else fallback_response(question, retrieved)
    except Exception as exc:
        logger.warning("LLM échec: %s", exc)
        return fallback_response(question, retrieved)


def fallback_response(question, retrieved):
    """Réponse sûre sans LLM : on reprend le doc le plus pertinent mot pour mot."""
    if not retrieved:
        return "J'ai besoin de ma base pour te répondre de façon fiable. Tu peux reformuler ?"
    d = retrieved[0]
    src = d["metadata"].get("sources", "")
    return f"Selon {d['metadata'].get('title', 'mes ressources')}: {d['content'][:400]}"