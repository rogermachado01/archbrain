# Refinamento Técnico — Mapeando arquitetura de **frontend** no ArchViz

> Status: **passos 1-4 do roadmap implementados** (dataset piloto `frontend-ecommerce.json`,
> boundary configurável, ícones de frontend, bundle OKF `webapp/`). Passo 5 (gerador de
> esqueleto a partir do código do app) segue como proposta. Complementa
> `docs/refinamento-tecnico.md` (foco backend).
> Escopo: usar o sistema **atual** para desenhar e navegar a arquitetura de um frontend
> (telas, componentes, serviços, estado global — Redux/Context/similar), apontando o que
> já funciona sem mudança, o que precisa de pequenas extensões, e as convenções de
> modelagem para o time.

## Por que isso funciona no ArchViz de hoje

O núcleo do app é deliberadamente **agnóstico de AWS**: `ArchModel` é uma lista flat de
nós com `level` (`context | container | component`) e `parentId`; drill-down, layout,
seleção, breadcrumb e busca (futura) operam só sobre isso. O campo `node.aws` é
**opcional** — nós C4 puros já são suportados (o próprio sample backend tem componentes
internos de Lambda sem `aws`). Ou seja: um modelo de frontend é apenas mais um
`ArchModel` registrado em `DATA_SOURCES` (`src/lib/data-sources.ts`), sem tocar no motor
de renderização.

O que **não** é agnóstico (e vira extensão pequena, ver "Gaps"): o boundary "AWS Cloud"
hardcoded, o vocabulário de grupos (`region/vpc/az/subnet`) e o acervo de ícones.

---

## 1. Mapeamento conceitual: C4 backend → C4 frontend

A mesma escada de zoom do backend, traduzida:

| Nível C4 | No backend (hoje) | No frontend (proposta) |
|----------|-------------------|------------------------|
| **Context** | Pessoa, sistema, sistemas externos | Usuário/persona, **o app frontend** como sistema, e os sistemas que ele consome: BFF/API, provedor de auth (Cognito/Auth0), analytics, gateway de pagamento, CDN |
| **Container** | Lambdas, filas, tabelas, API Gateway | As **unidades lógicas do app**: telas/rotas (ou módulos de domínio), stores globais (Redux slices / Contexts / Zustand), camada de serviços (API clients, cache do react-query), design system, e infra do app quando relevante (roteador, service worker, i18n) |
| **Component** | Componentes internos de uma Lambda (handler, validator, repository) | O **interior de uma tela**: componentes principais, hooks custom, seletores, formulários — só os que carregam lógica ou atravessam fronteiras (ver granularidade, §6) |

O drill-down fica natural: Context → duplo clique no app → mapa de telas + stores +
serviços → duplo clique numa tela complexa → seus componentes e hooks.

### Tipos de nó sugeridos (convenção, não código)

Nenhum tipo novo é necessário no código — a distinção é feita por convenção de dados:

- `technology`: `"React 19"`, `"Redux Toolkit"`, `"React Context"`, `"TanStack Query"`,
  `"React Hook Form"` — já existe no `ArchNode` e aparece no sublabel.
- Prefixo de `id` por categoria (facilita leitura de relações e a futura busca):
  `screen-checkout`, `store-cart`, `svc-orders`, `ds-button-lib`, `cmp-payment-form`,
  `hook-use-checkout`.
- `node.aws` reaproveitado como **config genérica de recurso** (ver §3).

---

## 2. Mapeamento de relações: os 3 `RelationKind` no frontend

Os kinds existentes (`src/lib/relation-style.ts`) traduzem direto — a semântica é a mesma
do backend (chamada direta / evento assíncrono / fluxo de reversão):

| Kind | Backend | Frontend |
|------|---------|----------|
| `sync` (cinza sólido) | chamada síncrona | render/composição via props; chamada direta tela → serviço → API; leitura síncrona de contexto |
| `async-event` (azul tracejado) | evento/fila | `dispatch` de action para um slice; subscription/selector (store → tela re-renderiza); pub-sub interno; eventos de analytics; mensagens de websocket/service worker |
| `compensation` (vermelho tracejado) | rollback de saga | **reversão de optimistic update** (dispatch falhou → desfaz o estado); fallback/retry de request; redirect para login em 401 |

Direção importa e deve seguir o fluxo de dados, não o import: `screen-checkout →
store-cart` com kind `async-event` e label `"dispatch addItem"`; a volta `store-cart →
screen-cart` com label `"selector cartItems (re-render)"`. O `label` da relação é o
lugar do nome da action/selector — é o que aparece na edge.

---

## 3. Reaproveitando `node.aws` como config genérica

`AwsResourceConfig` é estruturalmente genérico (`{ resourceType: string, properties:
Record<string, string|number|boolean> }`) e o `DetailsPanel` renderiza qualquer mapa.
Funciona **hoje, sem mudança**, para dar ao painel de detalhes o mesmo valor que dá no
backend:

```json
{
  "id": "store-cart",
  "name": "Cart Slice",
  "level": "container",
  "parentId": "webapp",
  "technology": "Redux Toolkit",
  "icon": "generic-application.svg",
  "aws": {
    "resourceType": "Redux Slice",
    "properties": {
      "actions": "addItem, removeItem, clear, applyCoupon",
      "persistence": "localStorage (redux-persist)",
      "middleware": "listenerMiddleware (analytics)",
      "consumedBy": "screen-cart, screen-checkout, Header"
    }
  }
}
```

Exemplos de `resourceType` frontend: `Redux Slice`, `React Context`, `API Client`,
`Route/Screen`, `Custom Hook`, `Design System Package`, `Service Worker`.

**Ressalva:** o campo se chama `aws`, o que é semanticamente estranho para frontend.
Recomendação: conviver com isso no MVP (é só um nome de chave no JSON) e registrar como
dívida um rename futuro para `resource` com alias retrocompatível — esforço P, mas toca
`types.ts`, `DetailsPanel`, `okf-import.ts` e todos os datasets; não vale bloquear a
adoção por isso.

---

## 4. Gaps do sistema atual e extensões propostas

### 4.1 Boundary "AWS Cloud" hardcoded — extensão **P** (a única realmente necessária)

O box tracejado "AWS Cloud" é desenhado sempre que **todos** os nós visíveis são
`level: "container"` (`ArchitectureGraph.tsx:232`, label e ícone fixos nas linhas
~95–124). Num dataset frontend, a view de telas/stores ganharia um box "AWS Cloud"
incorreto.

Proposta: `ArchModel.boundary?: { label: string; icon?: string } | false`:

- ausente → comportamento atual ("AWS Cloud" + `aws-cloud-badge.svg`), zero impacto nos
  datasets existentes;
- objeto → mesmo box com label/ícone custom — frontend usaria
  `{ "label": "Browser — Loja Web (SPA)", "icon": "generic-application.svg" }`;
- `false` → não desenhar boundary.

Toca: `types.ts` (campo novo), `ArchitectureGraph.tsx` (ler do prop em vez das
constantes), `page.tsx` (repassar `archModel.boundary`). O gating (todos visíveis são
container) e o cálculo de altura com detour lane não mudam.

### 4.2 Ícones para conceitos de frontend — extensão **P**

`node.icon` é um filename resolvido como `/aws-icons/<file>`
(`ArchitectureGraph.tsx:326`). Hoje os únicos ícones não-AWS são `user.svg` e
`generic-application.svg` — suficientes para começar (usuário + tudo-o-resto), mas um
mapa onde toda tela, store e serviço usa o mesmo ícone perde legibilidade.

Proposta: adicionar ~6 ícones autorais genéricos em `public/aws-icons/` (o path já
resolve; não precisa generalizar): `fe-screen.svg`, `fe-store.svg`, `fe-service.svg`,
`fe-component.svg`, `fe-hook.svg`, `fe-design-system.svg` — estilo neutro, mesma grade
48px dos ícones AWS. **Não** recolorir/derivar dos ícones oficiais AWS (guideline de uso
proíbe modificação); estes são desenhos próprios, sem restrição. Não precisam entrar no
`aws-icon-manifest.json` (o manifest existe para lookup por nome de serviço AWS via
`findAwsIcon`; ícones frontend são referenciados por filename direto, como os group
badges já são).

Sistemas externos que **são** AWS continuam usando os ícones oficiais normalmente:
Cognito, API Gateway, CloudFront, Amplify — via `findAwsIcon("Amazon Cognito")` etc.

### 4.3 Grupos (`AwsGroupKind`) — usar? **Opcional, extensão M se quiser**

`groups` é opcional e o vocabulário atual (`region/vpc/az/subnet`) não se aplica a
frontend — a recomendação de curto prazo é **não usar grupos** nos datasets frontend
(tudo continua funcionando; o gating de grupos já reduz ao comportamento sem grupos).

Se o time sentir falta de agrupamento visual (ex.: separar camadas "Telas" / "Estado" /
"Serviços", ou agrupar telas por domínio), a extensão é adicionar kinds genéricos
(`"layer"`, `"domain"`) ao `AwsGroupKind` + entradas no `GROUP_STYLE` do
`ArchitectureGraph` (estilo tracejado neutro, sem ícone, como o de availability-zone).
`computeGroupBoxes` é agnóstico de kind e não muda. Vale lembrar a limitação documentada:
o layout é group-agnóstico — escolher `groupId` de membros que caem em camadas adjacentes,
senão o box pode sobrepor vizinhos.

### 4.4 Fallback de ícone no import OKF

`okf-import.ts` usa `findAwsIcon(frontmatter.type)` como fallback — tipos frontend
(`type: Redux Slice`) não vão resolver contra o manifest AWS. Não é bug: basta a
convenção de que **bundles frontend sempre declaram `icon:` explícito** (mesma regra já
existente para Person/external-system). Documentar no bundle de exemplo.

---

## 5. Exemplo de modelagem — dataset piloto

Criar `src/data/frontend-ecommerce.json` espelhando o domínio do sample backend (a loja
e-commerce), registrado em `DATA_SOURCES` como `"Loja Web — Frontend (JSON)"`. Esqueleto:

**Context** — `Cliente` (Person, `user.svg`) → `Loja Web (SPA)` → externos:
`API E-commerce` (`external: true`, ícone API Gateway — é o mesmo sistema raiz do modelo
backend, ver §7), `Amazon Cognito` (auth), `Analytics`.

**Container** (drill na SPA):

| Nó | Categoria | Relações principais |
|----|-----------|---------------------|
| `screen-catalog` | Tela | `sync → svc-catalog` ("busca produtos") |
| `screen-cart` | Tela | `async-event ← store-cart` ("selector cartItems") |
| `screen-checkout` | Tela | `async-event → store-cart` ("dispatch checkout"); `sync → svc-orders`; `compensation → store-cart` ("rollback optimistic update") |
| `store-cart` | Estado global | — |
| `store-session` | Estado global | `sync → Cognito` ("refresh token") |
| `svc-catalog`, `svc-orders` | Camada de serviço | `sync → API E-commerce` |
| `ds-components` | Design system | `sync ← screen-*` ("compõe UI") |

**Component** (drill em `screen-checkout`): `cmp-checkout-form`, `cmp-payment-section`,
`hook-use-checkout` (orquestra dispatch + chamada de serviço), `sel-cart-total`
(seletor). Relações internas: form `sync→` hook, hook `async-event→` store (via
fronteira — só aparece dentro da tela até o roll-up do refinamento backend, item 7,
existir; mesma limitação já documentada do MVP).

Todos os nós com `aws.resourceType`/`properties` preenchidos como no §3, para o
`DetailsPanel` ter conteúdo em qualquer seleção.

**Variante OKF:** o mesmo modelo como bundle em `public/okf-bundles/webapp/` habilita a
view Wiki — um `.md` por tela/store com decisões de design, prints, contratos de props —
seguindo exatamente as convenções de `okf-import.ts` (`# Relations` com `{kind: ...}`,
`# Schema` para as properties, `icon:` explícito). Recomendado como segundo passo, depois
que a modelagem estabilizar no JSON.

---

## 6. Convenções de modelagem para o time

- **Granularidade — a regra de ouro:** mapear o que **atravessa fronteiras**
  (tela ↔ store ↔ serviço ↔ API ↔ sistema externo). Não mapear componentes puramente
  visuais (botão, card, layout) — isso é papel do Storybook, não do mapa de arquitetura.
  Nível `component` só para telas/módulos complexos onde o time realmente precisa do zoom.
- **Um nó de tela por rota (ou por grupo de rotas do mesmo domínio)** — se o app tem 40
  rotas, agrupar por domínio em ~8–12 nós de container e drilar.
- **Estado global sempre vira nó próprio** (slice/context/store), nunca fica implícito —
  é onde moram os acoplamentos que o time mais precisa enxergar. Relações de
  `dispatch` (entrada) e `selector` (saída) explícitas, com o nome da action/selector no
  `label`.
- **Kind honesto:** `sync` só para chamada direta; tudo que passa por store/evento é
  `async-event`; todo fluxo de desfazer/fallback é `compensation`. É o que faz o legend
  e o futuro filtro por kind (highlight, refinamento backend item 8) serem úteis.
- **`external: true`** para tudo que não é código do time (API, auth, analytics).
- **Ownership** (refinamento backend, item 9): quando implementado, `owner` por squad de
  feature — no frontend o dono natural é a squad dona da tela/domínio, não um "time de
  frontend" genérico.

---

## 7. Frontend + backend: dois modelos, um sistema

Os dois mapas se encontram no nó "API E-commerce": ele é **externo** no modelo frontend
e é a **raiz** do modelo backend. Convenção imediata (sem código): usar o mesmo `id` e
`name` nos dois datasets e citar no `description` de cada um qual data source contém o
outro lado.

Extensão futura (registrar como ideia, não escopo): `node.crossSourceRef?: { sourceId,
nodeId }` — clicar no sistema externo oferece "abrir no modelo backend", trocando o
data source e navegando (viável hoje via os estados de `page.tsx`; com deep links —
refinamento backend item 2 — vira um link comum).

---

## 8. Sinergia com o refinamento backend

Todos os itens de `docs/refinamento-tecnico.md` beneficiam o caso frontend sem trabalho
extra — dois merecem destaque:

- **Highlight de caminho (item 8):** no frontend responde a pergunta mais cara do dia a
  dia com estado global — *"o que re-renderiza quando esse slice muda?"* (downstream do
  store) e *"quem consegue disparar essa action?"* (upstream).
- **Roll-up de relações (item 7):** essencial aqui — a relação `hook-use-checkout →
  store-cart` (component → container) hoje só aparece dentro da tela; com roll-up, a
  view de containers mostra `screen-checkout → store-cart` agregada.
- **Importador (item 6), versão frontend:** o análogo de "Terraform → ArchModel" é um
  script que varre o código do app — rotas do router, slices registrados no store,
  módulos de `src/services/` — e gera o esqueleto do `ArchModel` com overrides manuais
  por cima. Mesma arquitetura de duas fases (gerador offline + drift check em CI:
  "existe rota nova não mapeada").

---

## 9. Roadmap de adoção

| Passo | O quê | Código? |
|-------|-------|---------|
| **1** | Criar `src/data/frontend-ecommerce.json` piloto (§5) e registrar em `DATA_SOURCES` — validar a modelagem com o time navegando de verdade | Só dados |
| **2** | Extensão do boundary configurável (§4.1) — remove o "AWS Cloud" indevido | P |
| **3** | Ícones frontend (§4.2) e, se sentir falta, grupos genéricos (§4.3) | P / M |
| **4** | Migrar o piloto para bundle OKF com docs por tela/store (view Wiki) | Só dados |
| **5** | Gerador de esqueleto a partir do código do app + drift check (§8) | G |

O passo 1 não depende de nenhuma mudança de código além do registro da fonte — é o teste
mais barato possível de que a modelagem C4-frontend funciona para o time.
