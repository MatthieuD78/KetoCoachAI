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

// Gamification Engine
const gameState = {
    xp: 450,
    level: 4,
    xpToNextLevel: 1000,
    persona: 'explorateur' // Default persona
};

function updateXpUI() {
    const percent = (gameState.xp / gameState.xpToNextLevel) * 100;
    const xpFill = document.querySelector('.xp-fill');
    const xpLabel = document.querySelector('.xp-label');
    
    if (xpFill) xpFill.style.width = `${percent}%`;
    if (xpLabel) xpLabel.textContent = `Niveau ${gameState.level}`;
}

function gainXp(amount) {
    gameState.xp += amount;
    if (gameState.xp >= gameState.xpToNextLevel) {
        gameState.level++;
        gameState.xp = gameState.xp - gameState.xpToNextLevel;
        showLevelUpNotification();
    }
    updateXpUI();
}

function showLevelUpNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--secondary);
        color: var(--bg);
        padding: 10px 20px;
        border-radius: 20px;
        font-weight: 800;
        z-index: 1000;
        box-shadow: 0 0 20px var(--secondary);
        animation: slideUp 0.5s ease forwards;
    `;
    notification.textContent = `🎊 NIVEAU SUPÉRIEUR : ${gameState.level} !`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeIn 0.5s reverse forwards';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// "Pourquoi ?" expandable blocks
document.querySelectorAll('.btn-why').forEach(btn => {
    btn.addEventListener('click', () => {
        const productId = btn.getAttribute('data-product');
        const explanation = document.getElementById(`explain-${productId}`);
        
        if (explanation.style.display === 'none' || explanation.style.display === '') {
            explanation.style.display = 'block';
            btn.textContent = '📖 Masquer';
            gainXp(5); // Gamification hook
        } else {
            explanation.style.display = 'none';
            btn.textContent = '📖 Pourquoi ?';
        }
    });
});

// Profil utilisateur
const userProfile = {
    phase: 'J3',
    weight: 79.2,
    goal: 68,
    ketosis: 72,
    symptoms: ['fatigue', 'adaptation'],
    persona: gameState.persona
};

// Persona-based fallback responses
const fallbackResponses = {
    'explorateur': {
        'stagne': "🔬 Scientifiquement, le plateau de J3 est lié au rééquilibrage du glycogène hépatique. Ton corps apprend à oxyder les acides gras. Curieuse d'en savoir plus sur le cycle de Krebs ?",
        'epuise': "🌿 Ton corps traverse une transition métabolique fascinante. Cette fatigue est le signe que tes mitochondries s'activent. Bois de l'eau riche en magnésium pour accompagner ce voyage.",
        'crampes': "📍 Les crampes sont un signal de tes fibres musculaires demandant des électrolytes. Une dose de potassium maintenant optimisera ta récupération nocturne.",
        'default': "Bonjour aventurière ! Ton métabolisme est en pleine exploration. Que souhaites-tu découvrir aujourd'hui sur ton voyage Keto ?"
    },
    'competiteur': {
        'stagne': "🔥 Ne lâche rien ! Ce plateau est un test de résistance. Ton corps essaie de garder ses réserves, mais tu vas gagner. Double tes efforts sur l'hydratation et reste focus.",
        'epuise': "⚡ C'est la zone rouge. C'est là que les champions se forgent. Prends tes MCT, ton cerveau va redémarrer en mode turbo. La victoire est au bout de la fatigue.",
        'crampes': "⚔️ Tes muscles luttent. Donne-leur les sels minéraux nécessaires pour écraser ces crampes. On ne laisse pas un détail technique ralentir ta progression.",
        'default': "Objectif en vue ! Tu es à 20% de ta cible. Bats ton record de cétose aujourd'hui !"
    }
};

function getFallbackResponse(userMessage) {
    const lowerMsg = userMessage.toLowerCase();
    const responses = fallbackResponses[userProfile.persona] || fallbackResponses.explorateur;
    
    if (lowerMsg.includes('stagne') || lowerMsg.includes('plateau')) return responses.stagne;
    if (lowerMsg.includes('fatigue') || lowerMsg.includes('épuisé')) return responses.epuise;
    if (lowerMsg.includes('crampe') || lowerMsg.includes('nuit')) return responses.crampes;
    return responses.default;
}

// Chatbot logic
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    
    if (!isUser) {
        const icon = document.createElement('span');
        icon.className = 'ai-icon';
        icon.textContent = '🥑';
        messageDiv.appendChild(icon);
    }
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = text; // Permettre HTML pour le style
    messageDiv.appendChild(bubble);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function getRAGResponse(userMessage) {
    try {
        const response = await fetch('/api/gemini-25-rag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage, userProfile })
        });

        if (!response.ok) throw new Error('API indisponible');

        const data = await response.json();
        gainXp(15); // Gamification hook
        return {
            text: data.response,
            sources: data.sources,
            isRAG: true,
            gemini: data.metadata?.gemini || false,
            responseTime: data.metadata?.responseTime || 0
        };
    } catch (error) {
        gainXp(10); // Gain réduit pour fallback
        return {
            text: getFallbackResponse(userMessage),
            sources: [],
            isRAG: false
        };
    }
}

chatSend.addEventListener('click', async () => {
    const message = chatInput.value.trim();
    if (!message) return;
    
    addMessage(message, true);
    chatInput.value = '';
    
    // Indicateur de chargement
    addMessage("🤔 <em>Analyse de ton profil...</em>", false);
    
    try {
        const ragResponse = await getRAGResponse(message);
        const loadingMsg = chatMessages.lastElementChild;
        if (loadingMsg && loadingMsg.innerHTML.includes("Analyse")) loadingMsg.remove();
        
        addMessageWithSources(ragResponse.text, ragResponse.sources, ragResponse.isRAG, ragResponse.gemini, ragResponse.responseTime);
    } catch (error) {
        const loadingMsg = chatMessages.lastElementChild;
        if (loadingMsg && loadingMsg.innerHTML.includes("Analyse")) loadingMsg.remove();
        addMessage(getFallbackResponse(message), false);
    }
});

function addMessageWithSources(text, sources, isRAG, gemini = false, responseTime = 0) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isRAG ? 'ai-rag' : 'ai'}`;
    
    const icon = document.createElement('span');
    icon.className = `ai-icon ${gemini ? 'gemini' : (isRAG ? 'rag' : '')}`;
    icon.textContent = '🥑';
    messageDiv.appendChild(icon);
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = text;
    
    if (gemini && responseTime > 0) {
        const perfDiv = document.createElement('div');
        perfDiv.className = 'message-performance';
        perfDiv.innerHTML = `⚡ Gemini 2.5 Lightning - ${responseTime}ms`;
        bubble.appendChild(perfDiv);
    }
    
    if (isRAG && sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'message-sources';
        sourcesDiv.innerHTML = `
            <div class="sources-label">Sources scientifiques:</div>
            ${sources.map(src => `<div class="source-item">${src.title}</div>`).join('')}
        `;
        bubble.appendChild(sourcesDiv);
    }
    
    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Option buttons
document.querySelectorAll('.chat-option').forEach(option => {
    option.addEventListener('click', () => {
        chatInput.value = option.textContent;
        chatSend.click();
    });
});

// Order buttons
document.querySelectorAll('.btn-order').forEach(btn => {
    btn.addEventListener('click', () => {
        gainXp(50); // Gros gain XP pour simulation d'achat
        alert('🏆 +50 XP ! Ta box est en préparation, les électrolytes arrivent pour sauver ton J3.');
    });
});

// Initialize UI
updateXpUI();