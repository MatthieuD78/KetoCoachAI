/* ============================================================
   KETO 360° — Coach IA · Les Éditions ÉLAN
   Logique front (chat + API) — vanilla JS, sans dépendance.
   ============================================================ */

(function () {
  'use strict';

  // ---------------------------------------------------------------- refs DOM
  const chat = document.getElementById('chat');
  const suggestionsEl = document.getElementById('suggestions');
  const form = document.getElementById('composerForm');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');

  // ---------------------------------------------------------------- profil
  // Profil utilisateur envoyé au backend avec chaque message.
  const userProfile = {
    phase: 'J3',
    weight: 79.2,
    goal: 68,
    ketosis: 72,
    symptoms: ['fatigue', 'adaptation']
  };

  // ---------------------------------------------------------------- icônes SVG (inline, style unique)
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

  // ---------------------------------------------------------------- rendu markdown-lite (sûr)
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

  // ---------------------------------------------------------------- création de nœuds
  function el(tag, className, innerHTML) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (innerHTML != null) node.innerHTML = innerHTML;
    return node;
  }

  // ---------------------------------------------------------------- messages
  function scrollToBottom() {
    chat.scrollTop = chat.scrollHeight;
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

  // Indicateur "en train d'écrire…"
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

  // ---------------------------------------------------------------- sources
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
        const label = lvl === 'haute' ? 'Haute fiabilité' : lvl === 'faible' ? 'Fiabilité faible' : 'Fiabilité moyenne';
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

  // ---------------------------------------------------------------- prudence santé
  function buildPrudence() {
    const card = el(
      'div',
      'prudence',
      ICONS.shield +
        '<span><strong>Prudence santé.</strong> Je suis une app de suivi, pas un médecin. ' +
        'En cas de doute médical ou de signe inquiétant, consulte ton médecin ou un professionnel de santé.</span>'
    );
    return card;
  }

  // ---------------------------------------------------------------- envoi au backend
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

    // 1) message utilisateur
    addUserMessage(text);
    if (!message) {
      input.value = '';
      input.style.height = 'auto';
    }
    sendBtn.disabled = true;

    // 2) indicateur de frappe
    const typing = addTypingIndicator();

    try {
      const data = await sendToBackend(text);

      removeTypingIndicator();

      // 3) bulle de réponse du coach
      const body = addCoachMessage(el('div', 'bubble', renderText(data.response)));

      // 4) sources éventuelles
      const srcBlock = buildSources(data.sources);
      if (srcBlock) body.appendChild(srcBlock);

      // 5) alerte de prudence si medical_ref
      if (data.medical_ref) {
        body.appendChild(buildPrudence());
      }
    } catch (err) {
      removeTypingIndicator();
      const body = addCoachMessage(
        el('div', 'bubble', "Je n'arrive pas à joindre mon système pour l'instant. Réessaie dans un instant. 💚")
      );
      body.appendChild(buildPrudence());
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // ---------------------------------------------------------------- listeners
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    handleSubmit();
  });

  suggestionsEl.addEventListener('click', function (e) {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    handleSubmit(chip.getAttribute('data-q'));
  });

  // Envoyer avec Entrée (sans shift)
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
})();
