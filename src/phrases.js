/* Frases rápidas para comunicação (curadoria curta e editável). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Phrases = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_LENGTH = 80;
  const MAX_PHRASES = 40;

  const DEFAULT_PHRASES = [
    'Preciso de ajuda.',
    'Um momento, por favor.',
    'Sim.',
    'Não.',
    'Obrigado.',
    'Quero água.',
    'Estou com dor.',
    'Pode repetir?',
    'Não entendi.',
    'Chame alguém, por favor.',
  ];

  function cleanPhrase(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_LENGTH);
  }

  function createPhrases(list) {
    const source = Array.isArray(list) && list.length ? list : DEFAULT_PHRASES;
    const seen = new Set();
    const out = [];
    for (const entry of source) {
      const text = cleanPhrase(entry);
      if (!text) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(text);
      if (out.length >= MAX_PHRASES) break;
    }
    return out;
  }

  function addPhrase(list, value) {
    const text = cleanPhrase(value);
    if (!text) throw new Error('A frase não pode ficar vazia.');
    const current = createPhrases(list);
    if (current.length >= MAX_PHRASES) throw new Error(`Limite de ${MAX_PHRASES} frases.`);
    if (current.some((item) => item.toLowerCase() === text.toLowerCase())) {
      throw new Error('Essa frase já está na lista.');
    }
    return current.concat([text]);
  }

  function removePhrase(list, value) {
    return createPhrases(list).filter((item) => item !== value);
  }

  return { DEFAULT_PHRASES, MAX_LENGTH, MAX_PHRASES, createPhrases, addPhrase, removePhrase, cleanPhrase };
});
