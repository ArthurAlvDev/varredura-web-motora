/* Varredura Motora — interface (100% local). */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const store = MotorStorage.createStore(window.localStorage);

  const state = {
    groups: [],
    scan: ScanEngine.initialState(),
    running: false,
    settings: MotorStorage.normalizeSettings({}),
    phrases: Phrases.createPhrases(),
    dwellEnabled: false,
    dwell: null,
    hover: { id: null, point: null },
    scanTimer: null,
    dwellTimer: null,
    audio: null,
  };

  const escapeHTML = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function setStatus(message, kind) {
    const el = $('status');
    el.textContent = message;
    el.dataset.kind = kind || 'info';
  }

  /* ---------- grupos ---------- */

  function buildGroups() {
    const groups = ScanEngine.DEFAULT_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      items: group.items.map((item) => Object.assign({}, item)),
    }));
    const phraseGroup = groups.find((group) => group.id === 'frases');
    if (phraseGroup) {
      phraseGroup.items = state.phrases.map((text, index) => ({
        id: `frase-${index}`,
        label: text,
        type: 'phrase',
        value: text,
      }));
    }
    state.groups = groups;
  }

  function renderStructure() {
    const container = $('groups');
    container.innerHTML = state.groups
      .map(
        (group) => `
        <div class="group" data-group="${escapeHTML(group.id)}">
          <button type="button" class="group-head" data-jump="${escapeHTML(group.id)}">
            <span>${escapeHTML(group.label)}</span>
            <span class="muted small">${group.items.length} ${group.items.length === 1 ? 'item' : 'itens'}</span>
          </button>
          <div class="keys">
            ${group.items
              .map(
                (item) =>
                  `<button type="button" class="key${item.type === 'phrase' ? ' is-phrase' : ''}" data-key="${escapeHTML(item.id)}" data-group="${escapeHTML(group.id)}">${escapeHTML(item.label)}</button>`
              )
              .join('')}
          </div>
        </div>`
      )
      .join('');
  }

  function currentGroupId() {
    const group = state.groups[state.scan.group];
    return group ? group.id : null;
  }

  function currentItemId() {
    const group = state.groups[state.scan.group];
    if (!group) return null;
    const item = group.items[state.scan.item];
    return item ? item.id : null;
  }

  function paint() {
    const activeGroup = state.scan.level === 'grupo' ? currentGroupId() : currentGroupId();
    const activeItem = state.scan.level === 'item' ? currentItemId() : null;

    document.querySelectorAll('.group').forEach((element) => {
      element.classList.toggle('is-active', element.dataset.group === activeGroup);
    });

    document.querySelectorAll('.key').forEach((element) => {
      const isNext = state.scan.level === 'item' && element.dataset.group === activeGroup && element.dataset.key === activeItem;
      element.classList.toggle('is-next', isNext);
    });

    const hint =
      state.scan.level === 'grupo'
        ? 'Grupo destacado. Acione para escolher.'
        : 'Item destacado. Acione para usar.';
    $('scan-now').textContent = `${ScanEngine.describe(state.scan, state.groups)} — ${hint}`;
  }

  /* ---------- texto ---------- */

  function needsCapital(text) {
    return !text.trim() || /[.!?]\s*$/.test(text);
  }

  function insertText(fragment) {
    const output = $('output');
    let text = output.value;
    let piece = String(fragment);

    if (piece === ' ' && (text === '' || text.endsWith(' '))) return;

    if (needsCapital(text)) {
      piece = piece.charAt(0).toUpperCase() + piece.slice(1);
    }

    if (piece !== ' ' && text && !text.endsWith(' ') && !/^[.,!?]/.test(piece)) {
      text += ' ';
    } else if (/^[.,!?]/.test(piece) && text.endsWith(' ')) {
      text = text.slice(0, -1);
    }

    output.value = text + piece;
    output.scrollTop = output.scrollHeight;
  }

  function beep() {
    if (!state.settings.sound) return;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!state.audio) state.audio = new AudioCtor();
      const ctx = state.audio;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 660;
      gain.gain.value = 0.05;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.04);
    } catch (_err) {
      /* som é opcional */
    }
  }

  function applyAction(item) {
    if (!item) return;
    const output = $('output');

    if (item.type === 'char') {
      insertText(item.value);
    } else if (item.type === 'phrase') {
      insertText(item.value);
    } else if (item.type === 'action') {
      if (item.action === 'space') insertText(' ');
      else if (item.action === 'backspace') output.value = output.value.slice(0, -1);
      else if (item.action === 'clear') output.value = '';
      else if (item.action === 'speak') speak();
    }

    beep();
    setStatus(`Usado: ${item.label}.`, 'ok');
  }

  function findItem(keyId) {
    for (const group of state.groups) {
      const item = group.items.find((candidate) => candidate.id === keyId);
      if (item) return item;
    }
    return null;
  }

  /* ---------- varredura ---------- */

  function startScan() {
    state.running = true;
    $('scan-toggle').textContent = '⏸ Pausar varredura';
    restartTimer();

    if (state.settings.mode === 'manual') {
      setStatus('Varredura em modo manual: use Acionar, Espaço ou Enter para avançar.', 'info');
    } else {
      setStatus('Varredura iniciada. Acione quando o grupo certo estiver destacado.', 'ok');
    }
    paint();
  }

  function pauseScan() {
    state.running = false;
    stopTimer();
    $('scan-toggle').textContent = '▶ Iniciar varredura';
    setStatus('Varredura pausada.', 'info');
  }

  function restartTimer() {
    stopTimer();
    if (!state.running || state.settings.mode === 'manual') return;
    state.scanTimer = window.setInterval(() => {
      state.scan = ScanEngine.next(state.scan, state.groups);
      paint();
    }, state.settings.speedMs);
  }

  function stopTimer() {
    if (state.scanTimer) {
      window.clearInterval(state.scanTimer);
      state.scanTimer = null;
    }
  }

  function activate() {
    if (!state.running) {
      startScan();
      return;
    }
    const result = ScanEngine.activate(state.scan, state.groups);
    state.scan = result.state;
    paint();
    if (result.action) {
      applyAction(result.action);
    } else {
      setStatus(`Grupo escolhido. Acione para percorrer ${ScanEngine.describe(state.scan, state.groups)}.`, 'info');
    }
  }

  function back() {
    state.scan = ScanEngine.back(state.scan, state.groups);
    paint();
    setStatus('Etapa anterior.', 'info');
  }

  function resetScan() {
    state.scan = ScanEngine.initialState();
    paint();
    setStatus('Varredura reiniciada do primeiro grupo.', 'info');
  }

  function directActivate(keyId) {
    const item = findItem(keyId);
    if (!item) return;
    const group = state.groups.find((candidate) => candidate.items.some((i) => i.id === keyId));
    if (group) {
      state.scan = ScanEngine.goToItem(state.scan, state.groups, group.id, keyId);
    }
    applyAction(item);
    paint();
  }

  /* ---------- permanência ---------- */

  function setupDwell() {
    state.dwell = Tremor.createDwell({
      durationMs: state.settings.dwellMs,
      radius: state.settings.tremorRadius,
    });
  }

  function startDwellTicker() {
    if (state.dwellTimer) return;
    state.dwellTimer = window.setInterval(() => {
      if (!state.dwellEnabled || !state.hover.id || !state.hover.point || !state.dwell) return;
      const result = state.dwell.update(state.hover.id, state.hover.point, performance.now());
      const element = document.querySelector(`.key[data-key="${cssEscape(state.hover.id)}"]`);
      if (element) {
        element.classList.add('is-dwelling');
        element.style.setProperty('--dwell', `${Math.round(result.progress * 100)}%`);
      }
      if (result.ready) {
        const id = state.hover.id;
        clearDwellPaint();
        state.dwell.reset();
        state.hover = { id: null, point: null };
        directActivate(id);
        setStatus('Acionado por permanência.', 'ok');
      }
    }, 100);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function clearDwellPaint() {
    document.querySelectorAll('.key.is-dwelling').forEach((element) => {
      element.classList.remove('is-dwelling');
      element.style.removeProperty('--dwell');
    });
  }

  /* ---------- voz e cópia ---------- */

  function speak() {
    const text = $('output').value.trim();
    if (!text) {
      setStatus('Escreva algo antes de falar.', 'error');
      return;
    }
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') {
      setStatus('Este navegador não oferece síntese de voz. O texto continua disponível para copiar.', 'error');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = state.settings.voiceRate;
    window.speechSynthesis.speak(utterance);
    setStatus('Falando a mensagem.', 'info');
  }

  async function copyText() {
    const text = $('output').value;
    if (!text.trim()) {
      setStatus('Nada para copiar ainda.', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Texto copiado.', 'ok');
    } catch (_err) {
      setStatus('O navegador bloqueou a cópia. Selecione o texto manualmente.', 'error');
    }
  }

  /* ---------- frases ---------- */

  function renderPhrases() {
    const list = $('phrase-list');
    list.innerHTML = state.phrases
      .map(
        (phrase, index) =>
          `<li><span>${escapeHTML(phrase)}</span><button type="button" data-remove="${index}" aria-label="Remover frase ${escapeHTML(phrase)}">Remover</button></li>`
      )
      .join('');
  }

  function rebuild() {
    buildGroups();
    renderStructure();
    state.scan = ScanEngine.initialState();
    paint();
  }

  function savePreferences() {
    const result = store.save(state.settings, state.phrases);
    if (!result.ok) setStatus(result.error, 'error');
  }

  /* ---------- ligação ---------- */

  function bind() {
    $('scan-toggle').addEventListener('click', () => {
      state.running ? pauseScan() : startScan();
    });

    $('scan-activate').addEventListener('click', activate);

    $('scan-back').addEventListener('click', back);
    $('scan-reset').addEventListener('click', resetScan);

    $('groups').addEventListener('click', (event) => {
      const jump = event.target.closest('[data-jump]');
      if (jump) {
        state.scan = ScanEngine.goTo(state.scan, state.groups, jump.dataset.jump);
        paint();
        setStatus(`Grupo ${jump.textContent.trim()} selecionado. Acione para percorrer os itens.`, 'info');
        return;
      }
      const key = event.target.closest('.key');
      if (key) directActivate(key.dataset.key);
    });

    $('btn-speak').addEventListener('click', speak);
    $('btn-copy').addEventListener('click', copyText);
    $('btn-clear').addEventListener('click', () => {
      if (!$('output').value) return;
      if (!window.confirm('Limpar o texto escrito?')) return;
      $('output').value = '';
      setStatus('Texto limpo.', 'info');
    });

    $('speed').addEventListener('input', (event) => {
      state.settings.speedMs = Number(event.target.value);
      $('speed-out').textContent = `${(state.settings.speedMs / 1000).toFixed(1).replace('.', ',')} s`;
      restartTimer();
      savePreferences();
    });

    $('mode').addEventListener('change', (event) => {
      state.settings.mode = event.target.value === 'manual' ? 'manual' : 'auto';
      restartTimer();
      savePreferences();
      setStatus(
        state.settings.mode === 'manual'
          ? 'Modo manual: a varredura só avança quando você acionar.'
          : 'Modo automático: a varredura avança sozinha.',
        'info'
      );
    });

    $('sound').addEventListener('change', (event) => {
      state.settings.sound = event.target.checked;
      savePreferences();
    });

    $('dwell-enabled').addEventListener('change', (event) => {
      state.dwellEnabled = event.target.checked;
      clearDwellPaint();
      state.dwell.reset();
      state.hover = { id: null, point: null };
      startDwellTicker();
      setStatus(
        state.dwellEnabled
          ? 'Permanência ativada: pare o ponteiro sobre uma tecla para acionar.'
          : 'Permanência desativada.',
        'info'
      );
    });

    $('dwell').addEventListener('input', (event) => {
      state.settings.dwellMs = Number(event.target.value);
      $('dwell-out').textContent = `${(state.settings.dwellMs / 1000).toFixed(1).replace('.', ',')} s`;
      setupDwell();
      savePreferences();
    });

    $('radius').addEventListener('input', (event) => {
      state.settings.tremorRadius = Number(event.target.value);
      $('radius-out').textContent = `${state.settings.tremorRadius} px`;
      setupDwell();
      savePreferences();
    });

    $('groups').addEventListener('pointermove', (event) => {
      if (!state.dwellEnabled) return;
      const key = event.target.closest('.key');
      if (!key) {
        clearDwellPaint();
        state.hover = { id: null, point: null };
        state.dwell.reset();
        return;
      }
      const id = key.dataset.key;
      const point = { x: event.clientX, y: event.clientY };
      state.hover = { id, point };
      state.dwell.update(id, point, performance.now());
    });

    $('groups').addEventListener('pointerleave', () => {
      clearDwellPaint();
      state.hover = { id: null, point: null };
      if (state.dwell) state.dwell.reset();
    });

    $('btn-add-phrase').addEventListener('click', () => {
      const input = $('phrase-input');
      try {
        state.phrases = Phrases.addPhrase(state.phrases, input.value);
        input.value = '';
        renderPhrases();
        rebuild();
        savePreferences();
        setStatus('Frase adicionada ao grupo de frases.', 'ok');
      } catch (err) {
        setStatus(err.message, 'error');
      }
    });

    $('phrase-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        $('btn-add-phrase').click();
      }
    });

    $('phrase-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove]');
      if (!button) return;
      const index = Number(button.dataset.remove);
      const phrase = state.phrases[index];
      state.phrases = Phrases.removePhrase(state.phrases, phrase);
      renderPhrases();
      rebuild();
      savePreferences();
      setStatus('Frase removida.', 'info');
    });

    $('btn-reset-phrases').addEventListener('click', () => {
      if (!window.confirm('Restaurar a lista padrão de frases?')) return;
      state.phrases = Phrases.createPhrases();
      renderPhrases();
      rebuild();
      savePreferences();
      setStatus('Frases padrão restauradas.', 'ok');
    });

    document.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      if (event.key !== ' ' && event.key !== 'Enter' && event.code !== 'Space') return;
      const target = event.target;
      const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
      const isOutput = target && target.id === 'output';
      if (!isOutput && ['button', 'input', 'select', 'textarea', 'a'].includes(tag)) return;
      event.preventDefault();
      activate();
    });
  }

  function applySettingsToInputs() {
    const settings = state.settings;
    $('speed').value = String(settings.speedMs);
    $('speed-out').textContent = `${(settings.speedMs / 1000).toFixed(1).replace('.', ',')} s`;
    $('mode').value = settings.mode;
    $('sound').checked = settings.sound;
    $('dwell').value = String(settings.dwellMs);
    $('dwell-out').textContent = `${(settings.dwellMs / 1000).toFixed(1).replace('.', ',')} s`;
    $('radius').value = String(settings.tremorRadius);
    $('radius-out').textContent = `${settings.tremorRadius} px`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const saved = store.load();
    if (saved.ok) {
      state.settings = saved.settings;
      state.phrases = saved.phrases;
      setStatus('Preferências e frases carregadas deste navegador.', 'ok');
    } else {
      setStatus('Pronto. Inicie a varredura ou toque em uma letra. Nada é enviado para a internet.', 'info');
    }

    applySettingsToInputs();
    setupDwell();
    startDwellTicker();
    renderPhrases();
    rebuild();
    bind();
    paint();
  });
})();
