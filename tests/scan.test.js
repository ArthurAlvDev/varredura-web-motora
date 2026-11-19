'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Scan = require('../src/scan.js');

const GROUPS = [
  { id: 'g1', label: 'Um', items: [{ id: 'a', label: 'A', type: 'char', value: 'a' }, { id: 'b', label: 'B', type: 'char', value: 'b' }] },
  { id: 'g2', label: 'Dois', items: [{ id: 'space', label: 'Espaço', type: 'action', action: 'space' }] },
];

test('estado inicial fica no primeiro grupo', () => {
  const state = Scan.initialState();
  assert.equal(state.level, 'grupo');
  assert.equal(state.group, 0);
});

test('avança entre grupos e volta ao início', () => {
  let state = Scan.initialState();
  state = Scan.next(state, GROUPS);
  assert.equal(state.group, 1);
  state = Scan.next(state, GROUPS);
  assert.equal(state.group, 0);
});

test('ativar grupo entra no primeiro item', () => {
  const result = Scan.activate(Scan.initialState(), GROUPS);
  assert.equal(result.state.level, 'item');
  assert.equal(result.state.item, 0);
  assert.equal(result.action, null);
});

test('avança entre itens e volta ao primeiro', () => {
  let state = { level: 'item', group: 0, item: 0 };
  state = Scan.next(state, GROUPS);
  assert.equal(state.item, 1);
  state = Scan.next(state, GROUPS);
  assert.equal(state.item, 0);
});

test('ativar item devolve a ação e volta ao grupo', () => {
  const state = { level: 'item', group: 0, item: 1 };
  const result = Scan.activate(state, GROUPS);
  assert.deepEqual(result.action, { id: 'b', label: 'B', type: 'char', value: 'b' });
  assert.equal(result.state.level, 'grupo');
  assert.equal(result.state.group, 0);
});

test('voltar de item para grupo', () => {
  const state = Scan.back({ level: 'item', group: 1, item: 0 }, GROUPS);
  assert.equal(state.level, 'grupo');
  assert.equal(state.group, 1);
});

test('voltar no grupo retorna ao anterior com volta circular', () => {
  const state = Scan.back({ level: 'grupo', group: 0, item: 0 }, GROUPS);
  assert.equal(state.group, 1);
});

test('item atual descreve o alvo', () => {
  assert.equal(Scan.describe({ level: 'grupo', group: 0, item: 0 }, GROUPS), 'grupo Um');
  assert.equal(Scan.describe({ level: 'item', group: 1, item: 0 }, GROUPS), 'Espaço');
});

test('grupo vazio é pulado ao ativar', () => {
  const groups = [
    { id: 'vazio', label: 'Vazio', items: [] },
    { id: 'ok', label: 'Ok', items: [{ id: 'a', label: 'A', type: 'char', value: 'a' }] },
  ];
  const result = Scan.activate({ level: 'grupo', group: 0, item: 0 }, groups);
  assert.equal(result.state.level, 'grupo');
  assert.equal(result.state.group, 1);
});

test('salto direto para grupo e item', () => {
  const state = Scan.goTo(Scan.initialState(), GROUPS, 'g2');
  assert.equal(state.group, 1);
  const item = Scan.goToItem(Scan.initialState(), GROUPS, 'g1', 'b');
  assert.deepEqual(item, { level: 'item', group: 0, item: 1 });
});

test('salto para alvo inexistente mantém o estado', () => {
  const state = Scan.initialState();
  assert.deepEqual(Scan.goTo(state, GROUPS, 'nada'), state);
  assert.deepEqual(Scan.goToItem(state, GROUPS, 'g1', 'nada'), state);
});

test('lista vazia de grupos não quebra', () => {
  const state = Scan.initialState();
  assert.deepEqual(Scan.next(state, []), Scan.initialState());
  const result = Scan.activate(state, []);
  assert.equal(result.action, null);
});

test('a prancha padrão tem grupos de letras e ações', () => {
  const ids = Scan.DEFAULT_GROUPS.map((g) => g.id);
  assert.ok(ids.includes('a-f'));
  assert.ok(ids.includes('s-z'));
  assert.ok(ids.includes('acoes'));
  const actions = Scan.DEFAULT_GROUPS.find((g) => g.id === 'acoes').items.map((i) => i.action);
  assert.deepEqual(actions, ['space', 'backspace', 'speak', 'clear']);
});

test('todos os itens padrão têm identificador único', () => {
  const ids = Scan.DEFAULT_GROUPS.flatMap((g) => g.items.map((i) => i.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('percorrer tudo com ativações produz letras', () => {
  const written = [];
  let state = Scan.initialState();
  for (let i = 0; i < 6; i += 1) {
    state = Scan.activate(state, GROUPS).state; // entra no grupo 0
    const result = Scan.activate(state, GROUPS);
    state = result.state;
    if (result.action && result.action.type === 'char') written.push(result.action.value);
    state = Scan.next(state, GROUPS); // grupo 1
    state = Scan.next(state, GROUPS); // volta ao grupo 0
  }
  assert.deepEqual(written, ['a', 'a', 'a', 'a', 'a', 'a']);
});
