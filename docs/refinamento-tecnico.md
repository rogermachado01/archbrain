# Refinamento Técnico — ArchViz como fonte da verdade do time

> Status: proposta / refinamento. Nenhum item deste documento está implementado.
> Escopo: evoluir o ArchViz do MVP atual (visualização somente) para uma ferramenta de
> **fonte da verdade** de arquitetura serverless, de uso diário pelo time de arquitetura
> e desenvolvimento.

## Estado atual (resumo)

O app já cobre: navegação C4 por drill-down (`page.tsx` + `src/lib/model.ts`), painel de
detalhes AWS (`DetailsPanel`), múltiplas fontes de dados via registry (`src/lib/data-sources.ts`),
import de bundles OKF (`src/lib/okf-import.ts`), wiki de leitura dos bundles (`OkfWikiViewer`),
tipos de relação com legenda (`relation-style.ts`) e grupos de rede AWS (`groups.ts`).

Os gaps para virar fonte da verdade se agrupam em três eixos: **uso diário**
(busca, links compartilháveis, export), **confiança no dado** (validação, workflow de
edição, sincronização com IaC) e **navegação de fluxos** (relações entre níveis,
rastreamento de caminho).

## Visão geral dos itens

| # | Item | Eixo | Esforço | Depende de |
|---|------|------|---------|------------|
| 1 | Busca global (Ctrl+K) | Uso diário | P | — |
| 2 | Deep links (estado na URL) | Uso diário | P | — |
| 3 | Export PNG/SVG + minimap | Uso diário | P/M | — |
| 4 | Validação do `ArchModel` no load | Confiança | M | — |
| 5 | Workflow docs-as-code (CI) | Confiança | P | 4 |
| 6 | Importadores de IaC + drift check | Confiança | G | 4, 5 |
| 7 | Roll-up de relações entre níveis | Fluxos | M | — |
| 8 | Highlight de caminho (upstream/downstream) | Fluxos | M | — |
| 9 | Ownership e links operacionais nos nós | Uso diário | P | — |

Esforço: **P** (pequeno, ~1 dia), **M** (médio, 2–4 dias), **G** (grande, 1+ semana / iterativo).

> **Atenção (todos os itens):** o projeto usa **Next.js 16** — antes de escrever qualquer
> código Next-specific (roteamento, `useSearchParams`, config), consultar
> `node_modules/next/dist/docs/01-app/`, conforme `AGENTS.md`.

---

## 1. Busca global (Ctrl+K)

**Problema.** Numa arquitetura serverless real (dezenas de Lambdas, filas, tabelas), achar
um recurso exige saber de antemão em qual container ele mora e drilar até lá. Não existe
nenhuma busca hoje.

**Proposta.**

- Novo componente `src/components/SearchPalette.tsx`: overlay modal estilo command-palette,
  aberto por Ctrl+K / Cmd+K (listener de `keydown` no `page.tsx`) e por um botão no header.
- A busca opera sobre `archModel.nodes` — que já é uma **lista flat** (decisão de design
  existente), então não há travessia de árvore: é um filtro simples por `name`,
  `technology` e `aws.resourceType`, case-insensitive, com match por substring
  (fuzzy simples hand-rolled; não puxar lib de fuzzy search para isso).
- Cada resultado mostra nome, nível C4, tipo AWS e o caminho de ancestrais (reusar
  `getBreadcrumb` de `src/lib/model.ts` passando o `parentId` do nó).
- Ao selecionar um resultado, o `page.tsx` seta os dois estados que já existem:
  `setCurrentParentId(node.parentId ?? null)` + `setSelectedNodeId(node.id)`. Nenhuma
  mudança no `ArchitectureGraph` é necessária — a view é derivada desses dois ids.
- Se `viewMode === "wiki"`, voltar para `"diagram"` ao navegar por busca.

**Critérios de aceite.** Ctrl+K abre a palette em qualquer view; digitar "dynamo" acha a
tabela DynamoDB do dataset de exemplo; Enter navega para o nível certo com o nó selecionado
e o painel de detalhes preenchido; Esc fecha sem efeito colateral.

---

## 2. Deep links — estado de navegação na URL

**Problema.** `sourceId`, `currentParentId`, `selectedNodeId` e `viewMode` vivem só em
`useState` (`page.tsx:26–32`). Não dá para colar um link no Slack/PR/ADR apontando para
"este componente, neste nível, desta arquitetura" — cada pessoa re-navega do zero. Sem
isso a ferramenta não funciona como referência compartilhada.

**Proposta.**

- Refletir o estado em query params: `?source=<id>&parent=<id>&node=<id>&view=diagram|wiki`.
- Usar as APIs do App Router (`useSearchParams` + `router.replace` com `scroll: false`,
  **confirmando a assinatura na doc local do Next 16**). `replace`, não `push` — navegação
  de drill não deve poluir o histórico do browser a cada clique (avaliar `push` apenas
  para troca de `source`).
- Inicialização: no primeiro render, ler os params e hidratar os estados. **Validar contra
  o modelo carregado**: como o load é assíncrono, os ids da URL só podem ser aplicados
  depois que `archModel` resolve — aplicar no mesmo padrão derivado já usado para
  `loaded.sourceId` (comparar, não resetar via setState em effect — regra existente do
  projeto, ver CLAUDE.md sobre `react-hooks/set-state-in-effect`). Ids que não existem no
  modelo caem silenciosamente no root Context view.
- `handleSelectSource` / `handleDrillInto` / `handleNavigate` / `handleChangeViewMode`
  passam a atualizar a URL; o estado local pode até ser eliminado em favor da URL como
  única fonte (preferível — evita duas fontes de verdade para o mesmo dado).

**Critérios de aceite.** Navegar até um componente e copiar a URL; abrir em aba anônima
reproduz exatamente a mesma view (fonte, nível, seleção). URL com ids inválidos abre o
root sem erro. Botão voltar do browser não desfaz cada clique de seleção individualmente.

---

## 3. Export da view (PNG/SVG) e minimap

**Problema.** Não há como levar uma view para um doc, ADR ou slide sem screenshot manual.
Views grandes também não têm visão geral navegável.

**Proposta.**

- **Export:** plugin oficial `@antv/x6-plugin-export` (verificar compatibilidade com a
  linha 3.x — o projeto usa `@antv/x6 ^3.1.7`). Registrar o plugin na criação do `Graph`
  em `ArchitectureGraph.tsx` (o `useEffect` de mount que já existe) e expor
  `graph.exportPNG()` / `graph.exportSVG()` por um botão discreto na `.graph-area`
  (mesmo padrão de overlay HTML absoluto do `RelationLegend`, incluindo o cuidado com
  `pointer-events` — o container tem panning/mousewheel).
- Nome do arquivo exportado: `<source>-<parentId|context>.png`.
- **Minimap:** plugin `@antv/x6-plugin-minimap`, renderizado só quando a view tem mais de
  ~15 nós (limiar constante). Também overlay absoluto dentro da `.graph-area`.

**Critérios de aceite.** Botão de export baixa PNG/SVG fiel à view atual (incluindo boundary
e grupos); minimap aparece só em views densas e clicar nele move o viewport.

---

## 4. Validação do `ArchModel` no carregamento

**Problema.** Um JSON ou bundle OKF malformado (relação apontando para nó inexistente,
`parentId` órfão, `groupId` inválido, id duplicado) renderiza errado **silenciosamente**.
Para o time todo editar os dados com segurança, erro de dado precisa falhar alto e com
mensagem acionável.

**Proposta.**

- Novo módulo `src/lib/validate-model.ts` com `validateArchModel(model: unknown): ArchModel`
  (lança `Error` com mensagem agregada listando todos os problemas, não só o primeiro).
- Duas camadas:
  1. **Shape** — campos obrigatórios e tipos de `ArchNode`/`ArchRelation`/`AwsGroup`
     (espelhar `src/lib/types.ts`). Recomendação: **Zod** (browser-safe, tipos inferidos
     ficam alinhados ao schema, mensagens boas). Alternativa aceitável: validador
     hand-rolled no espírito do `frontmatter.ts` — decidir na implementação; Zod é a
     recomendação salvo objeção a nova dependência.
  2. **Integridade referencial** (isto Zod não cobre sozinho — funções puras próprias):
     ids duplicados; `parentId` inexistente; ciclos na cadeia de `parentId`;
     `relation.source`/`target` inexistentes; `groupId` apontando para grupo inexistente;
     `parentGroupId` órfão ou cíclico; `level` do filho consistente com o do pai
     (context → container → component).
- **Ponto de integração único:** dentro do `load()` de cada entrada de `DATA_SOURCES`
  (`src/lib/data-sources.ts`) — tanto o `import()` de JSON quanto o retorno de
  `importOkfBundle` passam por `validateArchModel` antes de resolver. O erro cai
  naturalmente no caminho `loadFailed` que o `page.tsx` já tem (linhas 46–48), aparecendo
  como "Failed to load architecture: …" — nenhuma mudança de UI necessária além de,
  opcionalmente, formatar a lista de problemas.

**Critérios de aceite.** Introduzir de propósito uma relação órfã no JSON de exemplo →
a UI mostra o erro nomeando a relação e o id faltante, em vez de renderizar um grafo sem
a edge. Modelos válidos carregam sem mudança observável.

---

## 5. Workflow docs-as-code (validação em CI)

**Problema.** Mesmo com validação no browser (item 4), o erro só aparece depois do merge,
quando alguém abre o app. A arquitetura deve evoluir com o mesmo rigor do código: PR +
verificação automática.

**Proposta.**

- Script CLI `scripts/validate-model.mjs` que **reusa o mesmo `validateArchModel`** do
  item 4 (motivo para mantê-lo puro e sem dependência de browser):
  - valida todos os JSONs registrados em `src/data/`;
  - valida os bundles OKF em `public/okf-bundles/` — aqui é preciso rodar o
    `importOkfBundle` fora do browser: extrair a lógica de parse para funções que recebem
    conteúdo string (o fetch fica só na borda), permitindo que o CLI leia via `fs` e o
    app via `fetch`. É a única refatoração de código do item.
- `package.json`: script `"validate": "node scripts/validate-model.mjs"`.
- GitHub Actions (quando o projeto virar repo git — hoje não é): workflow rodando
  `npm run lint`, `npx tsc --noEmit -p .` e `npm run validate` em todo PR.
- Convenção documentada (no README ou neste doc): mudança de arquitetura = PR alterando
  o JSON/bundle correspondente, revisado pelo dono do sistema (ver item 9).

**Critérios de aceite.** `npm run validate` passa nos datasets atuais; quebra (exit 1, com
lista de erros) ao introduzir uma relação órfã em qualquer JSON ou bundle.

---

## 6. Importadores de IaC (Terraform/CDK) e drift check

**Problema.** Hoje os dados são autorados à mão. Diagrama mantido à mão diverge do
deployado — e diagrama desatualizado é o que mata a confiança do time. Este é o item que
transforma a ferramenta de "visualizador" em fonte da verdade de fato.

**Proposta (duas fases, ambas offline — nada roda no browser).**

- **Fase A — conversor IaC → `ArchModel`:** script Node (`scripts/import-terraform.mjs`
  e/ou `scripts/import-cdk.mjs`) que lê `terraform show -json` (state/plan) ou o template
  CloudFormation sintetizado pelo CDK e emite um `ArchModel` JSON em `src/data/`, que
  entra no registry `DATA_SOURCES` como qualquer outra fonte:
  - mapear tipo de recurso (`aws_lambda_function`, `AWS::Lambda::Function`) →
    `aws.resourceType`, `level: "container"` e `icon` via `findAwsIcon`
    (`src/lib/aws-icons.ts` — já tolera variações de nome de serviço);
  - inferir relações do que o IaC declara: event source mappings (SQS→Lambda),
    integrações do API Gateway, targets de EventBridge, subscriptions SNS, IAM refs como
    fallback heurístico (marcar relações inferidas por heurística com label distinto);
  - `groups` a partir de VPC/subnets do state (o modelo `AwsGroup` já suporta);
  - manter um arquivo de **overrides** por fonte (descrições, nomes amigáveis, relações
    manuais, nós de nível `component`) que o conversor faz merge por cima do gerado —
    o dado gerado nunca é editado à mão.
- **Fase B — drift check em CI:** modo `--check` do mesmo script que compara o inventário
  do `ArchModel` versionado com o state atual e falha listando recursos a mais/a menos
  ("o modelo declara 12 Lambdas, o stack tem 14"). Mesmo sem a Fase A completa, um drift
  check só de inventário já elimina o problema do diagrama mentiroso.
- Explicitamente fora de escopo: chamadas AWS em runtime pelo app. O app continua lendo
  apenas `ArchModel` estático; sincronização é responsabilidade de scripts/CI.

**Critérios de aceite (Fase A).** Rodar o conversor contra um state de exemplo produz um
JSON que passa no `validateArchModel` e renderiza no app com ícones corretos.
**(Fase B.)** CI falha quando um recurso existe no state e não no modelo, com mensagem
nomeando o recurso.

---

## 7. Roll-up de relações entre níveis

**Problema.** `getRelationsForView` só mostra uma relação se **ambos** os endpoints estão
visíveis no drill level atual (limitação documentada do MVP). Em serverless isso esconde
exatamente o que importa: eventos cruzando containers — uma relação componente-A →
componente-B (containers diferentes) não aparece em lugar nenhum da view de containers.

**Proposta.**

- Nova função pura em `src/lib/model.ts`, por exemplo
  `getRelationsForViewWithRollup(model, visibleIds)`:
  - para cada relação cujo endpoint não está em `visibleIds`, subir a cadeia de `parentId`
    (helper de ancestrais; `getBreadcrumb` já percorre essa cadeia) até encontrar um
    ancestral visível; se não houver, descartar;
  - **descartar auto-loops**: se source e target sobem para o mesmo nó visível, a relação
    é interna a ele;
  - **deduplicar**: N relações que agregam para o mesmo par (source, target) viram uma
    edge só, com flag `aggregated: true`, `kind` herdado se todas concordam (senão
    `"sync"`) e label tipo "3 interações" (ou o label da única relação, se N=1).
- `page.tsx` troca a chamada no `useMemo` de `visibleRelations`; `getRelationsForView`
  original permanece (a legenda e o detour-lane do `ArchitectureGraph` continuam
  funcionando sem mudança — edges agregadas são `ArchRelation` normais).
- Estilo: edges agregadas com dash próprio ou opacidade em `relation-style.ts`, e entrada
  na legenda ("relação agregada de nível inferior").
- Interação futura (não obrigatória nesta entrega): clique na edge agregada lista as
  relações originais no `DetailsPanel`.

**Critérios de aceite.** No dataset de exemplo, criar uma relação entre componentes de
containers diferentes → na view de containers aparece uma edge agregada entre os dois
containers; drilando para dentro, a relação original continua aparecendo apenas quando
ambos os lados estão visíveis. Nenhuma edge duplicada, nenhum auto-loop.

---

## 8. Highlight de caminho (upstream/downstream)

**Problema.** Para o dev investigando um incidente ("de onde vem essa mensagem na DLQ?"),
o valor está em seguir o fluxo ponta-a-ponta. Hoje selecionar um nó só abre o painel de
detalhes; as edges não reagem.

**Proposta.**

- Helpers puros em `src/lib/model.ts`: `getUpstream(model, nodeId)` /
  `getDownstream(model, nodeId)` — BFS sobre `relations` (transitivo), retornando os
  conjuntos de node ids e relation ids alcançáveis. Operar sobre as relações **da view
  atual** (pós roll-up do item 7, se implementado) para o highlight corresponder ao que
  está desenhado.
- `ArchitectureGraph`: ao mudar `selectedNodeId`, aplicar dimming nos cells fora do
  caminho e reforço nos dentro (mexer em `attrs`/`opacity` dos cells existentes via
  `graph.getCellById(...).attr(...)` — **não** reconstruir com `resetCells`, que é o
  caminho caro reservado para mudança de dados; a distinção entre "dados mudaram" e
  "seleção mudou" já existe no componente via props separadas).
- Controle de modo na UI (overlay pequeno, padrão do `RelationLegend`): desligado /
  upstream / downstream / ambos. Filtro adicional por `RelationKind` (reusar
  `resolveRelationKind` de `relation-style.ts`) — ex.: "só fluxo de eventos async".
- Nós estruturais (boundary, grupos) ficam fora do dimming — o `ArchitectureGraph` já
  mantém o set `structuralIds` para ignorá-los em cliques; reusar.

**Critérios de aceite.** Selecionar a DLQ do dataset de exemplo com modo "upstream" destaca
a cadeia inteira que publica nela e esmaece o resto; trocar a seleção atualiza o highlight
sem piscar o grafo; desligar o modo restaura a aparência normal.

---

## 9. Ownership e links operacionais nos nós

**Problema.** Achar o recurso no diagrama é metade do trabalho; a outra metade é "quem é o
dono e onde olho" (repo, runbook, dashboard). O `ArchNode` não carrega nada disso.

**Proposta.**

- `src/lib/types.ts`: estender `ArchNode` com
  `owner?: string` (time/squad) e `links?: { label: string; url: string }[]`
  (repo, runbook, dashboard CloudWatch, board). Campos opcionais — datasets existentes
  seguem válidos sem migração.
- `DetailsPanel.tsx`: seção "Ownership & Links" quando presente — owner como badge, links
  como âncoras `target="_blank" rel="noopener noreferrer"`.
- **OKF:** mapear no `okf-import.ts` seguindo os padrões que ele já tem:
  - `owner:` como campo de frontmatter custom (mesmo espírito do `aws_resource_type`);
  - seção `# Links` com bullets `- [Label](https://...)` — parser análogo ao da seção
    `# Relations` existente; diferenciar de links relativos `.md` (que são navegação),
    aceitando só URLs absolutas.
- Atualizar o bundle de exemplo `public/okf-bundles/order-system/` com pelo menos um
  concept usando `owner` + `# Links`, e o `CLAUDE.md` (seção "Importing OKF bundles"),
  que exige manter convenções e bundle de exemplo em sincronia.
- Item 4/5: o validador passa a checar shape dos `links` (URL absoluta, label não vazio).

**Critérios de aceite.** Nó com `owner`/`links` mostra a seção no painel com links
clicáveis abrindo em nova aba; nós sem os campos renderizam como hoje; bundle de exemplo
demonstra a convenção e o import a popula corretamente.

---

## Roadmap sugerido

| Fase | Itens | Racional |
|------|-------|----------|
| **F1 — uso diário** | 1 (busca), 2 (deep links), 9 (ownership/links) | Esforço pequeno, mudam o uso cotidiano do time imediatamente. |
| **F2 — confiabilidade** | 4 (validação), 5 (CI docs-as-code) | Pré-requisito para edição colaborativa segura; 5 reusa o validador de 4. |
| **F3 — visualização de fluxos** | 7 (roll-up), 8 (highlight), 3 (export/minimap) | Maior ganho para investigação/serverless; 8 se beneficia de 7 estar pronto. |
| **F4 — fonte da verdade** | 6 (importadores IaC + drift check) | Investimento maior; sustenta a promessa no longo prazo. Fase B (drift check) pode ser antecipada. |

Cada item foi desenhado para ser um PR independente (exceto 5→4 e a ordem sugerida 7→8).
