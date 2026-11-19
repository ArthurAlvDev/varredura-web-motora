# Launch Report — Varredura Motora (ACC-006)

**Data:** 19/11/2026
**Projeto:** `varredura-web-motora`
**Licença:** MIT
**Responsável:** Ferreira, A. A. (OlacDev)

## Estado

| Etapa | Estado | Evidência |
| --- | --- | --- |
| Build local | Concluído | 10 arquivos, sem dependências de execução |
| Testes | 64/64 | `node --test tests/*.test.js` |
| GitHub | Publicado | `ArthurAlvDev/varredura-web-motora` (branch `main`) |
| Vercel | Publicado | `https://varredura-web-motora.vercel.app` (HTTP 200) |
| Domínio próprio | Pendente de DNS | `varredura.olacdev.com` adicionado; CNAME no Cloudflare |
| Artigo | Pronto (não publicado) | `ARTIGO_CIENTIFICO.md` |

## Escopo entregue

- Varredura hierárquica em duas etapas (grupos → itens) com máquina de estados pura.
- Acionamento por espaço, Enter, botão grande ou switch que emule espaço.
- Velocidade ajustável (0,4–4 s) e modo automático ou manual.
- Filtro anti-tremor com raio configurável (0–60 px).
- Acionamento por permanência (0,4–3 s) com barra de progresso na tecla.
- Frases rápidas editáveis, com deduplicação e limite de 40 itens.
- Fala em pt-BR via síntese do navegador e cópia do texto.
- Preferências e frases persistidas no navegador, com validação de versão.
- Alvos de 64 px, foco visível, dois temas e crédito “Made by OlacDev”.

## Verificações executadas

- `node --test`: 64 testes, 64 aprovados, 0 falhas.
- Página verificada por teste: referências locais existentes, ordem de scripts, rótulos, CSP, `aria-live`, atalhos que não disparam em campos de texto.
- Estrutura verificada: grupos padrão incluem faixas de letras, ações e frases; ids únicos.
- Limites verificados: velocidade, permanência, raio, taxa de voz, número e tamanho de frases.

## Pendências e riscos

1. **DNS do domínio próprio** — CNAME `varredura` no Cloudflare apontando para o alvo do projeto.
2. **Sem varredura por linha e coluna** — apenas dois níveis nesta versão.
3. **Prancha de letras fixa** — só as frases são editáveis.
4. **Dependência da voz do sistema** para falar.
5. **Sem estudo com usuários** de tecnologia assistiva.

## Próximo passo sugerido

Edição da prancha de letras, varredura por linha/coluna e estudo de usabilidade com usuários de acionador único.
