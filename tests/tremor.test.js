'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Tremor = require('../src/tremor.js');

test('distância euclidiana simples', () => {
  assert.equal(Tremor.distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.equal(Tremor.distance({ x: 1, y: 1 }, { x: 1, y: 1 }), 0);
  assert.equal(Tremor.distance(null, { x: 0, y: 0 }), Infinity);
});

test('filtro ignora movimento menor que o raio (tremor)', () => {
  const filter = Tremor.createFilter({ radius: 10 });
  filter.update({ x: 100, y: 100 });
  const result = filter.update({ x: 103, y: 104 });
  assert.equal(result.moved, false);
  assert.equal(result.anchor.x, 100);
});

test('filtro aceita movimento maior que o raio', () => {
  const filter = Tremor.createFilter({ radius: 10 });
  filter.update({ x: 100, y: 100 });
  const result = filter.update({ x: 100, y: 140 });
  assert.equal(result.moved, true);
  assert.equal(result.anchor.y, 140);
});

test('filtro guarda estatísticas de tremor', () => {
  const filter = Tremor.createFilter({ radius: 5 });
  filter.update({ x: 0, y: 0 });
  filter.update({ x: 1, y: 1 });
  filter.update({ x: 2, y: 2 });
  filter.update({ x: 50, y: 50 });
  const stats = filter.stats();
  assert.equal(stats.moves, 4);
  assert.equal(stats.wobbles, 2);
  assert.ok(stats.ignoredRatio > 0);
});

test('filtro reinicia a âncora', () => {
  const filter = Tremor.createFilter({ radius: 10 });
  filter.update({ x: 5, y: 5 });
  filter.reset();
  assert.equal(filter.anchor, null);
});

test('filtro ignora ponto inválido', () => {
  const filter = Tremor.createFilter({ radius: 10 });
  const result = filter.update({ x: 'a', y: null });
  assert.equal(result.stable, true);
  assert.equal(result.anchor, null);
});

test('progresso parcial e pronto', () => {
  assert.equal(Tremor.progress(1000, 1000, 1000).progress, 0);
  assert.equal(Tremor.progress(1000, 1500, 1000).progress, 0.5);
  assert.equal(Tremor.progress(1000, 2000, 1000).ready, true);
  assert.equal(Tremor.progress(1000, 500, 1000).progress, 0);
});

test('tempo zero significa pronto imediatamente', () => {
  const result = Tremor.progress(0, 0, 0);
  assert.equal(result.ready, true);
  assert.equal(result.progress, 1);
});

test('progresso calcula tempo restante', () => {
  assert.equal(Tremor.progress(0, 400, 1000).remaining, 600);
  assert.equal(Tremor.progress(0, 1500, 1000).remaining, 0);
});

test('dwell começa ao entrar no alvo', () => {
  const dwell = Tremor.createDwell({ durationMs: 1000, radius: 10 });
  const result = dwell.update('a', { x: 0, y: 0 }, 0);
  assert.equal(result.state, 'started');
  assert.equal(result.progress, 0);
});

test('dwell fica pronto após o tempo no mesmo alvo', () => {
  const dwell = Tremor.createDwell({ durationMs: 1000, radius: 10 });
  dwell.update('a', { x: 0, y: 0 }, 0);
  dwell.update('a', { x: 1, y: 1 }, 500);
  const result = dwell.update('a', { x: 2, y: 1 }, 1200);
  assert.equal(result.ready, true);
  assert.equal(result.progress, 1);
});

test('mudar de alvo reinicia o dwell', () => {
  const dwell = Tremor.createDwell({ durationMs: 1000, radius: 10 });
  dwell.update('a', { x: 0, y: 0 }, 0);
  dwell.update('a', { x: 0, y: 0 }, 900);
  const result = dwell.update('b', { x: 100, y: 100 }, 950);
  assert.equal(result.state, 'started');
  assert.equal(result.progress, 0);
});

test('dwell limita a duração mínima e máxima', () => {
  assert.equal(Tremor.createDwell({ durationMs: 10 }).duration, 200);
  assert.equal(Tremor.createDwell({ durationMs: 999999 }).duration, 5000);
});

test('dwell pode ser reiniciado', () => {
  const dwell = Tremor.createDwell({ durationMs: 1000 });
  dwell.update('a', { x: 0, y: 0 }, 0);
  dwell.reset();
  assert.equal(dwell.targetId, null);
});

test('clamp limita valores', () => {
  assert.equal(Tremor.clamp(5, 0, 10), 5);
  assert.equal(Tremor.clamp(-3, 0, 10), 0);
  assert.equal(Tremor.clamp(99, 0, 10), 10);
  assert.equal(Tremor.clamp('x', 2, 10), 2);
});
