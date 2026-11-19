'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');

test('declara idioma, título e descrição', () => {
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /<title>[^<]*Varredura Motora/);
  assert.match(html, /name="description"/);
});

test('tem estrutura semântica com um único h1 e link de salto', () => {
  assert.match(html, /class="skip-link" href="#main"/);
  assert.match(html, /<main id="main">/);
  assert.equal((html.match(/<h1/g) || []).length, 1);
});

test('todas as referências locais existem', () => {
  const refs = [...html.matchAll(/(?:href|src)="([^"#]+)"/g)]
    .map((m) => m[1])
    .filter((r) => !/^https?:|^data:/.test(r));
  assert.ok(refs.length >= 5);
  for (const ref of refs) assert.ok(fs.existsSync(path.join(root, ref)), `ausente: ${ref}`);
});

test('os módulos entram na ordem correta de dependência', () => {
  const order = ['src/scan.js', 'src/tremor.js', 'src/phrases.js', 'src/store.js', 'src/app.js'];
  let last = -1;
  for (const file of order) {
    const index = html.indexOf(file);
    assert.ok(index > last, `fora de ordem: ${file}`);
    last = index;
  }
});

test('CSP restritiva e nenhum script externo', () => {
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /default-src 'self'/);
  assert.doesNotMatch(html, /src="https?:\/\//);
});

test('status e alvo atual são anunciados por leitor de tela', () => {
  assert.match(html, /id="status"[^>]*role="status"/);
  assert.match(html, /id="scan-now"[^>]*aria-live="polite"/);
});

test('campos têm rótulo associado', () => {
  const controls = [...html.matchAll(/<(?:textarea|input|select)[^>]*id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(controls.length >= 6);
  for (const id of controls) assert.match(html, new RegExp(`for="${id}"`));
});

test('o botão de acionar é grande e destacado', () => {
  assert.match(html, /id="scan-activate"[^>]*class="big activate"/);
  assert.match(css, /\.key\s*\{[\s\S]*?min-height:\s*64px/);
});

test('a varredura avisa que é local e não promete diagnóstico', () => {
  assert.match(html, /100% local/);
  assert.match(html, /nada é enviado/i);
  assert.doesNotMatch(html, /cura|diagnóstico|substitui a terapia/i);
});

test('atalho de espaço e enter não dispara dentro de campos de texto', () => {
  assert.match(app, /event\.key !== ' '/);
  assert.match(app, /event\.key !== 'Enter'/);
  assert.match(app, /'button', 'input', 'select', 'textarea', 'a'/);
});

test('a permanência usa tremor e tempo configurável', () => {
  assert.match(app, /Tremor\.createDwell/);
  assert.match(app, /state\.settings\.dwellMs/);
  assert.match(app, /state\.settings\.tremorRadius/);
});

test('a fala usa a síntese do navegador em pt-BR', () => {
  assert.match(app, /SpeechSynthesisUtterance/);
  assert.match(app, /utterance\.lang = 'pt-BR'/);
});

test('as preferências são salvas no navegador', () => {
  assert.match(app, /MotorStorage\.createStore\(window\.localStorage\)/);
  assert.match(app, /store\.save\(state\.settings, state\.phrases\)/);
});

test('credita OlacDev', () => {
  assert.match(html, /Made by OlacDev/);
  assert.match(html, /https:\/\/olacdev\.com\//);
});

test('foco visível e respeito a movimento reduzido', () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*4px/);
  assert.match(css, /prefers-reduced-motion/);
});
