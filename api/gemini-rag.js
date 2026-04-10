// Lightning RAG avec Google Gemini API - 100% Gratuit et Ultra-performant
const dotenv = require('dotenv');
dotenv.config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PineconeClient } = require('@pinecone-database/pinecone');
const crypto = require('crypto');

// Configuration Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const pinecone = new PineconeClient();

// Cache Lightning optimisé pour Gemini
const cache = new Map();
const embeddingCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

class GeminiLightningRAG {
    constructor() {
        this.model = genAI.getGenerativeModel({ 
            model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' 
        });
        this.embeddingModel = genAI.getGenerativeModel({ 
            model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004' 
        });
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
            console.log('⚡ Gemini Lightning RAG initialized');
        } catch (error) {
            console.warn('Gemini RAG fallback mode');
        }
    }

    // Cache key optimisée pour Gemini
    getCacheKey(query, profile) {
        const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
        const profileKey = `${profile.phase}_${profile.weight}_${profile.ketosis}`;
        return crypto.createHash('md5').update(normalizedQuery + profileKey).digest('hex');
    }

    // Vérification cache Gemini
    checkCache(query, profile) {
        const key = this.getCacheKey(query, profile);
        const cached = cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log('⚡ Gemini Cache HIT - Lightning response');
            return cached.response;
        }
        
        return null;
    }

    // Stockage cache Gemini
    setCache(query, profile, response) {
        const key = this.getCacheKey(query, profile);
        cache.set(key, {
            response,
            timestamp: Date.now()
        });

        // Nettoyage cache
        if (cache.size > 1000) {
            const oldestKey = cache.keys().next().value;
            cache.delete(oldestKey);
        }
    }

    // Embeddings Gemini avec cache
    async getGeminiEmbedding(text) {
        const textKey = crypto.createHash('md5').update(text).digest('hex');
        
        if (embeddingCache.has(textKey)) {
            console.log('⚡ Gemini Embedding cache HIT');
            return embeddingCache.get(textKey);
        }

        try {
            const result = await this.embeddingModel.embedContent(text);
            const embedding = result.embedding.values;
            
            embeddingCache.set(textKey, embedding);
            console.log('✅ Gemini embedding generated:', embedding.length, 'dimensions');
            
            return embedding;
        } catch (error) {
            console.warn('Gemini embedding failed, using fallback');
            return Array(768).fill(0).map(() => Math.random() - 0.5); // Gemini embeddings 768 dims
        }
    }

    // Recherche vectorielle Gemini optimisée
    async geminiSearch(query, userProfile) {
        await this.initPromise;
        
        if (!this.index) {
            return this.fallbackSearch(query, userProfile);
        }

        try {
            // Embedding Gemini ultra-rapide
            const queryEmbedding = await this.getGeminiEmbedding(query);
            
            // Filtres optimisés profil
            const filter = {
                phase: { $in: [userProfile.phase, 'general'] }
            };

            if (userProfile.symptoms && userProfile.symptoms.length > 0) {
                filter.symptoms = { $in: userProfile.symptoms };
            }

            // TopK dynamique
            const topK = userProfile.symptoms.length > 0 ? 7 : 5;

            const results = await this.index.query({
                vector: queryEmbedding,
                topK,
                includeMetadata: true,
                filter
            });

            return this.optimizeResults(results.matches, userProfile);
            
        } catch (error) {
            console.warn('Gemini search failed, fallback mode');
            return this.fallbackSearch(query, userProfile);
        }
    }

    // Optimisation résultats pour Gemini
    optimizeResults(matches, userProfile) {
        const optimized = matches.map(match => {
            let score = match.score;

            // Bonus phase matching
            if (match.metadata.phase && match.metadata.phase.includes(userProfile.phase)) {
                score += 0.1;
            }

            // Bonus symptômes
            if (userProfile.symptoms) {
                const symptomMatch = userProfile.symptoms.some(symptom => 
                    match.metadata.symptoms && match.metadata.symptoms.includes(symptom)
                );
                if (symptomMatch) score += 0.15;
            }

            // Bonus J3 adaptation
            if (userProfile.phase === 'J3' && match.metadata.category === 'adaptation') {
                score += 0.1;
            }

            return { ...match, score: Math.min(score, 1.0) };
        });

        return optimized.sort((a, b) => b.score - a.score).slice(0, 5);
    }

    // Fallback recherche locale
    fallbackSearch(query, userProfile) {
        const knowledgeBase = require('../knowledge-base/sample-docs.json');
        const queryLower = query.toLowerCase();
        
        const results = knowledgeBase.documents
            .map(doc => {
                let score = 0;
                
                if (doc.content.toLowerCase().includes(queryLower)) score += 0.5;
                if (doc.title.toLowerCase().includes(queryLower)) score += 0.3;
                
                if (userProfile.symptoms) {
                    const symptomMatch = userProfile.symptoms.some(symptom => 
                        doc.symptoms.includes(symptom)
                    );
                    if (symptomMatch) score += 0.4;
                }
                
                if (doc.phase.includes(userProfile.phase)) score += 0.3;
                
                return { id: doc.id, metadata: doc, score };
            })
            .filter(doc => doc.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        return results;
    }

    // Génération Gemini Lightning
    async generateGeminiResponse(query, relevantDocs, userProfile) {
        const context = relevantDocs.map(doc => 
            `Document: ${doc.metadata.title}\n${doc.metadata.content.substring(0, 300)}...\nSources: ${doc.metadata.sources.join(', ')}`
        ).join('\n\n');

        const prompt = `Tu es un coach IA Gemini ultra-rapide spécialiste du régime cétogène.

PROFIL UTILISATEUR:
- Phase: ${userProfile.phase} | Poids: ${userProfile.weight}kg | Cétose: ${userProfile.ketosis}%
- Symptômes: ${(userProfile.symptoms || []).join(', ')}

CONTEXTE SCIENTIFIQUE:
${context}

RÈGLES GEMINI LIGHTNING:
1. Réponse <120 mots maximum
2. 1 action immédiate prioritaire  
3. Sources scientifiques obligatoires
4. Ton direct et énergique
5. Français naturel et fluide

QUESTION: ${query}

Réponse format: [Conseil principal] + [Source clé] + [Action immédiate]`;

        try {
            const startTime = Date.now();
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const generationTime = Date.now() - startTime;
            console.log(`⚡ Gemini generation time: ${generationTime}ms`);

            return {
                response: text,
                sources: relevantDocs.slice(0, 3).map(doc => ({
                    title: doc.metadata.title,
                    sources: doc.metadata.sources
                })),
                gemini: true,
                generationTime
            };
        } catch (error) {
            console.warn('Gemini generation failed, fallback template');
            
            const bestDoc = relevantDocs[0];
            return {
                response: `⚡ ${bestDoc.metadata.title}: ${bestDoc.metadata.content.substring(0, 100)}... Source: ${bestDoc.metadata.sources[0]}`,
                sources: [{ title: bestDoc.metadata.title, sources: bestDoc.metadata.sources }],
                gemini: false,
                generationTime: 0
            };
        }
    }

    // Méthode principale Gemini Lightning
    async processGeminiQuery(query, userProfile) {
        const startTime = Date.now();

        // 1. Cache check ultra-rapide
        const cached = this.checkCache(query, userProfile);
        if (cached) {
            return { ...cached, cached: true, responseTime: Date.now() - startTime };
        }

        // 2. Recherche Gemini optimisée
        const relevantDocs = await this.geminiSearch(query, userProfile);

        // 3. Génération Gemini Lightning
        const result = await this.generateGeminiResponse(query, relevantDocs, userProfile);

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

// Instance singleton Gemini Lightning
const geminiRAG = new GeminiLightningRAG();

// API endpoint Gemini Lightning
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { message, userProfile } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message requis' });
        }

        // Profil par défaut optimisé
        const defaultProfile = {
            phase: 'J3',
            weight: 79.2,
            goal: 68,
            ketosis: 72,
            symptoms: ['fatigue', 'adaptation']
        };

        const profile = { ...defaultProfile, ...userProfile };

        // Process Gemini Lightning RAG
        const result = await geminiRAG.processGeminiQuery(message, profile);

        // Métadonnées performance Gemini
        const metadata = {
            gemini: result.gemini,
            cached: result.cached,
            responseTime: result.responseTime,
            generationTime: result.generationTime,
            docsFound: result.docsFound,
            timestamp: new Date().toISOString(),
            performance: result.responseTime < 800 ? '⚡ Gemini Lightning' : '🐌 Slow',
            api: 'Google Gemini 1.5 Flash'
        };

        res.status(200).json({
            response: result.response,
            sources: result.sources,
            metadata
        });

    } catch (error) {
        console.error('Gemini Lightning RAG Error:', error);
        res.status(500).json({ 
            error: 'Gemini RAG indisponible',
            fallback: "⚡ Mode dégradé Gemini - Je reviens avec une réponse optimisée!"
        });
    }
}

// Export pour tests
module.exports = { GeminiLightningRAG, geminiRAG };
