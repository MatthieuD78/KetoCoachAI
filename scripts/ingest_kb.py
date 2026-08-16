"""
Script d'ingestion de la base de connaissances curatée dans ChromaDB.
Charge tous les context/theme_*.json et indexe chaque fiche (FACTS en français) 
dans la collection ChromaDB locale. Réutilisé après chaque ajout/validation.

Usage :  source .venv/bin/activate && python scripts/ingest_kb.py
"""
import json
from pathlib import Path

import chromadb

BASE_DIR = Path(__file__).resolve().parent.parent
CONTEXT_DIR = BASE_DIR / "context"
CHROMA_DIR = BASE_DIR / "data" / "chroma"
COLLECTION = "elan_keto_kb"

def main():
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    col = client.get_or_create_collection(name=COLLECTION, metadata={"hnsw:space": "cosine"})

    # En cas de ré-ingestion : on vide pour éviter les doublons.
    try:
        col.delete(where={"_theme": {"$ne": ""}})
    except Exception:
        pass

    files = sorted(CONTEXT_DIR.glob("theme_*.json"))
    if not files:
        print("⚠️ Aucun fichier theme_*.json trouvé dans context/")
        return

    ids, docs, metas = [], [], []
    added = 0
    for fp in files:
        data = json.loads(fp.read_text(encoding="utf-8"))
        for theme in data.get("themes", []):
            for f in theme.get("fiches", []):
                # Le texte indexé = fait_fr + résumé (ce que le RAG questionnera)
                text = f"FAIT: {f.get('fait_fr','')}\n"
                if f.get("resume"):
                    text += f"RÉSUMÉ: {f.get('resume','')}"
                if f.get("conseil_clinique"):
                    text += f"\nCONSEIL: {f.get('conseil_clinique','')}"
                if f.get("limites"):
                    text += f"\nLIMITES: {f.get('limites','')}"
                src = f.get("source", {})
                ids.append(f.get("id") or f"{theme['id']}_{added}")
                docs.append(text)
                metas.append({
                    "theme": theme.get("nom", theme.get("id","")),
                    "theme_id": theme.get("id",""),
                    "fiabilite": f.get("fiabilite","moyenne"),
                    "pmid": src.get("pmid",""),
                    "doi": src.get("doi",""),
                    "titre": src.get("titre",""),
                    "journal": src.get("journal",""),
                    "annee": str(src.get("annee","")),
                })
                added += 1

    # Diviser en lots (Chroma limite ~5461/batch)
    BATCH = 400
    for i in range(0, len(ids), BATCH):
        col.add(
            ids=ids[i:i+BATCH],
            documents=docs[i:i+BATCH],
            metadatas=metas[i:i+BATCH],
        )
    print(f"✅ {added} fiches indexées dans ChromaDB ({COLLECTION})")
    print(f"   Collection: {col.count()} documents")

if __name__ == "__main__":
    main()