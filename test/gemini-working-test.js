// Test avec les modèles Gemini 2.5 qui fonctionnent
const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

async function testGemini25() {
    console.log('Test avec Gemini 2.5 Flash (modèle disponible)...\n');

    const apiKey = process.env.GOOGLE_API_KEY;
    const modelName = 'gemini-2.5-flash'; // modèle qui fonctionne!
    
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
                
                if (res.statusCode === 200) {
                    try {
                        const result = JSON.parse(data);
                        if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
                            const response = result.candidates[0].content.parts[0].text;
                            console.log('Réponse Gemini 2.5 Flash:', response);
                            console.log('Test: RÉUSSI');
                            resolve(true);
                        } else {
                            console.log('Test: ÉCHEC - format réponse incorrect');
                            console.log('Réponse brute:', data);
                            resolve(false);
                        }
                    } catch (error) {
                        console.log('Test: ÉCHEC - parsing error:', error.message);
                        console.log('Réponse brute:', data);
                        resolve(false);
                    }
                } else {
                    console.log('Test: ÉCHEC - HTTP', res.statusCode);
                    console.log('Réponse:', data);
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

async function testEmbeddings() {
    console.log('\nTest Embeddings Gemini...\n');

    const apiKey = process.env.GOOGLE_API_KEY;
    
    // Chercher un modèle d'embedding disponible
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    
    const payload = JSON.stringify({
        content: {
            parts: [{
                text: "fatigue adaptation cétogène"
            }]
        }
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
                console.log('Embeddings Status:', res.statusCode);
                
                if (res.statusCode === 200) {
                    try {
                        const result = JSON.parse(data);
                        if (result.embedding?.values) {
                            console.log('Embedding généré:', result.embedding.values.length, 'dimensions');
                            console.log('Test Embeddings: RÉUSSI');
                            resolve(true);
                        } else {
                            console.log('Test Embeddings: ÉCHEC - pas de valeurs');
                            resolve(false);
                        }
                    } catch (error) {
                        console.log('Test Embeddings: ÉCHEC - parsing error');
                        resolve(false);
                    }
                } else {
                    console.log('Test Embeddings: ÉCHEC - HTTP', res.statusCode);
                    console.log('Réponse:', data);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Erreur requête embeddings:', error.message);
            resolve(false);
        });

        req.write(payload);
        req.end();
    });
}

if (require.main === module) {
    testGemini25()
        .then((success) => {
            if (success) {
                return testEmbeddings();
            }
            return false;
        })
        .then((finalSuccess) => {
            if (finalSuccess) {
                console.log('\nGEMINI 2.5 EST FONCTIONNEL!');
                console.log('Votre API key fonctionne parfaitement.');
                console.log('Modèles utilisables: gemini-2.5-flash, text-embedding-004');
            } else {
                console.log('\nTest partiellement réussi ou échec.');
            }
        })
        .catch(console.error);
}
