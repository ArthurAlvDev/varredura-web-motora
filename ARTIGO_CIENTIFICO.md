# Varredura Motora: teclado web com varredura em duas etapas, anti-tremor e frases rápidas para acionador único

**Arthur Alves Ferreira (Ferreira, A. A.)**
OlacDev · <https://olacdev.com/>

**Versão:** 1.0 · **Data:** 19/11/2026
**Licença do texto:** CC BY 4.0 · **Licença do software:** MIT
**Tipo de recurso (Zenodo):** Preprint · **Idioma:** Português (Brasil)

*Pré-print interno. Ainda não depositado em repositório de dados; ao publicar, substituir esta nota pelo DOI. A versão citável do software é o repositório público indicado nas referências.*

---

## Resumo

Pessoas com mobilidade reduzida severa frequentemente escrevem por varredura com um único acionador. As soluções disponíveis exigem instalação, configuração especializada ou conexão permanente, o que inviabiliza o uso no navegador de um tablet compartilhado. Além disso, a maioria trata o tremor como ruído a ser tolerado, e não como requisito de projeto. Este trabalho apresenta a **Varredura Motora**, aplicação web estática que implementa varredura hierárquica em duas etapas (grupos e itens), filtro de jitter com raio configurável, acionamento por permanência com confirmação temporal e um grupo editável de frases rápidas. O estado da varredura é uma máquina pura, testada sem DOM; as preferências são persistidas no próprio navegador com validação de versão. A suíte de 64 testes cobre transições, limites, tremor, armazenamento, frases e integridade da página.

**Palavras-chave:** tecnologia assistiva; varredura; acionador único; tremor; comunicação alternativa; acessibilidade web.

## 1. Introdução

A varredura é uma técnica antiga e eficaz: o sistema percorre alvos possíveis, a pessoa aciona quando o alvo desejado está destacado, e a seleção se resolve em uma ou duas etapas. O que muda entre implementações é o custo de entrada. Softwares dedicados costumam exigir instalação, licença, treinamento e um profissional para calibrar tempos. Em contextos de saúde pública, escola e domicílio, o dispositivo disponível é um navegador.

Há ainda uma barreira menos discutida: **tremor e espasticidade**. Um alvo de 48 px com confirmação imediata ao toque produz seleções erradas em sequência, o que desestimula o uso. Duas técnicas atacam isso — descartar deslocamentos pequenos e exigir permanência — e raramente são combinadas com varredura em uma ferramenta aberta.

**Objetivo.** Descrever e validar uma implementação web de varredura em duas etapas que trate tremor como requisito explícito, ofereça frases rápidas editáveis e funcione sem servidor, sem instalação e sem conta.

## 2. Fundamentação

### 2.1 Varredura e custo de seleção

Na varredura automática, o tempo até o alvo cresce com o número de alvos e com o período de varredura. A varredura em dois níveis reduz o número de passos por seleção: com 30 alvos em um nível, o pior caso é 30 passos; em dois níveis de 6 e 5, o pior caso é 11. O custo é o erro de nível, mitigado por um botão de retorno.

### 2.2 Tremor como requisito

Tremor essencial e discinesias produzem deslocamentos de dezenas de pixels. Um filtro de âncora que ignora movimentos abaixo de um raio converte sinal trêmulo em ponteiro estável. A permanência (dwell) acrescenta confirmação temporal: o alvo só dispara se permanecer selecionado pelo tempo configurado. Juntas, as duas técnicas reduzem ativações acidentais sem exigir precisão fina.

### 2.3 Persistência local

Tempos confortáveis variam por pessoa e por dia. Salvar preferências no navegador elimina a recalibração a cada sessão, sem criar conta nem enviar dados.

## 3. Método

### 3.1 Máquina de varredura (`scan.js`)

Estado `{ level, group, item }`, com `level` em `grupo` ou `item`. As operações são funções puras: `next` avança circularmente no nível atual, `back` retorna de item para grupo ou recua um grupo, `activate` entra no grupo ou devolve o item selecionado e volta ao nível de grupo. Grupos vazios são pulados. `goTo` e `goToItem` permitem salto direto, usado pelo toque na tela.

A prancha padrão tem seis grupos: quatro faixas de letras, um grupo de ações (espaço, apagar, falar, limpar) e um grupo de frases, reconstruído a partir da lista salva.

### 3.2 Anti-tremor (`tremor.js`)

`createFilter({ radius })` mantém uma âncora e ignora movimentos cuja distância euclidiana à âncora não excede o raio. `createDwell({ durationMs, radius })` combina o filtro com um cronômetro: trocar de alvo reinicia a contagem; permanecer no mesmo alvo até `durationMs` produz `ready`. `progress` é uma função pura, testável sem relógio, e devolve proporção, prontidão e tempo restante.

### 3.3 Frases rápidas (`phrases.js`)

Lista padrão de dez frases curtas de comunicação. `createPhrases` normaliza espaços, remove vazios e duplicatas por comparação sem caixa, corta em 80 caracteres e limita a 40 itens. `addPhrase` e `removePhrase` operam sobre cópias, sem mutação.

### 3.4 Preferências (`store.js`)

Chave versionada `varredura-motora:v1`, com `normalizeSettings` aplicando faixas: velocidade 400–5000 ms, permanência 300–5000 ms, raio 0–80 px, taxa de voz 0,5–2, modo `auto` ou `manual`. `validate` recusa versão desconhecida e lista inválida. `createStore` testa o armazenamento com uma sonda e degrada para memória quando bloqueado; dados corrompidos são reportados, não apagados silenciosamente.

### 3.5 Interface

Três caminhos de acionamento coexistem: varredura automática, avanço manual e toque direto na tecla. Espaço e Enter acionam, exceto quando o foco está em campo de texto, botão ou link, evitando dupla ativação. O som de passo é opcional. A fala usa `SpeechSynthesisUtterance` com `lang = 'pt-BR'` e taxa configurável; quando indisponível, a interface informa e mantém a cópia do texto.

O destaque do alvo usa borda de 3 px e halo, não apenas cor. O alvo tem no mínimo 64 px de altura, e a permanência desenha uma barra de progresso na base da tecla.

## 4. Validação

| Arquivo | Foco | Testes |
| --- | --- | --- |
| `scan.test.js` | transições, circularidade, grupos vazios, saltos, unicidade de ids | 16 |
| `tremor.test.js` | distância, filtro, estatísticas, progresso, dwell, limites | 15 |
| `store.test.js` | frases, limites, normalização, versão, armazenamento bloqueado e corrompido | 18 |
| `page.test.js` | integridade, ordem de scripts, rótulos, CSP, atalhos, fala, crédito | 15 |

Resultado: **64 testes, 64 aprovados, 0 falhas**.

Casos notáveis: um grupo vazio é pulado sem travar a varredura; mover 5 px com raio 10 não desloca a âncora; permanecer 1,2 s no mesmo alvo dispara exatamente uma vez; armazenamento bloqueado não impede o uso; `package.json` não é enviado ao deploy por não ser necessário ao runtime.

## 5. Acessibilidade

Alvos de 64 px, foco visível de 4 px, contraste AA nos dois temas, `aria-live` no alvo atual e no status, rótulos explícitos para todos os controles, respeito a `prefers-reduced-motion`, e nenhuma informação transmitida apenas por cor. O texto de instrução foi escrito em passos numerados e frases curtas.

## 6. Limitações

1. **Varredura em dois níveis**, não em grade com ponteiro livre; pranchas muito grandes exigem mais grupos.
2. **Letras e ações fixas** nesta versão; apenas as frases são editáveis.
3. **Fala depende do navegador** e da voz instalada no sistema.
4. **Sem estudo com usuários** de tecnologia assistiva; os tempos padrão são ponto de partida.
5. **Sem sincronização** entre dispositivos.
6. **Sem varredura por linha e coluna** com seleção de coordenada.

## 7. Trabalhos relacionados

Pranchas de comunicação com varredura existem em soluções comerciais e em projetos abertos, em geral acopladas a um aplicativo específico. Leitores de tela oferecem navegação por foco, não varredura automática. O que este trabalho propõe é a combinação, em uma página única e aberta, de varredura hierárquica, filtro de jitter, dwell configurável e frases rápidas — sem instalação e sem servidor.

## 8. Conclusão

A Varredura Motora parte de uma restrição prática: o dispositivo disponível é um navegador e o canal de entrada é um único acionador. Sobre essa restrição, organiza-se uma máquina de varredura previsível, um filtro de tremor explícito e frases que resolvem a comunicação imediata antes da escrita letra a letra. Como continuação, prevê-se edição da prancha de letras, varredura por linha e coluna, importação/exportação de preferências e um estudo de usabilidade com usuários de tecnologia assistiva.

## Referências

BRASIL. **Lei nº 13.146, de 6 de julho de 2015**. Institui a Lei Brasileira de Inclusão da Pessoa com Deficiência. Brasília, DF, 2015.

FERREIRA, A. A. **Varredura Motora**: teclado web com varredura, anti-tremor e frases rápidas para acionador único. 2026. Software. Disponível em: <https://github.com/ArthurAlvDev/varredura-web-motora>.

W3C. **Web Content Accessibility Guidelines (WCAG) 2.2**. Recommendation. 2023.

W3C. **Making Content Usable for People with Cognitive and Learning Disabilities**. W3C Note. 2021. (COGA)

---

### Nota sobre publicação

Este texto é um pré-print interno. **Não houve submissão a periódico nem depósito em repositório de dados nesta etapa.** A versão citável do software é o repositório público indicado acima, sob licença MIT.
