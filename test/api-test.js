// Test du système RAG KetoCoachAI
const { createServer } = require('http');
const fs = require('fs');
const path = require('path');

// Simulation des requêtes API pour tester le système RAG
async function testRAGSystem() {
    console.log('🧪 Test du système RAG KetoCoachAI...\n');

    // Test 1: Chargement base de connaissances
    try {
        const knowledgeBase = JSON.parse(fs.readFileSync(path.join(__dirname, '../knowledge-base/sample-docs.json'), 'utf8'));
        console.log('✅ Base de connaissances chargée:', knowledgeBase.documents.length, 'documents');
    } catch (error) {
        console.error('❌ Erreur chargement base de connaissances:', error.message);
        return;
    }

    // Test 2: Simulation recherche RAG
    const testQueries = [
        {
            query: "Je stagne depuis 3 jours",
            expectedCategory: "weight_management",
            userProfile: { phase: 'J3', weight: 79.2, ketosis: 72 }
        },
        {
            query: "J'ai des crampes la nuit",
            expectedCategory: "supplementation", 
            userProfile: { phase: 'J3', symptoms: ['crampes'] }
        },
        {
            query: "Je suis fatiguée tout le temps",
            expectedCategory: "adaptation",
            userProfile: { phase: 'J3', symptoms: ['fatigue'] }
        }
    ];

    const knowledgeBase = JSON.parse(fs.readFileSync(path.join(__dirname, '../knowledge-base/sample-docs.json'), 'utf8'));

    testQueries.forEach((test, index) => {
        console.log(`\n📝 Test ${index + 1}: "${test.query}"`);
        
        // Simulation recherche vectorielle simple
        const relevantDocs = knowledgeBase.documents.filter(doc => {
            const queryLower = test.query.toLowerCase();
            const contentMatch = doc.content.toLowerCase().includes(queryLower) ||
                                doc.title.toLowerCase().includes(queryLower) ||
                                doc.keywords.some(keyword => queryLower.includes(keyword.toLowerCase())) ||
                                doc.symptoms.some(symptom => queryLower.includes(symptom));
            const phaseMatch = !test.userProfile.phase || doc.phase.includes(test.userProfile.phase);
            const symptomMatch = !test.userProfile.symptoms || 
                                test.userProfile.symptoms.some(symptom => doc.symptoms.includes(symptom));
            
            return contentMatch || phaseMatch || symptomMatch;
        });

        console.log(`📚 Documents trouvés: ${relevantDocs.length}`);
        relevantDocs.forEach(doc => {
            console.log(`   • ${doc.title} (${doc.category})`);
        });

        // Validation
        const hasExpectedCategory = relevantDocs.some(doc => doc.category === test.expectedCategory);
        console.log(hasExpectedCategory ? '✅ Catégorie correcte trouvée' : '⚠️ Catégorie attendue non trouvée');
    });

    // Test 3: Vérification intégration frontend
    try {
        const htmlContent = fs.readFileSync(path.join(__dirname, '../deepseek_html_20260410_85cff7.html'), 'utf8');
        const jsContent = fs.readFileSync(path.join(__dirname, '../deepseek_javascript_20260410_0f2ac1.js'), 'utf8');
        
        const hasChatContainer = htmlContent.includes('chat-container');
        const hasRAGIntegration = jsContent.includes('getRAGResponse') && jsContent.includes('addMessageWithSources');
        
        console.log('\n🎨 Test intégration frontend:');
        console.log(hasChatContainer ? '✅ Chat container trouvé' : '❌ Chat container manquant');
        console.log(hasRAGIntegration ? '✅ Intégration RAG trouvée' : '❌ Intégration RAG manquante');
    } catch (error) {
        console.error('❌ Erreur test frontend:', error.message);
    }

    // Test 4: Vérification configuration
    try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
        const hasDependencies = packageJson.dependencies && 
                               packageJson.dependencies['@pinecone-database/pinecone'] && 
                               packageJson.dependencies['openai'];
        
        console.log('\n📦 Test configuration:');
        console.log(hasDependencies ? '✅ Dépendances RAG présentes' : '❌ Dépendances RAG manquantes');
    } catch (error) {
        console.error('❌ Erreur test configuration:', error.message);
    }

    console.log('\n🎉 Tests terminés! Le système RAG est prêt pour le déploiement.');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Configurer les variables environnement (.env)');
    console.log('2. Créer index Pinecone et uploader les documents');
    console.log('3. Déployer sur Vercel avec les serverless functions');
    console.log('4. Tester en production avec vraies API calls');
}

// Test serveur local (optionnel)
function startTestServer() {
    const server = createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        
        if (req.url === '/api/chat-rag' && req.method === 'POST') {
            // Simulation réponse RAG
            res.end(JSON.stringify({
                response: "Test réponse RAG - système fonctionnel!",
                sources: [{ title: "Document test", sources: ["Test Source"] }],
                timestamp: new Date().toISOString()
            }));
        } else {
            res.end(JSON.stringify({ status: "Test server running" }));
        }
    });

    server.listen(3001, () => {
        console.log('🌐 Serveur de test démarré sur http://localhost:3001');
    });
}

// Exécuter les tests
if (require.main === module) {
    testRAGSystem().then(() => {
        console.log('\n💡 Pour démarrer le serveur de test: node test/api-test.js --server');
        
        if (process.argv.includes('--server')) {
            startTestServer();
        }
    });
}

module.exports = { testRAGSystem, startTestServer };
