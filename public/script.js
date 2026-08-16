/* ============================================================
   KETO 360° — Coach IA · Les Éditions ÉLAN
   Logique front complète (vanilla JS, sans dépendance)
   - Navigation par onglets
   - Gamification (XP / niveau)
   - Courbe de poids + enregistrement
   - Cartes compléments ("Pourquoi ?" dépliables)
   - Chat RAG premium (POST /api/chat)
   ============================================================ */

(function () {
  'use strict';

  // ---------------------------------------------------------------- profil
  const userProfile = {
    phase: 'J3',
    weight: 79.2,
    goal: 68,
    ketosis: 72,
    symptoms: ['fatigue', 'adaptation']
  };

  // ---------------------------------------------------------------- icônes SVG (style unique, traits lucide)
  const ICONS = {
    coach:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
    sources:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
    shield:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
    external:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>'
  };

  // ---------------------------------------------------------------- helpers DOM
  function el(tag, className, innerHTML) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (innerHTML != null) node.innerHTML = innerHTML;
    return node;
  }

  function renderText(text) {
    if (!text) return '';
    let html = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  // ================================================================
  // 1. Navigation par onglets
  // ================================================================
  const navBtns = document.querySelectorAll('.nav-btn');
  const panels = document.querySelectorAll('.tab-panel');

  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const tabId = btn.getAttribute('data-tab');

      navBtns.forEach(function (b) {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      panels.forEach(function (p) {
        const active = p.id === tabId;
        p.classList.toggle('active', active);
        p.hidden = !active;
      });
    });
  });

  // ================================================================
  // 2. Gamification (XP / niveau)
  // ================================================================
  const gameState = {
    xp: 450,
    level: 4,
    xpToNextLevel: 1000
  };

  function updateXpUI() {
    const percent = Math.min(100, (gameState.xp / gameState.xpToNextLevel) * 100);
    const fill = document.querySelector('.xp-fill');
    const level = document.querySelector('.xp-level');
    const count = document.querySelector('.xp-count');
    if (fill) fill.style.width = percent + '%';
    if (level) level.textContent = 'Niv ' + gameState.level;
    if (count) count.textContent = gameState.xp + ' XP';
  }

  function gainXp(amount) {
    gameState.xp += amount;
    if (gameState.xp >= gameState.xpToNextLevel) {
      gameState.xp -= gameState.xpToNextLevel;
      gameState.level += 1;
      showLevelUp();
    }
    updateXpUI();
  }

  function showLevelUp() {
    const note = el('div', 'levelup', '\u{1F389} NIVEAU SUP\u00c9RIEUR : ' + gameState.level + ' !');
    document.body.appendChild(note);
    setTimeout(function () { note.remove(); }, 2600);
  }

  // ================================================================
  // 3. Courbe de poids + enregistrement
  // ================================================================
  const START_WEIGHT = 82;
  const GOAL_WEIGHT = 68;
  const chartEl = document.getElementById('weightChart');

  const weightData = [
    { date: '31/03', weight: 82 },
    { date: '01/04', weight: 81.2 },
    { date: '02/04', weight: 80.5 },
    { date: '03/04', weight: 79.2 }
  ];

  function renderChart() {
    if (!chartEl) return;
    chartEl.innerHTML = '';

    const lastIdx = weightData.length - 1;

    weightData.forEach(function (entry, i) {
      // hauteur relative entre l'objectif (0) et le départ (100)
      const ratio = Math.max(0, (entry.weight - GOAL_WEIGHT) / (START_WEIGHT - GOAL_WEIGHT));
      const height = Math.round(ratio * 100);

      const item = el('div', 'bar-item');
      item.appendChild(el('span', 'bar-value', entry.weight.toFixed(1)));

      const bar = el('div', 'bar' + (i === lastIdx ? ' is-last' : ''));
      bar.style.height = height + '%';
      item.appendChild(bar);

      item.appendChild(el('span', 'bar-label', entry.date));
      chartEl.appendChild(item);
    });
  }

  function updateProgress() {
    const current = weightData[weightData.length - 1].weight;
    const lost = START_WEIGHT - current;
    const percent = Math.round((lost / (START_WEIGHT - GOAL_WEIGHT)) * 100);

    const fill = document.querySelector('.progress-fill');
    if (fill) fill.style.width = percent + '%';

    const track = document.querySelector('.progress-track');
    if (track) track.setAttribute('aria-valuenow', String(percent));

    const foot = document.querySelector('.progress-foot');
    if (foot) {
      foot.innerHTML =
        '<span>Objectif <strong>' + GOAL_WEIGHT + ' kg</strong></span>' +
        '<span><strong>' + lost.toFixed(1) + ' kg</strong> d\u00e9j\u00e0 perdus · reste <strong>' +
        (current - GOAL_WEIGHT).toFixed(1) + ' kg</strong></span>';
    }
  }

  function showToast(message) {
    const toast = document.getElementById('weightToast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.hidden = true; }, 3000);
  }

  const recordBtn = document.getElementById('recordWeightBtn');
  const weightEntry = document.getElementById('weightEntry');
  const weightInput = document.getElementById('weightInput');
  const weightConfirm = document.getElementById('weightConfirm');
  const weightCancel = document.getElementById('weightCancel');

  if (recordBtn && weightEntry) {
    recordBtn.addEventListener('click', function () {
      weightEntry.hidden = !weightEntry.hidden;
      if (!weightEntry.hidden) weightInput.focus();
    });
  }

  function submitWeight() {
    const value = parseFloat(weightInput.value.replace(',', '.'));
    if (!value || isNaN(value) || value <= 0) {
      weightInput.focus();
      return;
    }
    const today = new Date();
    const label = String(today.getDate()).padStart(2, '0') + '/' + String(today.getMonth() + 1).padStart(2, '0');

    weightData.push({ date: label, weight: value });
    userProfile.weight = value;
    renderChart();
    updateProgress();

    weightInput.value = '';
    weightEntry.hidden = true;
    gainXp(10);
    showToast('\u2705 Poids enregistr\u00e9 · +10 XP');
  }

  if (weightConfirm) {
    weightConfirm.addEventListener('click', submitWeight);
    weightInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submitWeight(); }
    });
  }
  if (weightCancel) {
    weightCancel.addEventListener('click', function () { weightEntry.hidden = true; });
  }

  // ================================================================
  // 4. Cartes compléments — "Pourquoi ?" dépliable
  // ================================================================
  document.querySelectorAll('.btn-why').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const productId = btn.getAttribute('data-product');
      const explanation = document.getElementById('explain-' + productId);
      if (!explanation) return;

      const opening = explanation.hidden;
      explanation.hidden = !opening;
      btn.textContent = opening ? 'Masquer' : 'Pourquoi\u00a0?';
      btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
      if (opening) gainXp(5);
    });
  });

  // Boutons de commande
  document.querySelectorAll('.btn-order').forEach(function (btn) {
    btn.addEventListener('click', function () {
      gainXp(50);
      btn.textContent = '\u2713 Box en pr\u00e9paration';
      btn.disabled = true;
      setTimeout(function () {
        btn.textContent = 'Commander maintenant';
        btn.disabled = false;
      }, 2200);
    });
  });

  // ================================================================
  // 5. Chat RAG premium (POST /api/chat)
  // ================================================================
  const chat = document.getElementById('chat');
  const suggestionsEl = document.getElementById('suggestions');
  const form = document.getElementById('composerForm');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');

  function scrollToBottom() {
    if (chat) chat.scrollTop = chat.scrollHeight;
  }

  function addUserMessage(text) {
    const msg = el('div', 'msg msg--user');
    msg.appendChild(el('div', 'bubble', renderText(text)));
    chat.appendChild(msg);
    scrollToBottom();
  }

  function addCoachMessage(htmlBody) {
    const msg = el('div', 'msg msg--coach');
    const avatar = el('div', 'msg-avatar', ICONS.coach);
    avatar.setAttribute('aria-hidden', 'true');
    const body = el('div', 'msg-body');
    body.appendChild(htmlBody);
    msg.appendChild(avatar);
    msg.appendChild(body);
    chat.appendChild(msg);
    scrollToBottom();
    return body;
  }

  function addTypingIndicator() {
    const msg = el('div', 'msg msg--coach typing-msg');
    const avatar = el('div', 'msg-avatar', ICONS.coach);
    avatar.setAttribute('aria-hidden', 'true');
    const body = el('div', 'msg-body');
    body.appendChild(el('div', 'bubble typing', '<span></span><span></span><span></span>'));
    msg.appendChild(avatar);
    msg.appendChild(body);
    chat.appendChild(msg);
    scrollToBottom();
    return msg;
  }

  function removeTypingIndicator() {
    const t = chat.querySelector('.typing-msg');
    if (t) t.remove();
  }

  function buildSources(sources) {
    if (!sources || !sources.length) return null;

    const wrap = el('div', 'sources');
    wrap.appendChild(el('div', 'sources-label', ICONS.sources + ' Sources scientifiques'));

    sources.forEach(function (src) {
      const item = el('div', 'source-item');

      const title = el('span', 'source-title');
      title.textContent = src.title || 'Source';
      item.appendChild(title);

      const meta = el('div', 'source-meta');

      if (src.journal) {
        meta.appendChild(el('span', 'source-journal', src.journal));
      }

      if (src.fiabilite) {
        const lvl = String(src.fiabilite).toLowerCase();
        const label = lvl === 'haute' ? 'Haute fiabilit\u00e9' : lvl === 'faible' ? 'Fiabilit\u00e9 faible' : 'Fiabilit\u00e9 moyenne';
        meta.appendChild(el('span', 'fiabilite fiabilite--' + lvl, label));
      }

      if (src.pmid) {
        const link = el('a', 'source-pmid', 'PMID ' + src.pmid + ' ' + ICONS.external);
        link.href = 'https://pubmed.ncbi.nlm.nih.gov/' + src.pmid + '/';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        meta.appendChild(link);
      }

      item.appendChild(meta);
      wrap.appendChild(item);
    });

    return wrap;
  }

  function buildPrudence() {
    return el(
      'div',
      'prudence',
      ICONS.shield +
        '<span><strong>Prudence sant\u00e9.</strong> Je suis une app de suivi, pas un m\u00e9decin. ' +
        'En cas de doute m\u00e9dical ou de signe inqui\u00e9tant, consulte ton m\u00e9decin ou un professionnel de sant\u00e9.</span>'
    );
  }

  async function sendToBackend(message) {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, userProfile: userProfile })
    });

    if (!resp.ok) {
      throw new Error('API indisponible (HTTP ' + resp.status + ')');
    }
    return resp.json();
  }

  async function handleSubmit(message) {
    const text = (message || input.value).trim();
    if (!text) return;

    addUserMessage(text);
    if (!message) {
      input.value = '';
      input.style.height = 'auto';
    }
    sendBtn.disabled = true;

    const typing = addTypingIndicator();

    try {
      const data = await sendToBackend(text);

      removeTypingIndicator();
      gainXp(15);

      const body = addCoachMessage(el('div', 'bubble', renderText(data.response)));

      const srcBlock = buildSources(data.sources);
      if (srcBlock) body.appendChild(srcBlock);

      if (data.medical_ref) {
        body.appendChild(buildPrudence());
      }
    } catch (err) {
      removeTypingIndicator();
      const body = addCoachMessage(
        el('div', 'bubble', "Je n'arrive pas \u00e0 joindre mon syst\u00e8me pour l'instant. R\u00e9essaie dans un instant. \ud83d\udc9a")
      );
      body.appendChild(buildPrudence());
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleSubmit();
    });
  }

  if (suggestionsEl) {
    suggestionsEl.addEventListener('click', function (e) {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      handleSubmit(chip.getAttribute('data-q'));
    });
  }

  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
  }

  // ---------------------------------------------------------------- init
  renderChart();
  updateProgress();
  updateXpUI();
})();
