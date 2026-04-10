// API RAG pour KetoCoachAI - Vercel Serverless Function
const { PineconeClient } = require('@pinecone-database/pinecone');
const { Configuration, OpenAIApi } = require('openai');
const crypto = require('crypto');

// Configuration
const pinecone = new PineconeClient();
const openai = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openaiApi = new OpenAIApi(openai);

// Base de connaissances locale (fallback)
const knowledgeBase = require('../knowledge-base/sample-docs.json');

// Initialisation Pinecone
async function initPinecone() {
  try {
    await pinecone.init({
      environment: process.env.PINECONE_ENVIRONMENT,
      apiKey: process.env.PINECONE_API_KEY,
    });
    return pinecone.Index('keto-coach-index');
  } catch (error) {
    console.warn('Pinecone non disponible, fallback vers base locale');
    return null;
  }
}

// Embedding avec OpenAI
async function getEmbedding(text) {
  try {
    const response = await openaiApi.createEmbedding({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data.data[0].embedding;
  } catch (error) {
    console.warn('Embedding OpenAI échoué, fallback vers simulation');
    // Simulation simple pour développement
    return Array(1536).fill(0).map(() => Math.random() - 0.5);
  }
}

// Recherche vectorielle
async function searchRelevantDocs(query, userProfile, pineconeIndex) {
  if (pineconeIndex) {
    try {
      const queryEmbedding = await getEmbedding(query);
      const results = await pineconeIndex.query({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
        filter: {
          phase: { $in: userProfile.phase || ['J3'] },
          symptoms: { $in: userProfile.symptoms || [] }
        }
      });
      return results.matches;
    } catch (error) {
      console.warn('Recherche Pinecone échouée, fallback local');
    }
  }
  
  // Fallback recherche locale
  return knowledgeBase.documents
    .filter(doc => {
      const queryLower = query.toLowerCase();
      const contentMatch = doc.content.toLowerCase().includes(queryLower) ||
                          doc.title.toLowerCase().includes(queryLower);
      const phaseMatch = !userProfile.phase || doc.phase.includes(userProfile.phase);
      return contentMatch && phaseMatch;
    })
    .slice(0, 5)
    .map(doc => ({
      id: doc.id,
      metadata: doc,
      score: 0.8
    }));
}

// Génération de réponse augmentée
async function generateResponse(query, relevantDocs, userProfile) {
  const context = relevantDocs.map(doc => 
    `Document: ${doc.metadata.title}\n${doc.metadata.content}\nSources: ${doc.metadata.sources.join(', ')}`
  ).join('\n\n');

  const systemPrompt = `Tu es un coach IA expert en régime cétogène avec 15 ans d'expérience clinique.

PROFIL UTILISATEUR:
- Phase: ${userProfile.phase || 'J3'}
- Poids: ${userProfile.weight || '79.2'}kg (objectif: ${userProfile.goal || '68'}kg)
- Cétose: ${userProfile.ketosis || '72'}%
- Symptômes: ${(userProfile.symptoms || []).join(', ')}

CONTEXTE SCIENTIFIQUE:
${context}

RÈGLES DE RÉPONSE:
1. Basé uniquement sur les documents fournis
2. Cite toujours les sources scientifiques
3. Personnalisé au profil utilisateur
4. Actionnable immédiatement
5. Empathique mais professionnel
6. Maximum 150 mots
7. Format: [Conseil] + [Source] + [Action immédiate]`;

  try {
    const response = await openaiApi.createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    return {
      response: response.data.choices[0].message.content,
      sources: relevantDocs.map(doc => ({
        title: doc.metadata.title,
        sources: doc.metadata.sources
      }))
    };
  } catch (error) {
    console.warn('Génération GPT échouée, fallback vers template');
    
    // Fallback template simple
    const bestDoc = relevantDocs[0];
    return {
      response: `D'après ${bestDoc.metadata.title}, ${bestDoc.metadata.content.substring(0, 100)}... Sources: ${bestDoc.metadata.sources.join(', ')}`,
      sources: relevantDocs.map(doc => ({
        title: doc.metadata.title,
        sources: doc.metadata.sources
      }))
    };
  }
}

// API endpoint principal
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { message, userProfile } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message requis' });
    }

    // Profil utilisateur par défaut (Sophie)
    const defaultProfile = {
      phase: 'J3',
      weight: 79.2,
      goal: 68,
      ketosis: 72,
      symptoms: ['fatigue', 'adaptation']
    };

    const profile = { ...defaultProfile, ...userProfile };

    // Initialisation Pinecone
    const pineconeIndex = await initPinecone();

    // Recherche documents pertinents
    const relevantDocs = await searchRelevantDocs(message, profile, pineconeIndex);

    // Génération réponse
    const result = await generateResponse(message, relevantDocs, profile);

    // Cache simple pour éviter doublons
    const responseId = crypto.createHash('md5').update(message + JSON.stringify(profile)).digest('hex');
    
    res.status(200).json({
      id: responseId,
      response: result.response,
      sources: result.sources,
      timestamp: new Date().toISOString(),
      profile: profile
    });

  } catch (error) {
    console.error('Erreur API chat RAG:', error);
    res.status(500).json({ 
      error: 'Erreur interne',
      fallback: "Je suis momentanément indisponible. Consulte un professionnel de santé pour les urgences."
    });
  }
}
