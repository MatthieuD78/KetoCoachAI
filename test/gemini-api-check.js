// Test pour vérifier l'API key et trouver les bons modèles
const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

async function checkGeminiAPI() {
    console.log('Vérification de l\'API key Gemini...\n');

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('GOOGLE_API_KEY non trouvée dans .env');
        return false;
    }

    console.log('API Key:', apiKey.substring(0, 20) + '...');

    // Test de l'API key avec une requête simple
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const models = JSON.parse(data);
                    console.log('Modèles disponibles:');
                    
                    if (models.models) {
                        models.models.forEach(model => {
                            console.log(`  - ${model.name}: ${model.displayName}`);
                            console.log(`    Méthodes supportées: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
                        });
                    }
                    
                    resolve(true);
                } catch (error) {
                    console.error('Erreur parsing JSON:', error.message);
                    console.log('Réponse brute:', data);
                    resolve(false);
                }
            });
        }).on('error', (error) => {
            console.error('Erreur HTTP:', error.message);
            resolve(false);
        });
    });
}

async function testWithCorrectModel() {
    console.log('\nTest avec modèle correct...\n');

    const apiKey = process.env.GOOGLE_API_KEY;
    const modelName = 'gemini-1.0-pro'; // modèle plus ancien mais stable
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const payload = JSON.stringify({
        contents: [{
            parts: [{
                text: "Conseil pour fatigue J3 régime cétogène (une phrase)"
            }]
        }]
    });

    return new Promise((resolve) => {
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('Status:', res.statusCode);
                console.log('Réponse:', data);
                
                if (res.statusCode === 200) {
                    try {
                        const result = JSON.parse(data);
                        if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
                            console.log('Réponse Gemini:', result.candidates[0].content.parts[0].text);
                            console.log('Test: RÉUSSI');
                            resolve(true);
                        } else {
                            console.log('Test: ÉCHEC - format réponse incorrect');
                            resolve(false);
                        }
                    } catch (error) {
                        console.log('Test: ÉCHEC - parsing error');
                        resolve(false);
                    }
                } else {
                    console.log('Test: ÉCHEC - HTTP', res.statusCode);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Erreur requête:', error.message);
            resolve(false);
        });

        req.write(payload);
        req.end();
    });
}

if (require.main === module) {
    checkGeminiAPI()
        .then((success) => {
            if (success) {
                return testWithCorrectModel();
            }
            return false;
        })
        .then((finalSuccess) => {
            if (finalSuccess) {
                console.log('\nGEMINI EST FONCTIONNEL!');
                console.log('Votre API key fonctionne avec le modèle gemini-1.0-pro');
            } else {
                console.log('\nVérifiez votre API key ou votre accès Gemini');
            }
        })
        .catch(console.error);
}
