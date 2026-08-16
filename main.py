"""
Serveur API du Coach cétogène (Backend unique).
- /            → sert le frontend (interface chat) s'il existe dans public/
- /api/chat    → POST {message, userProfile?} → réponse fiable du coach (RAG + LLM)
- /api/health  → GET → état (OK)

Lancement simple :  python main.py
"""

import os
from pathlib import Path
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import coach


# ---------------------------------------------------------------- lieu des fichiers
BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"   # frontend statique (index.html, script.js, styles.css)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Charge la base de connaissance au démarrage (créé la collection si besoin).
    try:
        coach.ensure_collection()
        coach.logger.info("Base de connaissance prête.")
    except Exception as exc:
        coach.logger.warning("Base non initialisée au démarrage: %s", exc)
    yield


app = FastAPI(title="Coach Éditions ÉLAN — KETO 360°", version="2.0", lifespan=lifespan)

# CORS ouvert pour développement (à restreindre en prod).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- modèles de requête
class ChatRequest(BaseModel):
    message: str
    userProfile: dict = {}

class ChatProfile(BaseModel):
    phase: str = "J3"
    weight: float = 79.2
    goal: float = 68
    ketosis: float = 72
    symptoms: list = []


@app.get("/", include_in_schema=False)
def home():
    # Sert l'interface chat si elle existe
    idx = PUBLIC_DIR / "index.html"
    if idx.exists():
        return FileResponse(str(idx))
    return {"message": "Coach KETO 360° — backend prêt. Envoie POST /api/chat {message}."}


# Sert les fichiers statiques (styles.css, script.js, assets/) sous /styles.css, /script.js, /assets/...
app.mount("/assets", StaticFiles(directory=str(PUBLIC_DIR / "assets")), name="assets")


@app.get("/styles.css", include_in_schema=False)
def styles():
    return FileResponse(str(PUBLIC_DIR / "styles.css"))


@app.get("/script.js", include_in_schema=False)
def script():
    return FileResponse(str(PUBLIC_DIR / "script.js"))


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    icon = PUBLIC_DIR / "favicon.ico"
    if icon.exists():
        return FileResponse(str(icon))
    return JSONResponse(status_code=204, content={"ok": True})


@app.post("/api/chat")
def chat(req: ChatRequest):
    message = (req.message or "").strip()
    if not message:
        return JSONResponse(status_code=400, content={"error": "message requis"})

    # 1) Recherche de documents pertinents dans la base locale (jamais aléatoire).
    retrieved = coach.search(message, k=5)

    # 2) Garde-fou : si demande médicale → orienter vers le professionnel.
    g = coach.guardrail(message, retrieved)

    # 3) Générer la réponse.
    if g.get("redirect"):
        # Question sensible / médicale → redirection prudente vers le pro.
        return {
            "response": (
                "Je prends ton message au sérieux. Sur une question de santé "
                "(douleur, diagnostic, traitement, signe inquiétant), je préfère "
                "être honnête et prudent : je ne peux pas te conseiller seul. "
                "Consulte ton médecin ou un professionnel de santé. 💚\n\n"
                "Si tu as un doute, note aussi tes symptômes pour en parler à ton "
                "professionnel — c'est le plus fiable."
            ),
            "sources": [],
            "medical_ref": True,
            "redirect": True,
            "profile": req.userProfile or {},
            "expertise": "RAG ÉLAN local + garde-fou santé",
        }

    if not retrieved:
        response = (
            "Ma base ne permet pas de te répondre avec certitude. "
            "Reformule, ou consulte ton accompagnateur si c'est important. 💚"
        )
        sources = []
    else:
        response = coach.ask_llm(message, g["docs"]) or (
            "Ma base ne permet pas de te répondre avec certitude. Reformule ou consulte un pro."
        )
        sources = [{"id": d["id"], "title": d["metadata"].get("titre") or d["metadata"].get("title", ""),
                    "fiabilite": d["metadata"].get("fiabilite", "moyenne"),
                    "pmid": d["metadata"].get("pmid", ""),
                    "journal": d["metadata"].get("journal", "")} for d in g["docs"]]

    return {
        "response": response + coach.SAFETY_NOTE,
        "sources": sources,
        "medical_ref": g.get("medical_ref", False),
        "redirect": g.get("redirect", False),
        "profile": req.userProfile or {},
        "expertise": "RAG ÉLAN local + garde-fou santé",
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "collection": coach.ensure_collection().count()}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)