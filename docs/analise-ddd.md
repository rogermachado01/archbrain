# Análise: aplicando Domain-Driven Design ao ArchViz

> Documento de análise técnica — mapeia os conceitos de DDD (estratégicos e táticos) sobre o
> código atual do ArchViz, avalia o que já está alinhado, o que vale a pena refatorar e o que
> seria over-engineering para o escopo do MVP. Complementa `docs/refinamento-tecnico.md` e
> `docs/refinamento-frontend.md`.

---

## 1. Sumário executivo

O ArchViz já pratica, sem usar o vocabulário, boa parte do que o DDD prescreve para um domínio
deste tamanho:

- **`src/lib/types.ts` é um modelo de domínio explícito** (`ArchModel`, `ArchNode`,
  `ArchRelation`, `AwsGroup`) separado de qualquer preocupação de rendering.
- **`src/lib/model.ts` é uma camada de serviços de domínio puros** — funções sem estado, sem
  dependência de React ou X6 (`getChildren`, `getRelationsForViewWithRollup`, `tracePath`).
- **`src/lib/okf-import.ts` é uma Anti-Corruption Layer de livro-texto**: traduz um formato
  externo (OKF) para o modelo interno, deixando claro que "o nosso modelo é a fonte da verdade;
  OKF é só formato de entrada".
- **`src/lib/validate-model.ts` codifica as invariantes do agregado** (sem `parentId` pendurado,
  sem ciclo, sem colisão de id, aninhamento C4 correto) e roda em toda fronteira de entrada.
- **`DATA_SOURCES` é um Repository** disfarçado de registry.

O que falta não é reescrever nada — é **nomear e endurecer fronteiras que já existem**:
tornar o agregado "sempre válido" via factory em vez de validação opcional, introduzir Value
Objects para os ids (hoje `string` crua circula por todo lado), formalizar a interface de
Repository, e reorganizar pastas para que a separação domínio/aplicação/infraestrutura/UI fique
visível na estrutura, não só na disciplina de imports.

A recomendação central: **DDD funcional, não DDD orientado a objetos clássico.** O modelo
precisa continuar serializável como JSON puro (as arquiteturas vêm de arquivos estáticos e de
`import()` dinâmico), então classes ricas com comportamento encapsulado seriam hostis ao design
atual. Entidades como dados imutáveis + serviços de domínio como funções puras é o estilo certo
aqui — e é exatamente o que o código já faz.

---

## 2. O domínio e a Linguagem Ubíqua

O domínio do ArchViz **não é "arquitetura AWS"** — é **"navegação e inspeção de modelos de
arquitetura em camadas C4"**. AWS é um detalhe do subdomínio de apresentação (ícones, boundary,
grupos de rede); o núcleo é agnóstico (o dataset `webapp` de frontend React prova isso).

Glossário — estes termos já existem no código e devem ser usados de forma consistente em
código, docs, commits e conversas (essa é a Linguagem Ubíqua):

| Termo | Significado | Onde vive hoje |
|---|---|---|
| **ArchModel** | O agregado completo: nós + relações + grupos + metadados de boundary | `types.ts` |
| **ArchNode** | Um elemento arquitetural em qualquer nível C4; lista plana, hierarquia via `parentId` | `types.ts` |
| **C4Level** | `context` / `container` / `component` — a camada de zoom conceitual | `types.ts` |
| **Drill-down** | Navegar para dentro de um nó = filtrar por `parentId` | `getChildren`, `handleDrillInto` |
| **View** | O conjunto de nós/relações visíveis num dado `currentParentId` — computado, nunca armazenado | `ArchVizApp` |
| **Relation / RelationKind** | Aresta tipada (`sync` / `async-event` / `compensation`) entre dois nós | `types.ts`, `relation-style.ts` |
| **Rollup** | Relação cujos endpoints não estão visíveis "sobe" ao ancestral visível mais próximo | `getRelationsForViewWithRollup` |
| **Aggregated relation** | Várias relações que rolam para o mesmo par (source, target) viram uma aresta `aggregated` | `model.ts` |
| **Boundary** | A caixa "AWS Cloud" (ou override customizado) desenhada na view de containers | `types.ts`, `ArchitectureGraph` |
| **AwsGroup** | Caixa de fronteira de rede (region/VPC/AZ/subnet), aninhável via `parentGroupId` | `groups.ts` |
| **Data source** | Origem registrada de um `ArchModel` (JSON ou bundle OKF) | `data-sources.ts` |
| **OKF bundle** | Diretório de markdown+frontmatter importado (nunca exportado) para `ArchModel` | `okf-import.ts` |
| **Path trace** | BFS upstream/downstream sobre as relações visíveis pós-rollup | `tracePath` |

**Ação recomendada:** nenhum rename grande é necessário — a linguagem já é boa. O único atrito
é `src/lib/` misturar domínio (`model.ts`, `types.ts`) com infraestrutura (`okf-import.ts`) e
apresentação (`layout.ts`, `relation-style.ts`, `aws-icons.ts`) sob o mesmo teto sem distinção.
A seção 5 propõe a reorganização.

---

## 3. Design estratégico: subdomínios e Bounded Contexts

### 3.1 Classificação dos subdomínios

| Subdomínio | Tipo | Justificativa |
|---|---|---|
| **Modelagem C4** (modelo flat, drill-down, rollup, trace, invariantes) | **Core domain** | É o diferencial do produto: qualquer um renderiza caixas; a semântica de camadas + rollup + validação é o valor único |
| **Aquisição de dados** (registry, import OKF, validação na fronteira) | Supporting | Necessário e específico, mas serve o core; é onde novos formatos entram |
| **Renderização do grafo** (X6, layout topológico, detour lanes, ícones AWS, grupos visuais) | Supporting | Complexo e cheio de conhecimento tácito (ver CLAUDE.md), mas substituível em tese por outra lib de grafo sem mudar o core |
| **Navegação/deep-link** (URL como estado, search, path mode) | Supporting | Orquestração; não contém regra de negócio própria |
| **Wiki OKF** (renderizar markdown cru do bundle) | Generic | Renderização de markdown é commodity (`marked`); o único acoplamento ao domínio é "qual página está em foco" |

### 3.2 Bounded Contexts e o Context Map

Quatro contextos, com os relacionamentos abaixo:

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│  Aquisição de Dados      │  ACL    │  Modelagem C4 (CORE)          │
│  data-sources.ts         │────────▶│  types.ts, model.ts,          │
│  okf-import.ts (ACL)     │ produz  │  validate-model.ts, groups.ts │
│  frontmatter.ts          │ ArchModel│  (funções puras, zero React) │
└─────────────────────────┘ validado └──────────────┬───────────────┘
                                                    │ conformist
                                                    │ (consome o modelo como está)
        ┌───────────────────────────┬───────────────┴────────────────┐
        ▼                           ▼                                ▼
┌────────────────┐        ┌──────────────────────┐        ┌──────────────────┐
│ Navegação (App)│        │ Renderização (X6)     │        │ Wiki OKF          │
│ ArchVizApp     │───────▶│ ArchitectureGraph,    │        │ OkfWikiViewer,    │
│ URL = estado   │  props │ layout.ts, aws-icons  │        │ SidePanel         │
└────────────────┘        └──────────────────────┘        └──────────────────┘
```

Relacionamentos, no vocabulário do DDD:

- **Aquisição → Modelagem: Anti-Corruption Layer.** `importOkfBundle` traduz convenções OKF
  (links em `index.md`, seção `# Relations` com `{kind: ...}`, `# Schema`, frontmatter) para o
  modelo interno. O contrato é reforçado por `validateArchModel` em **toda** entrada — nenhum
  `ArchModel` chega ao core sem passar pela validação. Isso já está certo; a seção 4.1 propõe
  torná-lo inescapável no sistema de tipos.
- **Modelagem → Renderização/Navegação: Conformist.** Os contextos downstream consomem
  `ArchModel` como está, sem tradução. Correto para o tamanho do projeto — uma ACL aqui seria
  cerimônia sem benefício.
- **Renderização é um contexto de verdade, não "só UI".** `ArchitectureGraph.tsx` (569 linhas)
  carrega um acervo de regras não óbvias (resetCells vs. clearCells, guards de `zoomToFit`,
  detour lanes, zIndex de arestas, `refX`/`refY`, `textWrap.height`) documentadas no CLAUDE.md.
  Tratá-lo como bounded context próprio significa: **conhecimento de X6 não vaza para fora dele,
  e conhecimento de domínio não entra nele** além do que chega por props. Hoje isso já é quase
  verdade — `ArchitectureGraph` recebe `nodes`/`relations` prontos e um callback `isDrillable`,
  em vez de receber o `ArchModel` inteiro. Manter assim.
- **Wiki OKF compartilha só um conceito com o core:** o "foco" (nó selecionado → container →
  raiz), derivado em `ArchVizApp` (`wikiEntryPath`). O acoplamento por convenção `<id>.md` é
  um **Published Language** informal entre o bundle e o viewer — vale documentar como contrato.

---

## 4. Design tático: mapeamento padrão a padrão

### 4.1 Aggregate: `ArchModel` como raiz de agregado

`ArchModel` é o agregado, e o design atual acerta a decisão mais importante: **a consistência é
do agregado inteiro, não de nós individuais**. As invariantes são inerentemente globais:

- Todo `parentId` / `groupId` / endpoint de relação aponta para algo que existe (sem dangling refs).
- Ids únicos no agregado.
- Sem ciclos em `parentId`.
- Aninhamento C4 correto (component dentro de container dentro de context).

Hoje isso vive em `validateArchModel`, chamado por disciplina em cada `load()` de
`DATA_SOURCES`. O gap clássico: **nada no sistema de tipos impede alguém de construir/usar um
`ArchModel` que nunca passou pela validação**. A correção DDD é o padrão *always-valid
aggregate* via factory + branded type:

```ts
// domain/arch-model.ts
declare const validated: unique symbol;
export type ValidatedArchModel = ArchModel & { readonly [validated]: true };

/** Única porta de entrada para o domínio: valida e "sela" o modelo. */
export function createArchModel(raw: ArchModel): ValidatedArchModel {
  return validateArchModel(raw) as ValidatedArchModel;
}
```

Aí `getChildren`, `getRelationsForViewWithRollup`, `tracePath` etc. passam a aceitar
`ValidatedArchModel`, e o compilador força todo dado externo a passar pela factory. Custo:
quase zero (é só assinatura). Benefício: a invariante "modelo malformado rejeita em vez de
renderizar grafo incompleto" — hoje garantida por convenção — vira garantia estática.

**Importante:** o agregado deve continuar sendo **dado imutável, não classe**. Os modelos vêm
de `import()` de JSON e de parsing de markdown; qualquer desenho com métodos/prototypes exigiria
uma etapa de "hidratação" que não paga o próprio custo num app read-only.

### 4.2 Entidades

`ArchNode`, `ArchRelation` e `AwsGroup` são entidades: têm identidade (`id`) e são referenciadas
por id, nunca por objeto aninhado. A escolha da **lista plana com referências por id** (em vez
de árvore aninhada) é, em termos DDD, modelar a hierarquia como *associação dentro do agregado*
— e é o que torna `getChildren`, rollup e breadcrumb triviais. Não mudar.

Único refinamento com bom custo-benefício — **branded ids** para impedir cruzamento de espaços
de identidade (hoje `node.id`, `group.id` e `relation.id` são todos `string`, e o código já
precisa se defender disso manualmente — ver `structuralIds` em `ArchitectureGraph`, que existe
exatamente porque ids de grupo *não* são ids de nó):

```ts
export type NodeId = string & { readonly __brand: "NodeId" };
export type GroupId = string & { readonly __brand: "GroupId" };
export type RelationId = string & { readonly __brand: "RelationId" };
```

Com isso, `ArchNode.groupId: GroupId | null` e `ArchRelation.source: NodeId` deixam o
compilador pegar o bug que o `structuralIds` set corrige em runtime. Ressalva: brands em dados
que chegam de JSON exigem cast na fronteira — que é justamente a factory da seção 4.1, então o
cast acontece num único lugar auditável.

### 4.3 Value Objects

Já existem, sem o nome:

| Value Object | Hoje | Observação |
|---|---|---|
| `C4Level` | union de literais | Perfeito como está — VOs de enumeração em TS são unions, não classes |
| `RelationKind` + resolução do legado `async` | `resolveRelationKind` em `relation-style.ts` | **Este é regra de domínio, não de estilo** — decide a semântica da relação, e `model.ts` já o importa (inversão suspeita: domínio importando de um módulo de apresentação). Mover a resolução para o domínio; `relation-style.ts` fica só com cor/dash/legenda |
| `AwsResourceConfig` | interface | OK — imutável por disciplina; `Readonly<>` seria o endurecimento barato |
| `{ label, url }` de links | inline em `ArchNode` | Nomear (`ExternalLink`) quando/se for reusado |
| Boundary override | `{ label, icon? } \| false` | OK; a tríade "default / custom / disabled" está bem expressa |

A mudança concreta desta seção: **mover `resolveRelationKind` de `relation-style.ts` para o
domínio** (junto de `model.ts`). É a única violação real de direção de dependência no código
atual — pequena, mas é exatamente o tipo de coisa que o DDD manda corrigir cedo, antes que o
módulo de estilo acumule mais regras semânticas.

### 4.4 Domain Services

`src/lib/model.ts` inteiro: `getChildren`, `findNode`, `hasChildren`, `getBreadcrumb`,
`getRelationsForView(WithRollup)`, `tracePath`. Todos puros, todos operando sobre o agregado,
nenhum com estado. **É a parte mais DDD-correta do projeto** — a lógica de negócio (o que é
"visível", o que "rola para cima", o que é "alcançável") não vaza para componentes React.

`computeGroupBoxes` (`groups.ts`) e `computeLayeredPositions` (`layout.ts`) são serviços do
contexto de *Renderização*, não do core — operam sobre posições em pixels. A separação de pastas
(seção 5) deve refletir isso.

Regra a preservar (vale escrever no CLAUDE.md quando a refatoração acontecer): **módulos de
domínio não importam de React, X6, Next, `layout.ts` ou `relation-style.ts`.** Hoje a única
exceção é o `resolveRelationKind` da seção 4.3.

### 4.5 Repository

`DATA_SOURCES` já é um repository de agregados somente-leitura — coleção nomeada, `load()`
assíncrono, fronteira de validação embutida. Formalização proposta:

```ts
// domain/ports.ts — porta definida pelo domínio (hexagonal / ports & adapters)
export interface ArchModelRepository {
  list(): DataSourceInfo[];                       // { id, label, hasWiki }
  load(id: string): Promise<ValidatedArchModel>;  // rejeita se malformado
}
```

`data-sources.ts` vira a implementação (adapter) que conhece `import()` dinâmico, OKF e
validação. Ganhos reais, não teóricos: (a) `ArchVizApp` para de importar a constante concreta e
passa a depender da interface — testável com um repositório fake sem mock de `import()`;
(b) `okfBasePath` deixa de vazar como campo público e vira o derivado `hasWiki`, escondendo da
UI o *como* do wiki. A futura origem "API de backend" (pós-MVP) entra como segundo adapter sem
tocar no domínio.

O design de `importOkfBundle(basePath, io?: OkfIo)` **já é ports & adapters** — `OkfIo` é uma
porta com dois adapters (fetch no browser, fs no CLI de validação). Esse padrão existente é o
precedente interno a citar quando alguém perguntar "por que interfaces?".

### 4.6 Factory

`importOkfBundle` é uma factory de agregado com ACL embutida. Com a seção 4.1, a composição
fica explícita: *parse OKF → `ArchModel` cru → `createArchModel` → `ValidatedArchModel`*. O
mesmo para o caminho JSON. A factory `createArchModel` vira o único ponto do sistema onde um
modelo "nasce".

### 4.7 Application Layer

`ArchVizApp.tsx` é a camada de aplicação: orquestra repositório, deriva a view chamando
serviços de domínio, e mantém o estado de navegação. A decisão **"estado de navegação vive na
URL, não em `useState`"** é uma forma disciplinada do que o DDD chama de manter a camada de
aplicação fina: não há estado duplicado a ressincronizar, e cada interação é um "comando" que
vira um patch de URL via `updateUrl`. Os handlers (`handleDrillInto`, `handleNavigate`,
`handleSelectNode`, `handleSelectSource`, `handleTabChange`) já são, na prática, os *use cases*
do sistema. Não é necessário extrair "command handlers" formais — seria cerimônia pura num app
desta escala; basta manter a regra já documentada no CLAUDE.md de que toda navegação passa por
`updateUrl`.

### 4.8 O que deliberadamente NÃO se aplica (no MVP)

- **Domain Events** — só fazem sentido quando houver *escrita* (edição de arquitetura). Num
  visualizador read-only não há mudança de estado de domínio a publicar. Se/quando a edição
  chegar, eventos (`NodeAdded`, `RelationRetyped`…) serão o mecanismo natural para undo/redo e
  persistência — projetar isso hoje é especulação.
- **CQRS / Event Sourcing** — mesmo motivo. O app inteiro já é, na prática, "só o lado Q".
- **Camada de classes de entidade** — quebraria a serializabilidade JSON e o estilo funcional
  que sustenta as funções puras de `model.ts`.
- **Specification pattern formal** — as regras de `validate-model.ts` como funções simples são
  mais legíveis que specs combináveis; só reavaliar se surgirem regras configuráveis por dataset.

---

## 5. Estrutura de pastas proposta

Reorganização que torna as fronteiras visíveis. É **movimentação + ajuste de imports**, sem
reescrita de lógica:

```
src/
  domain/                       # CORE — proibido importar de react/x6/next/infrastructure/ui
    types.ts                    # ArchModel, ArchNode, ArchRelation, AwsGroup, NodeId…
    arch-model.ts               # createArchModel (factory) + ValidatedArchModel
    model.ts                    # getChildren, rollup, tracePath, breadcrumb…
    relation-kind.ts            # resolveRelationKind (movido de relation-style.ts)
    validate-model.ts           # invariantes do agregado
    ports.ts                    # ArchModelRepository, OkfIo
  infrastructure/               # adapters das portas
    data-sources.ts             # implementação do ArchModelRepository
    okf-import.ts               # ACL: OKF → ArchModel (usa createArchModel)
    frontmatter.ts
    paths.ts
  rendering/                    # bounded context de renderização (conhecimento X6/pixel)
    layout.ts                   # computeLayeredPositions
    group-boxes.ts              # computeGroupBoxes (hoje groups.ts)
    relation-style.ts           # cor/dash/legenda por kind (sem resolveRelationKind)
    aws-icons.ts
  components/                   # React (application layer + UI)
    ArchVizApp.tsx              # application layer
    ArchitectureGraph.tsx       # única fronteira com X6
    …demais componentes
```

Notas:

- `scripts/validate-model.ts` continua funcionando: só importa domínio + o adapter fs de
  `OkfIo` — a restrição existente "nada browser-only fora do `browserIo`" é exatamente a regra
  de pureza da pasta `domain/`/da ACL, agora com endereço.
- A regra de dependência (`domain` não importa de mais nada; `rendering` e `infrastructure`
  importam só de `domain`; `components` importa de todos) pode ser aplicada com a regra
  `import/no-restricted-paths` no `eslint.config.mjs` — barata e evita regressão silenciosa.
- Alternativa mínima, se mover arquivos parecer prematuro: manter `src/lib/` e aplicar só a
  regra de lint por convenção de nome. A estrutura acima é preferível porque o custo é um
  refactor mecânico de ~20 arquivos e o benefício é permanente.

---

## 6. Roadmap incremental

Cada fase entrega valor sozinha e pode parar sem deixar o código pior. Ordenadas por
custo-benefício:

| Fase | Escopo | Esforço | Risco |
|---|---|---|---|
| **0. Linguagem** | Adotar o glossário da seção 2 no CLAUDE.md; documentar o contrato `<id>.md` do wiki como Published Language | Trivial | Nenhum |
| **1. Corrigir a direção de dependência** | Mover `resolveRelationKind` para o domínio; `relation-style.ts` só estilo | Pequeno | Baixo (refactor mecânico, `npx tsc --noEmit` cobre) |
| **2. Agregado sempre-válido** | `createArchModel` + `ValidatedArchModel`; serviços de domínio passam a exigir o tipo selado; `DATA_SOURCES` usa a factory | Pequeno | Baixo |
| **3. Branded ids** | `NodeId`/`GroupId`/`RelationId`; cast único dentro da factory | Médio (toca muitas assinaturas) | Baixo, mas ruidoso no diff |
| **4. Ports & adapters** | Interface `ArchModelRepository`; `ArchVizApp` depende da interface; `okfBasePath` vira `hasWiki` | Pequeno | Baixo |
| **5. Estrutura de pastas** | Reorganização da seção 5 + regra de lint de fronteira | Médio | Baixo (mudança só de imports) |
| **6. (pós-MVP, se houver edição)** | Domain events, comandos de mutação, invariantes em escrita | Grande | Só iniciar com o requisito real na mão |

Fases 1–2 são o melhor retorno: pequenas, e transformam as duas garantias mais importantes do
sistema (semântica de relação é regra de domínio; modelo inválido não circula) de convenção em
tipo.

---

## 7. Riscos e anti-padrões a evitar

1. **Over-engineering é o risco nº 1.** O projeto tem ~2.400 linhas de TS. DDD tático completo
   (classes, eventos, unit of work) custaria mais que o domínio inteiro. A régua: só adotar um
   padrão quando ele **substitui** uma defesa manual existente (ex.: branded ids substituem o
   set `structuralIds`; a factory substitui a disciplina "lembre de chamar `validateArchModel`").
2. **Não quebrar as restrições operacionais do CLAUDE.md** durante a reorganização: nada de
   browser-API no caminho compartilhado com o CLI (`okf-import.ts`), manter `resetCells`, manter
   os guards de `zoomToFit`, manter navegação via `updateUrl`/URL sem `useState` espelhado.
   Nenhuma proposta deste documento conflita com elas — a fase 5 apenas as reendereça.
3. **Não "enriquecer" entidades com métodos.** A serialização JSON e o estilo funcional são
   fundação, não dívida.
4. **Não criar uma ACL entre domínio e renderização.** O relacionamento Conformist atual é
   adequado; uma camada de "view models" traduzindo `ArchNode` → "GraphNode" só se pagaria com
   uma segunda engine de renderização no horizonte.
5. **Cuidado com brands em fronteiras de teste/dados.** Todo fixture passará a precisar da
   factory (ou de um helper de teste) — é o comportamento desejado, mas conta como atrito;
   incluir um `test-helpers` quando a suíte de testes nascer.

---

## 8. Conclusão

O ArchViz é um caso raro em que a análise DDD termina majoritariamente em **validação do design
existente**: agregado com invariantes explícitas, serviços de domínio puros, ACL real na
fronteira de import, ports & adapters já praticado em `OkfIo`, camada de aplicação fina com
estado na URL. As lacunas são de *enforcement*, não de modelagem — a validação é opcional para o
compilador, os espaços de id se confundem, e a estrutura de pastas não conta a história que o
código já vive. As fases 1–5 fecham essas lacunas com refactors pequenos e mecânicos; tudo além
disso (eventos, CQRS, edição) deve esperar o requisito de escrita existir de fato.
