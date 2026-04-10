// Test simple de l'API Gemini avec votre vraie clé
const dotenv = require('dotenv');
dotenv.config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
    console.log('Test API Gemini avec votre clé...\n');

    // Vérification clé API
    if (!process.env.GOOGLE_API_KEY) {
        console.error('GOOGLE_API_KEY non trouvée dans .env');
        return false;
    }

    console.log('Clé API trouvée:', process.env.GOOGLE_API_KEY.substring(0, 20) + '...');

    try {
        // Initialisation Gemini
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        console.log('Modèle Gemini initialisé: gemini-1.5-flash');

        // Test simple
        const prompt = "Bonjour, je suis à J3 du régime cétogène et je me sens fatigué. Que me conseillez-vous en une phrase?";
        
        console.log('\nEnvoi de la requête à Gemini...');
        const startTime = Date.now();

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const responseTime = Date.now() - startTime;

        console.log('Réponse Gemini:', text);
        console.log('Temps de réponse:', responseTime + 'ms');

        if (text && text.length > 10) {
            console.log('\nTest API Gemini: RÉUSSI');
            return true;
        } else {
            console.log('\nTest API Gemini: ÉCHEC (réponse vide)');
            return false;
        }

    } catch (error) {
        console.error('Erreur API Gemini:', error.message);
        console.log('\nTest API Gemini: ÉCHEC');
        return false;
    }
}

// Test embeddings
async function testGeminiEmbeddings() {
    console.log('\nTest Embeddings Gemini...');

    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const embeddingModel = genAI.getGenerativeModel({ 
            model: 'text-embedding-004' 
        });

        const text = "fatigue adaptation cétogène J3";
        const result = await embeddingModel.embedContent(text);
        const embedding = result.embedding.values;

        console.log('Embedding généré:', embedding.length, 'dimensions');
        console.log('Premières valeurs:', embedding.slice(0, 5).map(v => v.toFixed(4)));

        if (embedding.length === 768) {
            console.log('Test Embeddings Gemini: RÉUSSI');
            return true;
        } else {
            console.log('Test Embeddings Gemini: ÉCHEC (dimensions incorrectes)');
            return false;
        }

    } catch (error) {
        console.error('Erreur Embeddings Gemini:', error.message);
        console.log('Test Embeddings Gemini: ÉCHEC');
        return false;
    }
}

// Test complet
async function runTests() {
    console.log('=== TESTS COMPLETS GEMINI ===\n');

    const apiTest = await testGeminiAPI();
    const embeddingTest = await testGeminiEmbeddings();

    console.log('\n=== RÉSULTATS ===');
    console.log('API Gemini:', apiTest ? 'RÉUSSI' : 'ÉCHEC');
    console.log('Embeddings:', embeddingTest ? 'RÉUSSI' : 'ÉCHEC');

    if (apiTest && embeddingTest) {
        console.log('\nGEMINI EST PRÊT POUR KETOCOACH AI! ');
        console.log('Votre API key fonctionne parfaitement.');
        console.log('Le système Lightning RAG peut être déployé.');
    } else {
        console.log('\nVérifiez votre configuration ou votre API key.');
    }
}

// Exécution
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testGeminiAPI, testGeminiEmbeddings };
