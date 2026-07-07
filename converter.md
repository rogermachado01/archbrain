# converter.md — blog → blog2 (alinhamento com webapp)

Registro das diferenças estruturais entre `public/okf-bundles/blog/` (bundle
gerado automaticamente pelo `scripts/okf-scan`) e `public/okf-bundles/webapp/`
(bundle de referência, escrito à mão), e do que foi ajustado em
`public/okf-bundles/blog2/` — cópia do `blog` com esses ajustes — para deixar a
navegação/visualização mais próxima da do `webapp`, **sem alterar a árvore de
arquivos** (mesmos arquivos, mesmos diretórios, mesmo `parentId`/hierarquia do
`blog` original). Cada arquivo de `blog2` foi lido e comparado individualmente
contra o padrão do `webapp` antes de decidir o que ajustar.

## Contexto

`blog` foi produzido pelo pipeline de scan (`scripts/okf-scan/`) apontado para
o repositório real `template-marketing-webapp-nextjs` (ver
`.scan-manifest.json` — não é um artefato do formato OKF em si, é o cache
interno da ferramenta de scan; foi copiado para `blog2` sem alterações porque
não é lido pelo importer, apenas mantido por completude do "copiar tudo"). O
scan extrai fatos objetivos do código (imports → relações, arquivo → id,
`owner` do CODEOWNERS, etc.) mas não tem conhecimento do domínio do produto —
por isso ele nunca modela atores humanos ou sistemas externos, só o que existe
como código React. O `webapp`, por outro lado, foi escrito manualmente
pensando em como um dev navegaria a arquitetura, e por isso já nasce com esses
elementos.

## Diferenças significativas encontradas

### 1. Nenhum ator/sistema externo no nível Context (a mais importante)

`blog/index.md` listava **um único Concept** (a própria aplicação frontend).
`webapp/index.md` lista 4: a pessoa (`Cliente`), 3 sistemas externos (API,
Cognito, Analytics) e o próprio sistema. Sem atores de contexto, a view raiz
do `blog` é uma caixa única — não comunica *quem* usa o site nem *de onde*
vem o conteúdo, o que é o primeiro nível que um dev olha para se orientar.

Pelo código já presente no bundle (todo o padrão `ctf-*`, `contentful-context`,
hooks `*.generated` de GraphQL, e a própria descrição do container raiz —
"typically sits in front of a CMS or backend API") dá para inferir com
segurança dois elementos que faltavam:

- **Visitante** (Person, `level: context`, `external: true`) — quem navega o
  site. Arquivo novo: `blog2/visitante.md`, com uma relação de volta para o
  app (`— Usa no navegador {kind: sync}`), no mesmo padrão de
  `webapp/customer.md`.
- **Contentful CMS** (External System, `level: context`, `external: true`) —
  o backend de conteúdo que todos os componentes `ctf-*`/`*.generated`
  consultam via GraphQL. Arquivo novo: `blog2/contentful-cms.md`, no mesmo
  padrão de `webapp/api-ecommerce.md`/`cognito.md`/`analytics.md` (só
  descrição, sem `# Relations` próprias — a relação é declarada do lado do
  container, ver item abaixo).

`blog2/index.md` agora lista os 3 concepts (Visitante, Contentful CMS,
Template Marketing Webapp Nextjs), e `blog2/template-marketing-webapp-nextjs.md`
ganhou uma seção `# Relations` apontando para os dois novos nós — exatamente
o papel que `webapp/webapp-system.md` cumpre para seus 3 sistemas externos.
Isso são **arquivos novos, não uma reestruturação** dos existentes — a
hierarquia de diretórios do `blog` original não mudou.

### 2. Nenhum node tinha `icon` explícito

Em todo o `blog`, nenhum arquivo definia `icon:` no frontmatter. O importer
(`src/lib/okf-import.ts`) cai para `findAwsIcon(type)` quando `icon` está
ausente — e nenhum dos `type`s usados no bundle (`React Component`,
`Next.js Page`, `Shared UI & Utilities`, `Frontend Application`) casa com
nenhum serviço do manifesto de ícones AWS (305 ícones oficiais, ver
`src/data/aws-icon-manifest.json`). Na prática isso significa que **todo nó do
`blog` renderiza sem ícone** — a lacuna visual mais visível comparado ao
`webapp`, que atribui explicitamente um dos 6 ícones `fe-*.svg` (criados
justamente para conceitos de frontend sem ícone AWS, ver CLAUDE.md § "AWS
visual style") a cada um dos seus nodes.

Ajuste em `blog2`: adicionado `icon:` ao frontmatter de cada arquivo, reusando
os mesmos 6 ícones que já existem em `public/aws-icons/` (nenhum ícone novo
foi criado):

| Papel em blog2 | Arquivo(s) | Ícone atribuído |
|---|---|---|
| Rotas Next.js (`[slug].md`, `index-page.md`) | 2 arquivos | `fe-screen.svg` (mesmo usado pelos `screen-*.md` do webapp) |
| Container "Shared Ui" | `shared-ui.md` | `fe-design-system.svg` (mesmo usado por `ds-components.md` no webapp) |
| Todos os componentes React em `shared-ui/*.md` | 47 arquivos | `fe-component.svg` |
| Visitante (novo) | `visitante.md` | `user.svg` |
| Contentful CMS (novo) | `contentful-cms.md` | `generic-application.svg` |

O node raiz `template-marketing-webapp-nextjs.md` (`level: context`, tipo
"Frontend Application") ficou **sem ícone explícito de propósito** — o
mesmo já acontece em `webapp/webapp-system.md` (`level: context`, tipo
"Software System"), que também não define `icon`. Não é uma lacuna do
`blog`, é o mesmo comportamento do bundle de referência: o node raiz de
contexto não carrega ícone próprio em nenhum dos dois bundles.

Não existe, no scan gerado, nenhuma distinção entre "hook", "store", "service"
ou "componente puro" dentro de `shared-ui/*` — a ferramenta de scan classifica
tudo uniformemente como `type: React Component`. O `webapp`, por ser escrito à
mão, diferencia esses papéis com ícones e `technology` próprios
(`fe-hook.svg`, `fe-store.svg`, `fe-service.svg`). Isso é uma limitação da
ferramenta de scan, não do conteúdo em si — **não foi corrigida** caso a caso
(exigiria reclassificar manualmente 47 componentes, o que efetivamente seria
reescrever o bundle, não só ajustá-lo) mas está registrada aqui para quem for
melhorar o `okf-scan` no futuro: ele poderia inferir "Custom Hook" de nomes
`use*.ts`, "Redux Slice"/"Store" de arquivos em pastas `store/`, etc.

### 3. Fronteira (`boundary`) resolvida de forma diferente, mesmo resultado visual pretendido

`blog/index.md` usava `boundary: false` (desliga a caixa "AWS Cloud"
inteiramente — válido, é uma das duas formas suportadas pelo spec). O
`webapp` usa a outra forma suportada, `boundary_label` + `boundary_icon`, para
mostrar uma caixa rotulada "Browser — Loja Web (SPA)" em vez de "AWS Cloud".//
Como o objetivo é "vizualisação similar à do webapp", troquei em `blog2` para
a mesma abordagem: `boundary_label: Browser — Marketing Site (Next.js)` +
`boundary_icon: generic-application.svg`. Isso é uma mudança de conteúdo de
frontmatter, não estrutural.

### 4. `title` genérico no root e `technology`/`description` ausentes

`blog/index.md` tinha `title: "Generated Architecture"` (placeholder do
próprio scan) e nenhum `description`/`okf_version`, enquanto
`webapp/index.md` tem um título de produto (`Loja Web — Frontend`),
descrição, e `okf_version`. Ajustado em `blog2/index.md` para
`title: "Marketing Webapp — Template Contentful"` + descrição + `okf_version`,
mesmo padrão do `webapp`.

Quanto a `technology`: o importer já usa `type` como fallback quando
`technology` está ausente (`okf-import.ts`, linha
`technology: typeof data.technology === "string" ? data.technology : type`),
então a ausência de `technology` explícito no `blog` **não é, na prática, uma
lacuna** — o painel de detalhes já mostra o `type` (ex. "React Component",
"Next.js Page") no lugar. Não precisou de ajuste.

### 5. Cabeçalhos dos `index.md` ("# Concepts" vs "# Containers"/"# Components")

`blog` usa sempre `# Concepts` como cabeçalho dos `index.md` de navegação,
enquanto `webapp` varia o texto conforme o nível (`# Containers` no
`webapp-system/index.md`, `# Components` no `screen-checkout/index.md`).
Confirmado lendo `okf-import.ts` (`visitIndex`) que **o texto do cabeçalho é
puramente cosmético** — o parser só extrai links markdown (`extractLinks`),
ignorando por completo qualquer título de seção. Não é uma lacuna funcional;
não alterei os `index.md` do `blog2` porque o ganho seria só estético e o
pedido foi para não reestruturar arquivos.

### 6. `shared-ui` era um container com 47 filhos próprios — sem equivalente direto no webapp (⚠️ ver item 11, superado)

O container mais próximo em espírito no `webapp` é `ds-components.md`
("Design System") — mas ele é uma **folha** (sem subdiretório próprio, sem
Schema section, ver `webapp/webapp-system/ds-components.md`). Em `blog2`,
`shared-ui.md` era um container de verdade, com 47 componentes React
individuais no subdiretório `shared-ui/`. Isso refletia uma diferença real do
domínio (o design system do e-commerce é tratado como pacote fechado; a UI
compartilhada do template de marketing é o próprio código-fonte do time,
detalhado componente a componente) — inicialmente mantido como estava, por
conta da instrução original de preservar a estrutura de arquivos. Ao contrário
dos outros containers do `webapp` (que têm ~3-8 filhos), este tinha 47 — o
node com a maior "explosão" de filhos do bundle, e a origem direta da
reclamação de legibilidade do usuário (ver item 11: esse container foi depois
dissolvido em 8 containers reais por capacidade de negócio).

### 7. `blog` já tem `ddd_subdomain`/`ddd_context`/`ddd_role` em todo componente — o `webapp` não usa DDD

Cada um dos 47 componentes em `blog/shared-ui/` já vem com metadados DDD
completos (ex. `ddd_subdomain: core`, `ddd_context: Person & Team`,
`ddd_role: Presentational Component`). O `webapp` de referência **não usa
nenhum campo DDD**. Isso não foi "alinhado para baixo" — os campos DDD do
`blog2` foram mantidos como estão, porque são um enriquecimento válido (o
recurso de "Bounded Context" boxes do app, `computeBoundedContextBoxes` em
`src/lib/groups.ts`, só ativa com 2+ valores distintos de `ddd_context`
visíveis — e `blog2/shared-ui/*` tem dezenas de valores distintos, então essas
caixas vão aparecer na view do container `shared-ui`, um efeito visual a mais
que o `webapp` não tem porque nunca usou essa convenção).

### 8. Bug real encontrado: a rota `[slug]` nunca aparecia em nenhum bundle (nem no `blog` original)

Verificando o resultado no navegador (`npm run dev`, fonte `blog2`, drill-down
até `template-marketing-webapp-nextjs`), o container `[Slug]` não aparecia —
só `Index Page` e `Shared Ui` eram renderizados, apesar de
`template-marketing-webapp-nextjs/index.md` listar os 3. Investigando
`src/lib/okf-import.ts`, `visitIndex` extrai links via
`extractLinks`/regex `\[([^\]]+)\]\(([^)]+)\)` sobre o markdown puro do
`index.md`. A linha original era:

```
- [[Slug]]([slug].md) - Next.js Page
```

O texto do link é `[Slug]` (colchetes literais, porque o título da página é
literalmente "[Slug]", sintaxe de rota dinâmica do Next.js) — combinado com
os colchetes do próprio markdown de link isso vira `[[Slug]](...)`, colchetes
duplos que **não casam com a regex** (ela não tem noção de colchetes
aninhados/escapados): a tentativa de match falha silenciosamente em toda a
linha, o link nunca é extraído, e `[slug].md` nunca é buscado — sem nenhum
erro no console, só um node ausente. Confirmado via
`read_network_requests`: a requisição para `.../[slug].md` simplesmente não
acontecia.

Esse bug já existia no `blog` original (não foi introduzido pela cópia) e
provavelmente passou despercebido porque não gera erro, só uma lacuna visual
sutil. Corrigido em `blog2/template-marketing-webapp-nextjs/index.md`
trocando o texto do link para uma forma sem colchetes duplos:

```
- [Slug]([slug].md) - Next.js Page
```

(o `href` continua apontando para o arquivo real `[slug].md` — só o texto
visível do link mudou, de "[Slug]" para "Slug"). Confirmado no navegador após
o ajuste: o node `[slug]` (mantém o título "[Slug]" vindo do frontmatter,
só o link estava quebrado) passou a aparecer normalmente, com ícone
`fe-screen.svg`, ao lado de `Index Page` e `Shared Ui`.

**Vale revisar o `okf-scan`** (ou qualquer autor futuro de bundle) para nunca
gerar texto de link com colchetes literais quando o título de um concept
contiver `[`/`]` — usar um texto alternativo sem colchetes, como foi feito
aqui.

### 9. Clusterização automática por Bounded Context (comportamento inicial, depois desativado — ver item 11)

Como cada um dos 47 componentes de `shared-ui/` já tinha `ddd_context`
definido (ver item 7), ao abrir o container `Shared Ui` no `blog2` o app não
mostrava os 47 componentes soltos — aplicava automaticamente a "Bounded-context
cluster navigation" (`src/lib/clusters.ts`, `computeClusterView`), agrupando-os
em 9 clusters clicáveis (`Navigation & Layout (12)`, `Contentful Content
Rendering (6)`, `Marketing Content Blocks (7)`, etc.), sem exigir nenhum ajuste
manual — consequência direta de já existir `ddd_context` em todo componente.

Na prática, porém, o usuário reportou que essa tela **continuava difícil de
entender**: os nomes dos clusters eram rótulos técnicos (`Contentful Content
Rendering`, `Error Handling`) em vez de capacidades de negócio, e as arestas
entre eles eram relações de import de código ("renders X") em vez de fluxo de
negócio — uma "série de caixas conectadas" sem narrativa clara. Isso levou à
reestruturação do item 11, que dissolve esse único container de 47 filhos em
8 containers reais nomeados por capacidade de negócio. Depois dessa mudança,
os campos `ddd_context` dos 47 componentes foram **removidos** (mantendo
`ddd_subdomain`/`ddd_role`) porque, com o agrupamento já expresso na própria
árvore de diretórios, o `ddd_context` de cada folha passou a repetir o nome do
container que já a contém — clusterizando de novo dentro de cada container
(um cluster único e redundante por capacidade, exigindo um clique a mais para
nada). Ver item 11 para o detalhe completo.

### 10. Relações já existentes foram preservadas sem alteração

Todas as relações componente-a-componente já extraídas pelo scan (imports
reais do código, ex. `ctf-hero-banner` → `ctf-richtext`/`theme`/`page-link`/
`ctf-asset`) foram mantidas como estavam — elas já seguem exatamente o mesmo
formato `{kind: sync}` usado no `webapp` e já refletem o fluxo real de
composição de UI (quem renderiza quem). O único nível em que faltavam
relações era o nível de contexto (item 1), que foi complementado.

### 11. Reestruturação de `shared-ui` em 8 capacidades de negócio (a pedido do usuário, quebra a regra "não reestruturar")

**Motivo:** depois do ajuste inicial (itens 1–10), o usuário testou
`http://localhost:3000/?source=blog2&parent=template-marketing-webapp-nextjs%2Fshared-ui`
e reportou que a tela continuava confusa — "uma série de caixas conectadas"
sem deixar claro o que estava acontecendo. O diagnóstico (ver item 9): as
relações do bundle vêm do scan de imports de código ("renders X", "types Y
fields"), não de regras/fluxos de negócio, e os 47 componentes viviam soltos
sob um único container técnico. Isso é estruturalmente diferente do `webapp`,
onde cada container tem 3-8 filhos e as relações descrevem uma ação de negócio
(`dispatch checkout`, `rollback optimistic update`). Corrigir isso de verdade
exige dois movimentos, e o primeiro deles **exige reestruturar arquivos** —
por isso o usuário foi consultado antes ("faça os ajustes" foi a resposta que
autorizou quebrar a regra original de não mexer na árvore de arquivos, só para
este container específico).

**O que foi feito:**

1. **`shared-ui.md` + `shared-ui/` (47 arquivos) foram removidos** e
   substituídos por **8 containers reais**, cada um com seu próprio
   subdiretório, agrupando os componentes pela mesma taxonomia que já existia
   em `ddd_context` (nenhum componente mudou de grupo — só o grupo virou uma
   pasta de verdade) mas com nomes voltados a negócio, não a implementação:

   | Novo container (arquivo + pasta) | Nome técnico original (`ddd_context`) | Nº de componentes |
   |---|---|---|
   | `nav-layout.md` / `nav-layout/` | Navigation & Layout | 12 |
   | `content-rendering.md` / `content-rendering/` | Contentful Content Rendering | 6 |
   | `content-media.md` / `content-media/` | Contentful Media | 3 |
   | `marketing-blocks.md` / `marketing-blocks/` | Marketing Content Blocks | 7 |
   | `product-catalog.md` / `product-catalog/` | Product Catalog | 3 |
   | `person-team.md` / `person-team/` | Person & Team | 5 |
   | `business-info.md` / `business-info/` | Business Info & Settings | 5 |
   | `error-resilience.md` / `error-resilience/` | Error Handling | 5 |
   | `theme.md` (arquivo único, sem pasta) | Generic Utilities | 1 |

   `theme.md` foi tratado à parte: como é usado por praticamente todas as
   outras 8 capacidades (cores, espaçamento, breakpoints), vira um container-
   folha promovido para o mesmo nível dos outros 8 — o mesmo papel que
   `ds-components.md` cumpre no `webapp` (pacote de design compartilhado, sem
   filhos próprios) — em vez de ficar preso dentro de uma capacidade
   arbitrária qualquer.

2. **Os 46 arquivos de componente foram movidos** (não copiados) para dentro
   do diretório da sua nova capacidade, com os `href` de cada relação em
   `# Relations` reescritos para o novo caminho relativo: mesma pasta → link
   direto (`link.md`); capacidade diferente → sobe um nível e desce na outra
   (`../content-rendering/contentful-context.md`); `theme.md` → `../theme.md`
   em qualquer capacidade (subiu de nível). Feito por script (não manualmente,
   por volume — 46 arquivos, ~90 linhas de relação) e depois verificado com
   `npm run validate`, que pegou dois bugs reais de regex introduzidos por
   mim na primeira passada do script (relações de mesma pasta ganhando um
   prefixo indevido tipo `nav-layout/link.md` a partir de dentro do próprio
   `nav-layout/`; e relações cross-capability faltando o `../` antes do nome
   da pasta) — ambos corrigidos e revalidados antes de seguir.

3. **`[slug].md` e `index-page.md`** (as duas rotas Next.js) tiveram suas
   relações para `shared-ui/ctf-footer.md` etc. reescritas para
   `nav-layout/ctf-footer.md` / `marketing-blocks/ctf-page.generated.md`.

4. **`template-marketing-webapp-nextjs/index.md`** passou a listar os 11
   containers (2 rotas + 8 capacidades + tema) em vez de 3 (2 rotas + 1
   "Shared Ui").

5. **Cada um dos 8 novos containers ganhou um `# Relations` curado**,
   descrevendo em português e em termos de capacidade — não de import de
   código — a dependência mais importante e já evidenciada pelas relações
   internas dos seus próprios componentes (ex.: `marketing-blocks.md` →
   `nav-layout.md`: "Resolve o link de destino do call-to-action"). Essas
   relações não substituem as relações técnicas dos componentes-folha (que
   permanecem intactas) — coexistem como uma segunda aresta entre o mesmo par
   de containers, o mesmo padrão já documentado no CLAUDE.md para o caso
   `payment-service`/`payment-system` da sample-architecture (aresta
   agregada por rollup + aresta direta curada, lado a lado, sem se fundir).

6. **`ddd_context` removido dos 47 componentes-folha** (mantendo
   `ddd_subdomain`/`ddd_role`) — ver item 9 para o motivo (evitar um cluster
   único e redundante dentro de cada container recém-criado).

**Efeito na tela que motivou a reclamação:** abrir
`Template Marketing Webapp Nextjs` agora mostra 11 caixas nomeadas por
capacidade de negócio (não 1 caixa "Shared Ui" que depois clusteriza em 9
nomes técnicos), com um número pequeno de arestas com rótulo de negócio entre
elas. Abrir uma capacidade específica (ex. `Blocos de Marketing`) mostra
diretamente os 7 componentes reais daquela capacidade, sem nenhum cluster
extra no meio — o "hairball" de 47 nós virou, no pior caso, um grafo de 12
nós dentro de uma única capacidade (`Navegação & Layout`), e no melhor caso 1
a 3 nós sem nenhuma aresta cruzada (`Mídia de Conteúdo`).

**O que isso quebra da regra original:** o item 1 desta análise dizia
explicitamente "a estrutura de arquivos não deve ser alterada". Este item 11
é uma exceção deliberada, pedida e confirmada pelo usuário depois de eu expor
o trade-off (a alternativa seria só reescrever rótulos de relação dentro da
estrutura existente, sem resolver o problema de 47 filhos soltos num único
container). Fica registrado aqui para quem comparar `blog2` com `blog`
diretamente no futuro: a partir deste ponto os dois bundles têm árvores de
diretório diferentes dentro de `template-marketing-webapp-nextjs/`.

## Resumo do que foi alterado em `blog2` (vs. cópia crua de `blog`)

- 2 arquivos novos: `visitante.md`, `contentful-cms.md` (atores de contexto
  inferidos do código/descrições existentes).
- `index.md`: title/description/okf_version reais, `boundary_label` +
  `boundary_icon` no lugar de `boundary: false`, 2 novos Concepts na lista.
- `template-marketing-webapp-nextjs.md`: nova seção `# Relations` para os 2
  atores novos.
- `[slug].md`, `index-page.md`: `icon: fe-screen.svg`; relações apontando para
  `shared-ui/...` reescritas para `nav-layout/...` / `marketing-blocks/...`
  (ver item 11).
- `template-marketing-webapp-nextjs/index.md`: corrigido o texto do link para
  `[slug].md` (de `[[Slug]]` para `[Slug]`) — bug real que impedia essa rota de
  aparecer em qualquer bundle, não só no `blog2` (ver item 8) — e reescrito
  para listar os 11 containers pós-reestruturação (ver item 11).
- `.scan-manifest.json`: copiado sem alteração (não é lido pelo importer).
- `src/lib/data-sources.ts`: adicionada entrada `blog2` (`"blog2 (estilo
  webapp)"`) para o bundle ficar navegável na UI, mesmo padrão de registro do
  `blog`.

**Rodada 2 (a pedido do usuário, ver item 11 — quebra a regra "não
reestruturar" só para este container):**

- `shared-ui.md` + `shared-ui/` (47 arquivos) removidos.
- 8 containers novos criados, cada um com frontmatter/descrição/ícone
  (`fe-design-system.svg`) e `# Relations` curado em português:
  `nav-layout.md`, `content-rendering.md`, `content-media.md`,
  `marketing-blocks.md`, `product-catalog.md`, `person-team.md`,
  `business-info.md`, `error-resilience.md` — cada um com seu próprio
  subdiretório e `index.md` listando os componentes movidos para lá.
- `theme.md` promovido de componente (`shared-ui/theme.md`) para container-
  folha (`template-marketing-webapp-nextjs/theme.md`, `level: container`,
  `icon: fe-design-system.svg`, `ddd_*` removido).
- 46 arquivos de componente movidos (não copiados) para o diretório da sua
  capacidade; hrefs de `# Relations` reescritos por script para os novos
  caminhos relativos (mesma capacidade = bare, capacidade diferente =
  `../outra-capacidade/arquivo.md`).
- `ddd_context` removido dos 47 componentes-folha (mantendo
  `ddd_subdomain`/`ddd_role`).

Validado com `npm run validate` (todos os data sources, incluindo `blog2`,
passam) e verificado manualmente no navegador em cada nível de drill-down
(Context → `template-marketing-webapp-nextjs` → cada uma das 8 capacidades)
antes e depois da rodada 2.
