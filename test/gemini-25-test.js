// Test complet du système Gemini 2.5 Lightning RAG
const dotenv = require('dotenv');
dotenv.config();
const { Gemini25LightningRAG } = require('../api/gemini-25-rag');

async function testGemini25RAG() {
    console.log('=== TEST GEMINI 2.5 LIGHTNING RAG ===\n');

    if (!process.env.GOOGLE_API_KEY) {
        console.error('GOOGLE_API_KEY non trouvée');
        return false;
    }

    console.log('Clé API Gemini 2.5: OK');

    // Initialisation
    const geminiRAG = new Gemini25LightningRAG();

    // Tests
    const testCases = [
        {
            query: "Je stagne depuis 3 jours",
            userProfile: { phase: 'J3', weight: 79.2, ketosis: 72, symptoms: ['stagnation'] }
        },
        {
            query: "J'ai des crampes la nuit",
            userProfile: { phase: 'J3', weight: 79.2, ketosis: 72, symptoms: ['crampes'] }
        },
        {
            query: "Je suis fatiguée tout le temps",
            userProfile: { phase: 'J3', weight: 79.2, ketosis: 72, symptoms: ['fatigue'] }
        }
    ];

    let passedTests = 0;

    for (let i = 0; i < testCases.length; i++) {
        const test = testCases[i];
        console.log(`\nTest ${i + 1}: "${test.query}"`);
        
        try {
            const startTime = Date.now();
            const result = await geminiRAG.processGeminiQuery(test.query, test.userProfile);
            const responseTime = Date.now() - startTime;

            console.log(`Temps réponse: ${responseTime}ms`);
            console.log(`Gemini: ${result.gemini ? 'Oui' : 'Non'}`);
            console.log(`Cache: ${result.cached ? 'Oui' : 'Non'}`);
            console.log(`Documents: ${result.docsFound}`);
            console.log(`Réponse: ${result.response.substring(0, 100)}...`);

            if (responseTime < 3000 && result.response && result.response.length > 20) {
                console.log('Test: RÉUSSI');
                passedTests++;
            } else {
                console.log('Test: ÉCHEC');
            }

        } catch (error) {
            console.error(`Erreur test ${i + 1}:`, error.message);
        }
    }

    // Test cache
    console.log('\nTest cache...');
    try {
        const firstResult = await geminiRAG.processGeminiQuery(
            testCases[0].query, 
            testCases[0].userProfile
        );
        
        const secondResult = await geminiRAG.processGeminiQuery(
            testCases[0].query, 
            testCases[0].userProfile
        );

        if (secondResult.cached) {
            console.log('Cache: RÉUSSI');
            passedTests++;
        } else {
            console.log('Cache: ÉCHEC');
        }
    } catch (error) {
        console.error('Erreur cache test:', error.message);
    }

    // Résultats
    console.log(`\n=== RÉSULTATS ===`);
    console.log(`Tests réussis: ${passedTests}/${testCases.length + 1}`);
    
    if (passedTests >= testCases.length) {
        console.log('GEMINI 2.5 LIGHTNING RAG: PRÊT!');
        return true;
    } else {
        console.log('Certains tests ont échoué');
        return false;
    }
}

if (require.main === module) {
    testGemini25RAG().catch(console.error);
}

module.exports = { testGemini25RAG };
