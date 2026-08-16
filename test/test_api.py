"""Tests automatiques du backend KETO 360°.

Ces tests verrouillent le comportement essentiel de l'app pour qu'on puisse
modifier le code sans casser un cas déjà validé.

Lancement (depuis le dossier KetoCoachAI, venv activé) :
    python -m pytest test/ -v
"""
import os
import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Rendre importable le backend racine
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import main  # noqa: E402

client = TestClient(main.app)


# ---------------------------------------------------------------------------
# Fixture : une base de connaissance prête (charge au premier appel si besoin)
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def kb_ready():
    # Simule le lifespan : s'assure que la collection existe
    import coach
    coach.ensure_collection()
    # Petite attente au cas où la création de collection est asynchrone lente
    time.sleep(1)
    yield


# ---------------------------------------------------------------------------
# Santé et routes de base
# ---------------------------------------------------------------------------
def test_health_ok():
    """GET /api/health renvoie le statut ok et une collection non vide."""
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["collection"] > 0


def test_home_sert_le_frontend():
    """GET / sert la page HTML du chat (pas une erreur)."""
    r = client.get("/")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]


def test_chat_sans_message_renvoie_400():
    """POST /api/chat avec message vide → 400 (message requis)."""
    r = client.post("/api/chat", json={"message": "   "})
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# Le cœur : le coach (garde-fou + réponse sourcée)
# ---------------------------------------------------------------------------
def test_chat_question_normale_repond_surces():
    """Une question de coaching normale reçoit une réponse avec des sources."""
    r = client.post(
        "/api/chat",
        json={
            "message": "Je suis fatigué en phase 3, est-ce normal ?",
            "userProfile": {"phase": "J3", "symptoms": ["fatigue"]},
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data.get("response"), str) and data["response"].strip()
    assert data.get("medical_ref") is False, "une question normale ne doit pas être bloquée"
    assert isinstance(data.get("sources"), list) and len(data["sources"]) > 0


def test_chat_question_dangereuse_redirect_pro():
    """Un signe inquiétant (douleur thoracique) → medical_ref True, pas de conseil."""
    r = client.post(
        "/api/chat",
        json={
            "message": "J'ai des douleurs thoraciques et des palpitations depuis hier, c'est grave ?",
            "userProfile": {"phase": "J10", "symptoms": ["douleur thoracique", "palpitations"]},
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("medical_ref") is True, " un signe alarmant doit être bloqué"
    assert data["sources"] == [] or data["sources"] is None


def test_chat_reponse_json_valide():
    """La réponse est un JSON bien formé avec les 5 champs attendus."""
    r = client.post(
        "/api/chat",
        json={"message": "C'est quoi la cétose ?", "userProfile": {}},
    )
    assert r.status_code == 200
    data = r.json()
    for key in ("response", "sources", "medical_ref", "profile", "expertise"):
        assert key in data, f"clé {key} manquante dans la réponse"