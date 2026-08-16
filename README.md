# 🦌 Coach Cétogène — Éditions ÉLAN (ED-002)

Un **coach IA** pour accompagner les personnes en régime cétogène. Il répond de façon
**fiable** (jamais d'invention) en s'appuyant sur une **base de connaissances
scientifiques curatée** (études vérifiées sur PubMed).

## 🧱 Comment c'est fait (simple par choix)

```
Ton utilisateur → écran de chat
        ↓
  BACKEND unique (Python)
   ├── Base de connaissance (ChromaDB locale, GRATUIT)
   ├── LLM coach (Qwen pas cher via OpenRouter)
   └── Garde-fou santé (redirige vers le pro si besoin)
        ↓
  Réponse fiable + sources affichées
```

- **RAG** : ChromaDB locale (pas d'abonnement). Les réponses s'appuient sur les fiches.
- **LLM** : Qwen/deppseek pas cher (~0,1-0,4 $/M tokens) au lieu de GPT-4 coûteux.
- **Garde-fou santé** : toute question de diagnostic/traitement/danger → oriente vers un pro.

## 🚀 Lancer l'app (1 commande)

```bash
cd KetoCoachAI
source .venv/bin/activate
python main.py
```

→ Ouvre **http://localhost:8000** (le chat)  
→ Santé : **http://localhost:8000/api/health**

## 📁 Où sont les choses

| Dossier/Fichier | Rôle |
|-----------------|------|
| `main.py` | Le serveur (chat + santé) |
| `coach.py` | Le cerveau : RAG + garde-fou + LLM |
| `context/theme_*.json` | ⭐ **LA base de connaissances curatée** (à enrichir) |
| `scripts/ingest_kb.py` | Ré-indexe les fichiers `context/` dans ChromaDB après ajout |
| `data/chroma/` | La base vectorielle locale (générée) |

## 🛡️ Pourquoi c'est fiable (le garde-fou contre l'hallucination)

1. Le coach répond **UNIQUEMENT** à partir des fiches de `context/` (jamais de sa tête).
2. Chaque fiche a une **source vérifiée** (PMID/DOI) + un niveau de `fiabilite`.
3. Question médicale sensible → le coach **redirige vers un pro** (jamais de conseil hasardeux).
4. Si aucune fiche ne correspond → il le dit, il n'invente pas.

## ➕ Enrichir les connaissances (ta démarche)

Pour toute nouvelle source fiable (vidéo, lien, doc) :
1. Ajoute/modifie un fichier `context/theme_X.json` (même format qu'un fichier existant).
2. Relance : `python scripts/ingest_kb.py`
3. C'est indexé et utilisé aussitôt. ✅

> ⚠️ On n'ajoute que des faits **vérifiés** (source réelle). Si une vidéo « challenge » une
> fiche, on compare, et on met à jour la fiche avec la nouvelle source. C'est ça la véracité.