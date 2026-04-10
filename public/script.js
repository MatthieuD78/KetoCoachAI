// Navigation tabs
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    });
});

// "Pourquoi ?" expandable blocks
document.querySelectorAll('.btn-why').forEach(btn => {
    btn.addEventListener('click', () => {
        const productId = btn.getAttribute('data-product');
        const explanation = document.getElementById(`explain-${productId}`);
        
        if (explanation.style.display === 'none' || explanation.style.display === '') {
            explanation.style.display = 'block';
            btn.textContent = '📖 Masquer';
        } else {
            explanation.style.display = 'none';
            btn.textContent = '📖 Pourquoi ?';
        }
    });
});

// Chatbot logic with RAG integration
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

// Profil utilisateur (Sophie)
const userProfile = {
    phase: 'J3',
    weight: 79.2,
    goal: 68,
    ketosis: 72,
    symptoms: ['fatigue', 'adaptation']
};

// Fallback responses (si RAG indisponible)
const fallbackResponses = {
    'stagne': "C'est très fréquent entre J3 et J5. Ton corps ajuste sa rétention d'eau. Ne change rien — la perte reprendra dans 48-72h. Continue tes électrolytes !",
    'epuise': "Fatigue = signe classique d'adaptation. Ton cerveau apprend à utiliser les cétones. Ajoute une dose de MCT ce matin et bois de l'eau salée. Ça passe en 24-48h.",
    'crampes': "Crampes = manque de magnésium et potassium. Prends une dose d'électrolytes maintenant. Les crampes disparaîtront dans l'heure.",
    'default': "Merci pour ton message. Ce que tu vis est normal à J3. Continue, tu es sur la bonne voie. Veux-tu que je te donne un conseil spécifique ?"
};

function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    
    if (!isUser) {
        const icon = document.createElement('span');
        icon.className = 'ai-icon';
        icon.textContent = '⚡';
        messageDiv.appendChild(icon);
    }
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;
    messageDiv.appendChild(bubble);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Appel API Gemini 2.5 Lightning RAG pour réponse ultra-rapide
async function getRAGResponse(userMessage) {
    try {
        const response = await fetch('/api/gemini-25-rag', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                userProfile: userProfile
            })
        });

        if (!response.ok) {
            throw new Error('API Gemini 2.5 indisponible');
        }

        const data = await response.json();
        return {
            text: data.response,
            sources: data.sources,
            isRAG: true,
            gemini: data.metadata?.gemini || false,
            responseTime: data.metadata?.responseTime || 0
        };
    } catch (error) {
        console.warn('Gemini 2.5 indisponible, fallback vers réponses statiques:', error);
        return {
            text: getFallbackResponse(userMessage),
            sources: [],
            isRAG: false,
            gemini: false
        };
    }
}

// Fallback vers réponses statiques
function getFallbackResponse(userMessage) {
    const lowerMsg = userMessage.toLowerCase();
    
    if (lowerMsg.includes('stagne') || lowerMsg.includes('plateau')) return fallbackResponses.stagne;
    if (lowerMsg.includes('fatigue') || lowerMsg.includes('épuisé')) return fallbackResponses.epuise;
    if (lowerMsg.includes('crampe') || lowerMsg.includes('nuit')) return fallbackResponses.crampes;
    return fallbackResponses.default;
}

chatSend.addEventListener('click', async () => {
    const message = chatInput.value.trim();
    if (!message) return;
    
    addMessage(message, true);
    chatInput.value = '';
    
    // Indicateur de chargement
    addMessage("🤔 Recherche des meilleures réponses...", false);
    
    try {
        const ragResponse = await getRAGResponse(message);
        
        // Retirer message de chargement
        const loadingMsg = chatMessages.lastElementChild;
        if (loadingMsg && loadingMsg.textContent.includes("Recherche")) {
            chatMessages.removeChild(loadingMsg);
        }
        
        // Ajouter réponse RAG avec sources
        addMessageWithSources(ragResponse.text, ragResponse.sources, ragResponse.isRAG, ragResponse.gemini, ragResponse.responseTime);
    } catch (error) {
        console.error('Erreur chat RAG:', error);
        
        // Retirer message de chargement
        const loadingMsg = chatMessages.lastElementChild;
        if (loadingMsg && loadingMsg.textContent.includes("Recherche")) {
            chatMessages.removeChild(loadingMsg);
        }
        
        addMessage(getFallbackResponse(message), false);
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') chatSend.click();
});

// Ajout message avec sources scientifiques et métadonnées Gemini
function addMessageWithSources(text, sources, isRAG, gemini = false, responseTime = 0) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isRAG ? 'ai-rag' : 'ai'}`;
    
    if (!isRAG) {
        const icon = document.createElement('span');
        icon.className = 'ai-icon';
        icon.textContent = '';
        messageDiv.appendChild(icon);
    } else {
        const icon = document.createElement('span');
        icon.className = `ai-icon ${gemini ? 'gemini' : 'rag'}`;
        icon.textContent = gemini ? '' : '';
        messageDiv.appendChild(icon);
    }
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = text;
    
    // Métadonnées performance
    if (gemini && responseTime > 0) {
        const perfDiv = document.createElement('div');
        perfDiv.className = 'message-performance';
        perfDiv.innerHTML = ` Gemini 2.5 Lightning - ${responseTime}ms`;
        bubble.appendChild(perfDiv);
    }
    
    if (isRAG && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'message-sources';
        sourcesDiv.innerHTML = `
            <div class="sources-label"> Sources scientifiques:</div>
            ${sources.map(src => `<div class="source-item"> ${src.title}</div>`).join('')}
        `;
        bubble.appendChild(sourcesDiv);
    }
    
    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.querySelectorAll('.chat-option').forEach(option => {
    option.addEventListener('click', async () => {
        const responseKey = option.getAttribute('data-response');
        const message = option.textContent;
        
        addMessage(message, true);
        
        // Indicateur de chargement
        addMessage("🤔 Recherche des meilleures réponses...", false);
        
        try {
            const ragResponse = await getRAGResponse(message);
            
            // Retirer message de chargement
            const loadingMsg = chatMessages.lastElementChild;
            if (loadingMsg && loadingMsg.textContent.includes("Recherche")) {
                chatMessages.removeChild(loadingMsg);
            }
            
            addMessageWithSources(ragResponse.text, ragResponse.sources, ragResponse.isRAG, ragResponse.gemini, ragResponse.responseTime);
        } catch (error) {
            console.error('Erreur chat RAG:', error);
            
            // Retirer message de chargement
            const loadingMsg = chatMessages.lastElementChild;
            if (loadingMsg && loadingMsg.textContent.includes("Recherche")) {
                chatMessages.removeChild(loadingMsg);
            }
            
            addMessage(fallbackResponses[responseKey] || fallbackResponses.default, false);
        }
    });
});

// Order buttons (simulation)
document.querySelectorAll('.btn-order').forEach(btn => {
    btn.addEventListener('click', () => {
        alert('🔒 Mode démo. La boutique sera bientôt connectée.\n\nPrix: 79€ le pack complet.\nLivraison J+5.');
    });
});