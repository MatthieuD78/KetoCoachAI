// Script complet pour setup Pinecone et upload documents
require('dotenv').config();
const { PineconeClient } = require('@pinecone-database/pinecone');
const { Configuration, OpenAIApi } = require('openai');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const openai = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openaiApi = new OpenAIApi(openai);
const pinecone = new PineconeClient();

async function setupPineconeIndex() {
    console.log('🚀 Setup Pinecone pour KetoCoachAI...\n');

    try {
        // 1. Connexion à Pinecone
        console.log('📡 Connexion à Pinecone...');
        await pinecone.init({
            environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp-free',
            apiKey: process.env.PINECONE_API_KEY
        });

        // 2. Création de l'index
        const indexName = 'keto-coach-index';
        console.log(`📁 Création de l'index "${indexName}"...`);

        try {
            await pinecone.createIndex({
                createRequest: {
                    name: indexName,
                    dimension: 1536, // OpenAI Ada-002 dimensions
                    metric: 'cosine',
                    pods: 1,
                    replicas: 1,
                    podType: 'p1.x1'
                }
            });
            console.log('✅ Index créé avec succès');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('ℹ️  Index existe déjà, utilisation de l\'existant');
            } else {
                throw error;
            }
        }

        // 3. Récupération de l'index
        const index = pinecone.Index(indexName);
        console.log('🔗 Index connecté');

        // 4. Chargement des documents
        console.log('\n📚 Chargement des documents cétogènes...');
        const documentsPath = path.join(__dirname, '../knowledge-base/sample-docs.json');
        const documentsData = JSON.parse(await fs.readFile(documentsPath, 'utf8'));
        
        console.log(`📄 ${documentsData.documents.length} documents trouvés`);

        // 5. Génération des embeddings
        console.log('\n🧠 Génération des embeddings (peut prendre 2-3 minutes)...');
        const vectors = [];

        for (let i = 0; i < documentsData.documents.length; i++) {
            const doc = documentsData.documents[i];
            console.log(`   📝 ${i + 1}/${documentsData.documents.length}: ${doc.title.substring(0, 50)}...`);

            try {
                // Embedding du titre + contenu
                const textToEmbed = `${doc.title}\n\n${doc.content}`;
                
                const response = await openaiApi.createEmbedding({
                    model: 'text-embedding-ada-002',
                    input: textToEmbed
                });

                const embedding = response.data.data[0].embedding;

                // Création du vecteur pour Pinecone
                vectors.push({
                    id: doc.id,
                    values: embedding,
                    metadata: {
                        title: doc.title,
                        category: doc.category,
                        phase: doc.phase,
                        symptoms: doc.symptoms,
                        sources: doc.sources,
                        keywords: doc.keywords,
                        content: doc.content.substring(0, 1000) // Premier 1000 chars pour preview
                    }
                });

                // Pause pour éviter rate limiting
                if (i % 5 === 0 && i > 0) {
                    console.log('   ⏸️  Pause 2 secondes (rate limiting)...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                console.error(`❌ Erreur embedding document ${doc.id}:`, error.message);
            }
        }

        console.log(`✅ ${vectors.length} embeddings générés`);

        // 6. Upload dans Pinecone
        console.log('\n⬆️  Upload dans Pinecone...');
        
        // Pinecone limite à 100 vecteurs par appel
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            console.log(`   📦 Upload batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectors.length/batchSize)}`);
            
            await index.upsert({
                upsertRequest: {
                    vectors: batch
                }
            });
        }

        console.log('✅ Upload terminé');

        // 7. Vérification
        console.log('\n🔍 Vérification de l\'index...');
        const stats = await index.describeIndexStats();
        console.log('📊 Statistiques index:', JSON.stringify(stats, null, 2));

        // 8. Test de recherche
        console.log('\n🧪 Test de recherche sémantique...');
        const testQuery = "fatigue et adaptation cétogène";
        
        const queryEmbedding = await openaiApi.createEmbedding({
            model: 'text-embedding-ada-002',
            input: testQuery
        });

        const searchResults = await index.query({
            queryRequest: {
                vector: queryEmbedding.data.data[0].embedding,
                topK: 3,
                includeMetadata: true
            }
        });

        console.log(`🎯 Recherche pour "${testQuery}":`);
        searchResults.matches.forEach((match, index) => {
            console.log(`   ${index + 1}. ${match.metadata.title} (score: ${match.score.toFixed(3)})`);
        });

        console.log('\n🎉 Setup Pinecone terminé avec succès!');
        console.log('\n📋 Récapitulatif:');
        console.log(`   • Index: ${indexName}`);
        console.log(`   • Documents: ${vectors.length}`);
        console.log(`   • Dimensions: 1536`);
        console.log(`   • Métrique: cosine similarity`);
        console.log('\n✅ Prêt pour les requêtes RAG!');

    } catch (error) {
        console.error('❌ Erreur lors du setup Pinecone:', error);
        process.exit(1);
    }
}

// Fonction pour supprimer l'index (si besoin de recommencer)
async function deletePineconeIndex() {
    try {
        await pinecone.init({
            environment: process.env.PINECONE_ENVIRONMENT,
            apiKey: process.env.PINECONE_API_KEY
        });

        console.log('🗑️  Suppression de l\'index keto-coach-index...');
        await pinecone.deleteIndex('keto-coach-index');
        console.log('✅ Index supprimé');
    } catch (error) {
        console.error('❌ Erreur suppression index:', error.message);
    }
}

// Exécution
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'delete') {
        deletePineconeIndex();
    } else if (command === 'setup' || !command) {
        setupPineconeIndex();
    } else {
        console.log('Usage: node setup-pinecone.js [setup|delete]');
    }
}

module.exports = { setupPineconeIndex, deletePineconeIndex };
