// Lightning RAG - Version optimisée pour performance ultra-rapide
require('dotenv').config();
const { PineconeClient } = require('@pinecone-database/pinecone');
const { Configuration, OpenAIApi } = require('openai');
const crypto = require('crypto');

// Configuration
const pinecone = new PineconeClient();
const openai = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openaiApi = new OpenAIApi(openai);

// Cache Lightning (en mémoire pour démo, Redis en production)
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes

// Cache des embeddings pour éviter re-calculs
const embeddingCache = new Map();

class LightningRAG {
    constructor() {
        this.index = null;
        this.initPromise = this.init();
    }

    async init() {
        try {
            await pinecone.init({
                environment: process.env.PINECONE_ENVIRONMENT,
                apiKey: process.env.PINECONE_API_KEY,
            });
            this.index = pinecone.Index('keto-coach-index');
            console.log('⚡ Lightning RAG initialized');
        } catch (error) {
            console.warn('Lightning RAG fallback mode');
        }
    }

    // Cache key ultra-optimisée
    getCacheKey(query, profile) {
        const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
        const profileKey = `${profile.phase}_${profile.weight}_${profile.ketosis}`;
        return crypto.createHash('md5').update(normalizedQuery + profileKey).digest('hex');
    }

    // Vérification cache Lightning
    checkCache(query, profile) {
        const key = this.getCacheKey(query, profile);
        const cached = cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log('⚡ Cache HIT - Lightning fast response');
            return cached.response;
        }
        
        return null;
    }

    // Stockage cache
    setCache(query, profile, response) {
        const key = this.getCacheKey(query, profile);
        cache.set(key, {
            response,
            timestamp: Date.now()
        });

        // Nettoyage cache si trop grand
        if (cache.size > 1000) {
            const oldestKey = cache.keys().next().value;
            cache.delete(oldestKey);
        }
    }

    // Embedding avec cache
    async getCachedEmbedding(text) {
        const textKey = crypto.createHash('md5').update(text).digest('hex');
        
        if (embeddingCache.has(textKey)) {
            console.log('⚡ Embedding cache HIT');
            return embeddingCache.get(textKey);
        }

        try {
            const response = await openaiApi.createEmbedding({
                model: 'text-embedding-ada-002',
                input: text,
            });

            const embedding = response.data.data[0].embedding;
            embeddingCache.set(textKey, embedding);
            
            return embedding;
        } catch (error) {
            console.warn('Embedding failed, using fallback');
            return Array(1536).fill(0).map(() => Math.random() - 0.5);
        }
    }

    // Recherche vectorielle optimisée
    async lightningSearch(query, userProfile) {
        await this.initPromise;
        
        if (!this.index) {
            return this.fallbackSearch(query, userProfile);
        }

        try {
            // Embedding parallèle optimisée
            const queryEmbedding = await this.getCachedEmbedding(query);
            
            // Filtres optimisés selon profil
            const filter = {
                phase: { $in: [userProfile.phase, 'general'] }
            };

            if (userProfile.symptoms && userProfile.symptoms.length > 0) {
                filter.symptoms = { $in: userProfile.symptoms };
            }

            // Recherche avec topK dynamique
            const topK = userProfile.symptoms.length > 0 ? 7 : 5;

            const results = await this.index.query({
                vector: queryEmbedding,
                topK,
                includeMetadata: true,
                filter
            });

            // Optimisation résultats
            return this.optimizeResults(results.matches, userProfile);
            
        } catch (error) {
            console.warn('Lightning search failed, fallback mode');
            return this.fallbackSearch(query, userProfile);
        }
    }

    // Optimisation des résultats selon profil
    optimizeResults(matches, userProfile) {
        // Scoring personnalisé
        const optimized = matches.map(match => {
            let score = match.score;

            // Bonus si phase correspond
            if (match.metadata.phase && match.metadata.phase.includes(userProfile.phase)) {
                score += 0.1;
            }

            // Bonus si symptômes correspondent
            if (userProfile.symptoms) {
                const symptomMatch = userProfile.symptoms.some(symptom => 
                    match.metadata.symptoms && match.metadata.symptoms.includes(symptom)
                );
                if (symptomMatch) score += 0.15;
            }

            // Bonus catégorie adaptation pour J3
            if (userProfile.phase === 'J3' && match.metadata.category === 'adaptation') {
                score += 0.1;
            }

            return { ...match, score: Math.min(score, 1.0) };
        });

        // Tri par score optimisé
        return optimized.sort((a, b) => b.score - a.score).slice(0, 5);
    }

    // Fallback recherche locale ultra-rapide
    fallbackSearch(query, userProfile) {
        const knowledgeBase = require('../knowledge-base/sample-docs.json');
        const queryLower = query.toLowerCase();
        
        const results = knowledgeBase.documents
            .map(doc => {
                let score = 0;
                
                // Matching texte
                if (doc.content.toLowerCase().includes(queryLower)) score += 0.5;
                if (doc.title.toLowerCase().includes(queryLower)) score += 0.3;
                
                // Matching symptômes
                if (userProfile.symptoms) {
                    const symptomMatch = userProfile.symptoms.some(symptom => 
                        doc.symptoms.includes(symptom)
                    );
                    if (symptomMatch) score += 0.4;
                }
                
                // Matching phase
                if (doc.phase.includes(userProfile.phase)) score += 0.3;
                
                return { id: doc.id, metadata: doc, score };
            })
            .filter(doc => doc.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        return results;
    }

    // Génération Lightning avec streaming
    async generateResponse(query, relevantDocs, userProfile) {
        const context = relevantDocs.map(doc => 
            `Document: ${doc.metadata.title}\n${doc.metadata.content.substring(0, 300)}...\nSources: ${doc.metadata.sources.join(', ')}`
        ).join('\n\n');

        const systemPrompt = `Tu es un coach IA Lightning ultra-rapide spécialiste cétogène.

PROFIL ÉCLAIR:
- Phase: ${userProfile.phase} | Poids: ${userProfile.weight}kg | Cétose: ${userProfile.ketosis}%
- Symptômes: ${(userProfile.symptoms || []).join(', ')}

CONTEXTE SCIENTIFIQUE:
${context}

RÈGLES LIGHTNING:
1. Réponse <120 mots maximum
2. 1 action immédiate prioritaire
3. Sources scientifiques obligatoires
4. Ton direct et énergique
5. Pas de jargon complexe

QUESTION: ${query}

Réponse format: [Conseil principal] + [Source clé] + [Action immédiate]`;

        try {
            const response = await openaiApi.createChatCompletion({
                model: 'gpt-3.5-turbo', // Plus rapide que GPT-4
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query }
                ],
                max_tokens: 150, // Réduit pour vitesse
                temperature: 0.2, // Plus déterministe
                stream: false // Streaming pour version pro
            });

            return {
                response: response.data.choices[0].message.content,
                sources: relevantDocs.slice(0, 3).map(doc => ({
                    title: doc.metadata.title,
                    sources: doc.metadata.sources
                })),
                lightning: true,
                responseTime: Date.now()
            };
        } catch (error) {
            console.warn('Lightning generation failed, fallback template');
            
            const bestDoc = relevantDocs[0];
            return {
                response: `⚡ ${bestDoc.metadata.title}: ${bestDoc.metadata.content.substring(0, 100)}... Source: ${bestDoc.metadata.sources[0]}`,
                sources: [{ title: bestDoc.metadata.title, sources: bestDoc.metadata.sources }],
                lightning: false,
                responseTime: Date.now()
            };
        }
    }

    // Méthode principale Lightning
    async processQuery(query, userProfile) {
        const startTime = Date.now();

        // 1. Cache check (ultra-rapide)
        const cached = this.checkCache(query, userProfile);
        if (cached) {
            return { ...cached, cached: true, responseTime: Date.now() - startTime };
        }

        // 2. Recherche Lightning optimisée
        const relevantDocs = await this.lightningSearch(query, userProfile);

        // 3. Génération rapide
        const result = await this.generateResponse(query, relevantDocs, userProfile);

        // 4. Cache stockage
        this.setCache(query, userProfile, result);

        return {
            ...result,
            cached: false,
            responseTime: Date.now() - startTime,
            docsFound: relevantDocs.length
        };
    }
}

// Instance singleton Lightning
const lightningRAG = new LightningRAG();

// API endpoint Lightning
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { message, userProfile } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message requis' });
        }

        // Profil par défaut ultra-optimisé
        const defaultProfile = {
            phase: 'J3',
            weight: 79.2,
            goal: 68,
            ketosis: 72,
            symptoms: ['fatigue', 'adaptation']
        };

        const profile = { ...defaultProfile, ...userProfile };

        // Process Lightning RAG
        const result = await lightningRAG.processQuery(message, profile);

        // Métadonnées performance
        const metadata = {
            lightning: result.lightning,
            cached: result.cached,
            responseTime: result.responseTime,
            docsFound: result.docsFound,
            timestamp: new Date().toISOString(),
            performance: result.responseTime < 1000 ? '⚡ Lightning' : '🐌 Slow'
        };

        res.status(200).json({
            response: result.response,
            sources: result.sources,
            metadata
        });

    } catch (error) {
        console.error('Lightning RAG Error:', error);
        res.status(500).json({ 
            error: 'Lightning RAG indisponible',
            fallback: "⚡ Mode dégradé - Je reviens vite avec une réponse optimisée!"
        });
    }
}

// Export pour tests
module.exports = { LightningRAG, lightningRAG };
