// Test complet de l'intégration Gemini Lightning RAG
require('dotenv').config();
const { GeminiLightningRAG } = require('../api/gemini-rag');

async function testGeminiIntegration() {
    console.log('🧪 Test Gemini Lightning RAG Integration...\n');

    // Vérification configuration
    if (!process.env.GOOGLE_API_KEY) {
        console.error('❌ GOOGLE_API_KEY manquante dans .env');
        console.log('💡 Copiez .env.gemini vers .env et ajoutez votre clé');
        return false;
    }

    console.log('✅ Configuration Gemini OK');

    // Initialisation
    const geminiRAG = new GeminiLightningRAG();

    // Test cases
    const testCases = [
        {
            query: "Je stagne depuis 3 jours",
            userProfile: { phase: 'J3', weight: 79.2, ketosis: 72, symptoms: ['stagnation'] },
            expectedCategory: 'weight_management'
        },
        {
            query: "J'ai des crampes la nuit",
            userProfile: { phase: 'J3', weight: 79.2, ketosis: 72, symptoms: ['crampes'] },
            expectedCategory: 'supplementation'
        },
        {
            query: "Je suis fatiguée tout le temps",
            userProfile: { phase: 'J3', weight: 79.2, ketosis: 72, symptoms: ['fatigue'] },
            expectedCategory: 'adaptation'
        }
    ];

    let passedTests = 0;
    const totalTests = testCases.length;

    for (let i = 0; i < testCases.length; i++) {
        const test = testCases[i];
        console.log(`\n📝 Test ${i + 1}: "${test.query}"`);
        
        try {
            const startTime = Date.now();
            const result = await geminiRAG.processGeminiQuery(test.query, test.userProfile);
            const responseTime = Date.now() - startTime;

            console.log(`⚡ Temps réponse: ${responseTime}ms`);
            console.log(`🤖 Gemini: ${result.gemini ? '✅' : '❌'}`);
            console.log(`💾 Cache: ${result.cached ? '✅' : '❌'}`);
            console.log(`📚 Documents trouvés: ${result.docsFound}`);
            console.log(`📄 Réponse: ${result.response.substring(0, 100)}...`);

            // Validation performance
            if (responseTime < 2000) {
                console.log('⚡ Performance: Lightning ✅');
                passedTests++;
            } else {
                console.log('🐌 Performance: Lent ❌');
            }

            // Validation contenu
            if (result.response && result.response.length > 20) {
                console.log('📝 Contenu: Valide ✅');
            } else {
                console.log('📝 Contenu: Invalide ❌');
            }

        } catch (error) {
            console.error(`❌ Erreur test ${i + 1}:`, error.message);
        }
    }

    // Test cache
    console.log('\n🔄 Test cache (deuxième requête identique)...');
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
            console.log('💾 Cache: Fonctionnel ✅');
            passedTests++;
        } else {
            console.log('💾 Cache: Non fonctionnel ❌');
        }

        if (secondResult.responseTime < firstResult.responseTime) {
            console.log('⚡ Cache performance: Plus rapide ✅');
            passedTests++;
        } else {
            console.log('⚡ Cache performance: Pas plus rapide ❌');
        }

    } catch (error) {
        console.error('❌ Erreur test cache:', error.message);
    }

    // Résultats finaux
    console.log('\n🎯 Résultats Tests Gemini:');
    console.log(`✅ Tests passés: ${passedTests}/${totalTests + 2}`);
    console.log(`📊 Taux succès: ${Math.round((passedTests / (totalTests + 2)) * 100)}%`);

    if (passedTests >= totalTests) {
        console.log('\n🎉 Gemini Lightning RAG est prêt pour la production!');
        console.log('\n📋 Prochaines étapes:');
        console.log('1. Déployer sur Vercel');
        console.log('2. Configurer les variables environnement');
        console.log('3. Tester en production');
        return true;
    } else {
        console.log('\n⚠️ Certains tests ont échoué. Vérifiez la configuration.');
        return false;
    }
}

// Test API endpoint
async function testAPIEndpoint() {
    console.log('\n🌐 Test API endpoint...');
    
    try {
        const response = await fetch('http://localhost:3000/api/gemini-rag', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: "Test API Gemini",
                userProfile: { phase: 'J3', weight: 79.2, ketosis: 72 }
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ API endpoint fonctionnel');
            console.log(`📊 Temps réponse: ${data.metadata.responseTime}ms`);
            console.log(`🤖 API: ${data.metadata.api}`);
            return true;
        } else {
            console.error('❌ API endpoint erreur:', response.status);
            return false;
        }
    } catch (error) {
        console.warn('⚠️ API endpoint non disponible (normal en développement)');
        return false;
    }
}

// Exécution
if (require.main === module) {
    testGeminiIntegration()
        .then((success) => {
            if (success) {
                testAPIEndpoint();
            }
        })
        .catch(console.error);
}

module.exports = { testGeminiIntegration, testAPIEndpoint };
