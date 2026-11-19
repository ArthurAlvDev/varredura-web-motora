'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Phrases = require('../src/phrases.js');
const Store = require('../src/store.js');

test('frases padrão são curtas e sem duplicatas', () => {
  const list = Phrases.createPhrases();
  assert.equal(list.length, Phrases.DEFAULT_PHRASES.length);
  assert.equal(new Set(list.map((p) => p.toLowerCase())).size, list.length);
  for (const phrase of list) assert.ok(phrase.length <= Phrases.MAX_LENGTH);
});

test('createPhrases remove vazios e repetidos', () => {
  const list = Phrases.createPhrases(['Oi', '  ', 'oi', 'Tchau', 'Tchau']);
  assert.deepEqual(list, ['Oi', 'Tchau']);
});

test('createPhrases usa o padrão quando a lista está vazia', () => {
  assert.equal(Phrases.createPhrases([]).length, Phrases.DEFAULT_PHRASES.length);
});

test('adicionar frase nova', () => {
  const list = Phrases.addPhrase(['Oi'], 'Bom dia');
  assert.deepEqual(list, ['Oi', 'Bom dia']);
});

test('adicionar frase vazia falha', () => {
  assert.throws(() => Phrases.addPhrase([], '   '), /vazia/);
});

test('adicionar frase repetida falha', () => {
  assert.throws(() => Phrases.addPhrase(['Oi'], 'oi'), /já está/);
});

test('remove frase existente', () => {
  assert.deepEqual(Phrases.removePhrase(['Oi', 'Tchau'], 'Oi'), ['Tchau']);
});

test('limite de frases é respeitado', () => {
  const list = Array.from({ length: Phrases.MAX_PHRASES }, (_, i) => `Frase ${i}`);
  assert.throws(() => Phrases.addPhrase(list, 'Extra'), /Limite/);
});

test('frases longas são cortadas no limite', () => {
  const list = Phrases.createPhrases(['a'.repeat(200)]);
  assert.equal(list[0].length, Phrases.MAX_LENGTH);
});

test('preferências padrão são válidas', () => {
  const settings = Store.normalizeSettings({});
  assert.equal(settings.mode, 'auto');
  assert.equal(settings.speedMs, Store.DEFAULT_SETTINGS.speedMs);
});

test('preferências fora da faixa são corrigidas', () => {
  const settings = Store.normalizeSettings({ speedMs: 10, dwellMs: 999999, tremorRadius: -5, voiceRate: 9 });
  assert.equal(settings.speedMs, 400);
  assert.equal(settings.dwellMs, 5000);
  assert.equal(settings.tremorRadius, 0);
  assert.equal(settings.voiceRate, 2);
});

test('modo inválido cai para automático', () => {
  assert.equal(Store.normalizeSettings({ mode: 'xpto' }).mode, 'auto');
  assert.equal(Store.normalizeSettings({ mode: 'manual' }).mode, 'manual');
});

test('validate aceita dados corretos', () => {
  const result = Store.validate({ version: 1, settings: {}, phrases: ['Oi'] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.phrases, ['Oi']);
});

test('validate recusa versão desconhecida', () => {
  const result = Store.validate({ version: 7, phrases: ['Oi'] });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /desconhecida/);
});

test('validate recusa lista de frases inválida', () => {
  const result = Store.validate({ version: 1, phrases: 'Oi' });
  assert.equal(result.ok, false);
});

test('store salva e carrega preferências e frases', () => {
  const store = Store.createStore(Store.memoryStorage());
  const saved = store.save({ speedMs: 900, mode: 'manual' }, ['Oi']);
  assert.equal(saved.ok, true);
  const loaded = store.load();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.settings.speedMs, 900);
  assert.equal(loaded.settings.mode, 'manual');
  assert.deepEqual(loaded.phrases, ['Oi']);
});

test('store sem dados informa isso', () => {
  const store = Store.createStore(Store.memoryStorage());
  assert.match(store.load().error, /Nada salvo/);
});

test('store detecta armazenamento bloqueado', () => {
  const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  const store = Store.createStore(broken);
  assert.equal(store.available, false);
  assert.equal(store.load().ok, false);
});

test('store trata dados corrompidos', () => {
  const memory = Store.memoryStorage();
  memory.setItem(Store.KEY, 'nope');
  const store = Store.createStore(memory);
  assert.match(store.load().error, /ilegíveis/);
});
