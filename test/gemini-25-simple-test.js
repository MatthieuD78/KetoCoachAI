// Test simple du système Gemini 2.5 Lightning RAG
const dotenv = require('dotenv');
dotenv.config();
const { Gemini25LightningRAG } = require('../api/gemini-25-rag-cjs');

async function testGemini25RAG() {
    console.log('=== TEST GEMINI 2.5 LIGHTNING RAG ===\n');

    if (!process.env.GOOGLE_API_KEY) {
        console.error('GOOGLE_API_KEY non trouvée');
        return false;
    }

    console.log('Clé API Gemini 2.5: OK');

    // Initialisation
    const geminiRAG = new Gemini25LightningRAG();

    // Test simple
    console.log('\nTest simple: "Je suis fatigué J3"');
    
    try {
        const userProfile = {
            phase: 'J3',
            weight: 79.2,
            ketosis: 72,
            symptoms: ['fatigue']
        };

        const result = await geminiRAG.processGeminiQuery("Je suis fatigué J3", userProfile);
        
        console.log(`Temps réponse: ${result.responseTime}ms`);
        console.log(`Gemini: ${result.gemini ? 'Oui' : 'Non'}`);
        console.log(`Cache: ${result.cached ? 'Oui' : 'Non'}`);
        console.log(`Documents: ${result.docsFound}`);
        console.log(`Réponse: ${result.response}`);

        if (result.response && result.response.length > 20) {
            console.log('\nTest: RÉUSSI');
            return true;
        } else {
            console.log('\nTest: ÉCHEC');
            return false;
        }

    } catch (error) {
        console.error('Erreur test:', error.message);
        return false;
    }
}

if (require.main === module) {
    testGemini25RAG().catch(console.error);
}

module.exports = { testGemini25RAG };
