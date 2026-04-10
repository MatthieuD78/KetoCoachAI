// Test pour trouver les modèles Gemini disponibles
const dotenv = require('dotenv');
dotenv.config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listAvailableModels() {
    console.log('Vérification des modèles Gemini disponibles...\n');

    if (!process.env.GOOGLE_API_KEY) {
        console.error('GOOGLE_API_KEY non trouvée');
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

        // Test avec différents modèles
        const models = [
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'gemini-pro',
            'gemini-pro-vision',
            'text-embedding-004',
            'embedding-001'
        ];

        console.log('Test des modèles disponibles:\n');

        for (const modelName of models) {
            try {
                console.log(`Test modèle: ${modelName}`);
                
                if (modelName.includes('embedding')) {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.embedContent("test");
                    console.log(`  Embedding: ${result.embedding.values.length} dimensions`);
                    console.log(`  Status: RÉUSSI\n`);
                } else {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent("Test");
                    const response = await result.response;
                    console.log(`  Réponse: ${response.text().substring(0, 50)}...`);
                    console.log(`  Status: RÉUSSI\n`);
                }

            } catch (error) {
                console.log(`  Status: ÉCHEC - ${error.message}\n`);
            }
        }

    } catch (error) {
        console.error('Erreur générale:', error.message);
    }
}

// Test simple avec le modèle qui fonctionne
async function testWorkingModel() {
    console.log('Test avec modèle compatible...\n');

    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        
        // Essayer avec gemini-pro (plus ancien mais stable)
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = "Conseil pour fatigue J3 régime cétogène (une phrase)";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        console.log('Réponse Gemini Pro:', response.text());
        console.log('Test Gemini Pro: RÉUSSI');
        
        return true;

    } catch (error) {
        console.error('Erreur Gemini Pro:', error.message);
        return false;
    }
}

if (require.main === module) {
    listAvailableModels()
        .then(() => testWorkingModel())
        .catch(console.error);
}
