/* Preferências e frases salvas no navegador (sem servidor). */
(function (root, factory) {
  const deps = typeof module === 'object' && module.exports ? { phrases: require('./phrases.js') } : { phrases: root.Phrases };
  const api = factory(deps.phrases);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MotorStorage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Phrases) {
  'use strict';

  const KEY = 'varredura-motora:v1';
  const VERSION = 1;

  const DEFAULT_SETTINGS = {
    speedMs: 1500,
    dwellMs: 1200,
    tremorRadius: 16,
    mode: 'auto',
    voiceRate: 0.95,
    sound: true,
  };

  function normalizeSettings(input) {
    const data = input && typeof input === 'object' ? input : {};
    const clamp = (value, min, max, fallback) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    };
    return {
      speedMs: clamp(data.speedMs, 400, 5000, DEFAULT_SETTINGS.speedMs),
      dwellMs: clamp(data.dwellMs, 300, 5000, DEFAULT_SETTINGS.dwellMs),
      tremorRadius: clamp(data.tremorRadius, 0, 80, DEFAULT_SETTINGS.tremorRadius),
      mode: data.mode === 'manual' ? 'manual' : 'auto',
      voiceRate: clamp(data.voiceRate, 0.5, 2, DEFAULT_SETTINGS.voiceRate),
      sound: data.sound === false ? false : true,
    };
  }

  function validate(data) {
    const errors = [];
    if (!data || typeof data !== 'object') return { ok: false, errors: ['Conteúdo inválido.'], settings: normalizeSettings(), phrases: Phrases.createPhrases() };
    if (data.version != null && Number(data.version) !== VERSION) {
      errors.push(`Versão ${data.version} desconhecida; esperada ${VERSION}.`);
    }
    if (data.phrases != null && !Array.isArray(data.phrases)) {
      errors.push('Lista de frases inválida.');
    }
    if (Array.isArray(data.phrases) && data.phrases.length > Phrases.MAX_PHRASES) {
      errors.push(`Lista acima do limite de ${Phrases.MAX_PHRASES} frases.`);
    }
    return {
      ok: errors.length === 0,
      errors,
      settings: normalizeSettings(data.settings),
      phrases: Phrases.createPhrases(data.phrases),
    };
  }

  function createStore(storage) {
    const available = (() => {
      try {
        const probe = '__vm_probe__';
        storage.setItem(probe, '1');
        storage.removeItem(probe);
        return true;
      } catch (_err) {
        return false;
      }
    })();

    return {
      available,
      save(settings, phrases) {
        if (!available) return { ok: false, error: 'Armazenamento indisponível.' };
        try {
          storage.setItem(
            KEY,
            JSON.stringify({ version: VERSION, settings: normalizeSettings(settings), phrases: Phrases.createPhrases(phrases) })
          );
          return { ok: true };
        } catch (_err) {
          return { ok: false, error: 'Não foi possível salvar as preferências.' };
        }
      },
      load() {
        if (!available) return { ok: false, error: 'Armazenamento indisponível.' };
        const raw = storage.getItem(KEY);
        if (!raw) return { ok: false, error: 'Nada salvo ainda.' };
        try {
          const parsed = JSON.parse(raw);
          const checked = validate(parsed);
          if (!checked.ok) return { ok: false, error: checked.errors.join(' ') };
          return { ok: true, settings: checked.settings, phrases: checked.phrases };
        } catch (_err) {
          return { ok: false, error: 'Preferências salvas ilegíveis.' };
        }
      },
      clear() {
        if (!available) return false;
        storage.removeItem(KEY);
        return true;
      },
    };
  }

  function memoryStorage() {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
    };
  }

  return { KEY, VERSION, DEFAULT_SETTINGS, normalizeSettings, validate, createStore, memoryStorage };
});
