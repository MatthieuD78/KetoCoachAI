// Lightning RAG avec Google Gemini 2.5 - Version CommonJS
const dotenv = require('dotenv');
dotenv.config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');

// Configuration Gemini 2.5
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Cache Lightning optimisé
const cache = new Map();
const embeddingCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

class Gemini25LightningRAG {
    constructor() {
        this.model = genAI.getGenerativeModel({ 
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' 
        });
        this.embeddingModel = genAI.getGenerativeModel({ 
            model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004' 
        });
        this.initPromise = this.init();
    }

    async init() {
        try {
            console.log('Gemini 2.5 Lightning RAG initialisé');
            return true;
        } catch (error) {
            console.warn('Gemini 2.5 mode fallback');
            return false;
        }
    }

    // Cache key optimisée
    getCacheKey(query, profile) {
        const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
        const profileKey = `${profile.phase}_${profile.weight}_${profile.ketosis}`;
        return crypto.createHash('md5').update(normalizedQuery + profileKey).digest('hex');
    }

    // Vérification cache
    checkCache(query, profile) {
        const key = this.getCacheKey(query, profile);
        const cached = cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log('Cache HIT - Lightning response');
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

        if (cache.size > 1000) {
            const oldestKey = cache.keys().next().value;
            cache.delete(oldestKey);
        }
    }

    // Recherche locale optimisée
    async searchLocal(query, userProfile) {
        const knowledgeBase = require('../knowledge-base/sample-docs.json');
        const queryLower = query.toLowerCase();
        
        const results = knowledgeBase.documents
            .map(doc => {
                let score = 0;
                
                // Matching texte amélioré
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
                
                // Keywords matching
                const keywordMatch = doc.keywords.some(keyword => 
                    queryLower.includes(keyword.toLowerCase())
                );
                if (keywordMatch) score += 0.2;
                
                return { id: doc.id, metadata: doc, score };
            })
            .filter(doc => doc.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        console.log(`Recherche locale: ${results.length} documents trouvés`);
        return results;
    }

    // Génération Gemini 2.5 Lightning
    async generateGeminiResponse(query, relevantDocs, userProfile) {
        const context = relevantDocs.map(doc => 
            `Document: ${doc.metadata.title}\n${doc.metadata.content.substring(0, 300)}...\nSources: ${doc.metadata.sources.join(', ')}`
        ).join('\n\n');

        const prompt = `Tu es un coach IA Gemini 2.5 ultra-rapide spécialiste du régime cétogène.

PROFIL UTILISATEUR:
- Phase: ${userProfile.phase} | Poids: ${userProfile.weight}kg | Cétose: ${userProfile.ketosis}%
- Symptômes: ${(userProfile.symptoms || []).join(', ')}

CONTEXTE SCIENTIFIQUE:
${context}

RÈGLES GEMINI 2.5 LIGHTNING:
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
            console.log(`Gemini 2.5 generation time: ${generationTime}ms`);

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
            console.warn('Gemini 2.5 generation failed, fallback template');
            
            const bestDoc = relevantDocs[0];
            return {
                response: `Conseil KetoCoach: ${bestDoc.metadata.title}. ${bestDoc.metadata.content.substring(0, 100)}... Source: ${bestDoc.metadata.sources[0]}`,
                sources: [{ title: bestDoc.metadata.title, sources: bestDoc.metadata.sources }],
                gemini: false,
                generationTime: 0
            };
        }
    }

    // Méthode principale Gemini 2.5 Lightning
    async processGeminiQuery(query, userProfile) {
        const startTime = Date.now();

        // 1. Cache check ultra-rapide
        const cached = this.checkCache(query, userProfile);
        if (cached) {
            return { ...cached, cached: true, responseTime: Date.now() - startTime };
        }

        // 2. Recherche locale optimisée
        const relevantDocs = await this.searchLocal(query, userProfile);

        // 3. Génération Gemini 2.5 Lightning
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

// Instance singleton Gemini 2.5 Lightning
const gemini25RAG = new Gemini25LightningRAG();

// Export pour tests
module.exports = { Gemini25LightningRAG, gemini25RAG };
