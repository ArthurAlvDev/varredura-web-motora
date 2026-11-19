# Varredura Motora

Teclado web **100% local** com varredura automática, filtro anti-tremor e frases rápidas para quem escreve com **um único acionador** — um switch, um toque na tela, o pé ou a cabeça.

- Site: <https://varredura.olacdev.com>
- Licença: MIT
- Feito por **OlacDev** — <https://olacdev.com/>

## O problema

Quem tem mobilidade reduzida severa não digita: aciona. A varredura por linha e coluna é a técnica clássica, mas as implementações disponíveis costumam exigir instalação, conta, conexão estável ou um terapeuta para configurar. No navegador do tablet da escola, do posto de saúde ou da casa, não há nada pronto.

Há também um problema silencioso: **tremor**. Um alvo que exige precisão de 4 px é inalcançável para quem tem tremor essencial, paralisia cerebral ou Parkinson. Duas técnicas resolvem isso e quase nunca aparecem juntas: ignorar deslocamentos pequenos (filtro de jitter) e exigir permanência no alvo (dwell), com confirmação por tempo.

## O que a ferramenta faz

1. **Varredura em duas etapas**: primeiro os grupos (A–F, G–L, M–R, S–Z, Ações, Frases), depois os itens de cada grupo. Acionar no grupo entra nele; acionar no item escreve.
2. **Acionador único**: barra de espaço, Enter, o botão grande **Acionar** ou um switch USB que emule espaço.
3. **Velocidade ajustável** de 0,4 s a 4 s, com modo automático ou manual (avança só quando você aciona).
4. **Anti-tremor**: deslocamentos menores que a tolerância configurada (0–60 px) são ignorados.
5. **Permanência (dwell)**: parar o ponteiro sobre uma tecla por 0,4–3 s aciona o alvo, com barra de progresso visível.
6. **Frases rápidas** editáveis: “Preciso de ajuda”, “Estou com dor”, “Pode repetir?” e outras, com limite de 40 e remoção de duplicatas.
7. **Fala** com a síntese de voz do navegador em pt-BR, além de copiar o texto.
8. **Preferências salvas** no próprio navegador (velocidade, dwell, tolerância, som, modo e frases).

## Como usar

1. Abra o site e clique em **Iniciar varredura**.
2. Espere o grupo desejado ficar destacado e acione.
3. A varredura passa a percorrer as letras do grupo; acione na letra certa.
4. Use **Voltar etapa** para desfazer sem escrever e **Reiniciar** para voltar ao primeiro grupo.
5. Ajuste a velocidade até ficar confortável. Mais lento é melhor do que errar.

## Estrutura

```
index.html          interface (texto, teclado, anti-tremor, frases, ajuda)
src/scan.js         máquina de estados da varredura (grupo → item), grupos padrão
src/tremor.js       filtro de jitter, dwell e cálculo de progresso
src/phrases.js      lista de frases rápidas, validação e limites
src/store.js        preferências e frases no localStorage, com validação de versão
src/app.js          interface, teclado, voz, som e eventos
tests/              64 testes (node:test), sem dependências
```

## Decisões de projeto

- **Sem dependências de execução.** Um arquivo HTML e cinco módulos UMD mínimos; funciona aberto direto do disco.
- **Acionamento nunca só por hover.** O dwell é opcional e explícito; o caminho principal é o acionador.
- **Tremor é requisito, não detalhe.** O raio de tolerância é ajustável e o filtro tem testes próprios.
- **Estado previsível.** A varredura é uma função pura (`next`, `back`, `activate`), testada sem DOM.
- **Som discreto e opcional.** Um bipe curto ajuda quem não acompanha a tela; pode ser desligado e nunca é obrigatório.
- **Dados ficam no navegador.** `localStorage` com versão e validação; se estiver bloqueado, a ferramenta continua funcionando sem salvar.
- **Nada de promessa clínica.** A página descreve o que faz e não afirma substituir terapia ou avaliação.

## Limitações

1. **Varredura por grupo e item**, não por linha e coluna com ponteiro livre. Para pranchas muito grandes, o caminho é dividir em mais grupos.
2. **Sem edição da prancha de letras** nesta versão; só as frases são editáveis.
3. **Depende da síntese de voz do navegador** para falar; a qualidade varia por sistema.
4. **Sem teste com usuários** de tecnologia assistiva nesta etapa; os tempos padrão são um ponto de partida, não uma prescrição.
5. **Sem sincronização entre dispositivos** — as preferências ficam no navegador usado.

## Licença

MIT — veja [LICENSE](LICENSE).

Citação sugerida:

> FERREIRA, A. A. **Varredura Motora: teclado web com varredura, anti-tremor e frases rápidas para acionador único**. 2026. Software. Disponível em: <https://varredura.olacdev.com>.
