# Guide Complet Pinecone pour KetoCoachAI

## 🎯 Objectif

Transformer vos 8 documents cétogènes en une base de connaissances vectorielle intelligente pour des réponses RAG ultra-précises.

## 📋 Prérequis

1. **Compte Pinecone** : Gratuit sur [pinecone.io](https://pinecone.io)
2. **Compte OpenAI** : API key avec crédits
3. **Node.js installé** : Version 16+

## 🚀 Étape 1 : Configuration

### 1.1 Créer compte Pinecone
```bash
# 1. Inscrivez-vous sur pinecone.io
# 2. Vérifiez votre email
# 3. Créez un projet (nom : keto-coach-ai)
# 4. Notez vos clés API
```

### 1.2 Variables environnement
Créez fichier `.env` à la racine :
```env
OPENAI_API_KEY=sk-your-openai-key-here
PINECONE_API_KEY=your-pinecone-key-here  
PINECONE_ENVIRONMENT=us-west1-gcp-free
```

### 1.3 Installation dépendances
```bash
npm install @pinecone-database/pinecone openai dotenv
```

## 🏗️ Étape 2 : Création Index Pinecone

### 2.1 Qu'est-ce qu'un index ?
- **Index** = Conteneur pour vos vecteurs
- **Dimension** : 1536 (pour OpenAI Ada-002)
- **Métrique** : cosine similarity (0 = différent, 1 = identique)

### 2.2 Architecture technique
```
Index: keto-coach-index
├── Dimension: 1536 (vecteurs OpenAI)
├── Métrique: cosine
├── Pods: 1 (capacité)
└── Vecteurs: 8 documents × 1536 dimensions
```

### 2.3 Lancement automatique
```bash
node scripts/setup-pinecone.js
```

**Ce que fait le script :**
1. ✅ Connexion à Pinecone avec vos clés
2. ✅ Création automatique de l'index
3. ✅ Chargement des 8 documents JSON
4. ✅ Génération embeddings OpenAI
5. ✅ Upload dans Pinecone
6. ✅ Test de recherche sémantique

## 🧠 Étape 3 : Transformation Documents en Vecteurs

### 3.1 Processus d'embedding
```
Document texte → OpenAI API → Vecteur 1536 dimensions
```

**Exemple concret :**
- **Texte** : "Fatigue J3 adaptation cétogène"
- **Embedding** : `[0.0123, -0.0456, 0.0789, ...]` (1536 nombres)
- **Signification** : Position dans l'espace sémantique

### 3.2 Pourquoi 1536 dimensions ?
- **Modèle OpenAI Ada-002** : 1536 dimensions
- **Précision sémantique** : Capture nuances du langage
- **Performance** : Rapide et efficace

### 3.3 Métadonnées stockées
Chaque vecteur contient :
```javascript
{
  id: "keto_adaptation_001",
  values: [0.0123, -0.0456, ...], // 1536 nombres
  metadata: {
    title: "Adaptation métabolique...",
    category: "adaptation",
    phase: ["J1", "J2", "J3"],
    symptoms: ["fatigue", "maux_tete"],
    sources: ["Volek JS et al, 2004"],
    keywords: ["cetose", "adaptation"]
  }
}
```

## 🔍 Étape 4 : Recherche Sémantique

### 4.1 Comment ça marche ?
```
Question utilisateur → Embedding → Recherche similarité → Documents pertinents
```

**Exemple recherche :**
- **Question** : "Je suis épuisé depuis 3 jours"
- **Documents trouvés** : 
  1. Adaptation métabolique (score: 0.92)
  2. Keto flu (score: 0.87)
  3. Électrolytes (score: 0.76)

### 4.2 Avantages vs recherche classique
| Recherche classique | Recherche Pinecone |
|-------------------|-------------------|
| Mot exact "fatigue" | Sens "épuisé", "manque énergie" |
| Binaire (oui/non) | Score de similarité (0-1) |
| Contexte ignoré | Contexte compris |
| Limité au vocabulaire | Compréhension sémantique |

## ⚡ Étape 5 : Intégration API

### 5.1 Dans le chatbot
```javascript
// Question utilisateur
const query = "J'ai des crampes la nuit";

// Embedding question
const queryEmbedding = await openai.createEmbedding({
  model: 'text-embedding-ada-002',
  input: query
});

// Recherche Pinecone
const results = await pineconeIndex.query({
  vector: queryEmbedding.data[0].embedding,
  topK: 3,
  includeMetadata: true
});

// Résultats utilisés pour générer réponse RAG
```

### 5.2 Performance attendue
- **Latence** : <500ms par recherche
- **Précision** : >90% pertinence
- **Scalabilité** : 1000+ requêtes/minute

## 🔧 Étape 6 : Maintenance

### 6.1 Ajouter de nouveaux documents
```bash
# Ajouter au JSON
node scripts/upload-new-docs.js
```

### 6.2 Supprimer/recréer index
```bash
# Si besoin de recommencer
node scripts/setup-pinecone.js delete
node scripts/setup-pinecone.js setup
```

### 6.3 Monitoring
- **Console Pinecone** : Statistiques d'utilisation
- **Coûts OpenAI** : ~$0.0001 per 1K tokens
- **Performance** : Monitoring latence et précision

## 💰 Coûts Estimés

### Pinecone (Free tier)
- **Index** : 1 index gratuit
- **Stockage** : 100MB gratuits (nos 8 docs = ~1MB)
- **Requêtes** : 100K gratuites/mois

### OpenAI Embeddings
- **Prix** : $0.0001 per 1K tokens
- **Nos 8 documents** : ~10K tokens = $0.001
- **Requêtes utilisateur** : ~100 tokens = $0.00001 par recherche

**Total mensuel estimé** : <$5 pour 1000 utilisateurs

## 🎯 Résultat Final

Après setup, votre système RAG pourra :

✅ **Comprendre** : "Je suis fatigué" → documents adaptation  
✅ **Personnaliser** : Profil J3 → documents phase spécifique  
✅ **Citer sources** : Réponses avec références scientifiques  
✅ **Réagir rapidement** : <2 secondes temps de réponse  

## 🆘 Dépannage

### Erreurs communes
1. **"API key invalid"** : Vérifiez fichier .env
2. **"Index already exists"** : Normal, utilisez l'existant
3. **"Rate limit"** : Pause de 2s entre embeddings
4. **"Dimension mismatch"** : Vérifiez 1536 dimensions

### Support
- **Documentation Pinecone** : docs.pinecone.io
- **Documentation OpenAI** : platform.openai.com/docs
- **Code source** : scripts/setup-pinecone.js

---

**Prochaine étape** : Déploiement Vercel avec serverless functions!
