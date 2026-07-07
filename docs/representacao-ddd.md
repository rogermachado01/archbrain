# Representando Domain-Driven Design no ArchViz

> Este documento responde: **como um time de arquitetos e desenvolvedores usa o ArchViz para
> desenhar e documentar um sistema modelado com DDD?** O foco é o DDD como *conteúdo* — bounded
> contexts, agregados, eventos de domínio, linguagem ubíqua — representado nos diagramas C4 e na
> wiki OKF. (Não confundir com `docs/analise-ddd.md`, que analisa o DDD aplicado ao código *desta*
> aplicação.)
>
> Organização: seções 2–7 mapeiam conceito a conceito; a seção 8 traz um exemplo completo de
> bundle; a seção 9 separa o que funciona **hoje, sem mudar código** do que exigiria **extensões
> pequenas** na aplicação; a seção 10 fecha com diretrizes de adoção para o time.

---

## 1. Por que C4 + DDD combinam

C4 e DDD respondem perguntas diferentes e complementares:

- **DDD estratégico** decide *onde ficam as fronteiras* (subdomínios, bounded contexts, context
  map) e *como os times se relacionam* através delas.
- **C4** decide *em que altitude* cada coisa aparece (Context → Container → Component) e é
  exatamente o modelo de zoom que o ArchViz implementa via `level` + `parentId`.

O alinhamento natural, que este documento adota como convenção padrão:

| Nível C4 no ArchViz | Conceito DDD representado |
|---|---|
| **Context** (visão raiz) | O **domínio** e seu context map: cada sistema é um bounded context (ou um agrupamento deles), pessoas e sistemas externos ao redor |
| **Container** (drill 1) | A **decomposição interna de um bounded context**: serviços, filas, bancos — a infraestrutura que materializa o contexto |
| **Component** (drill 2) | Os **building blocks táticos**: agregados, serviços de domínio, camada anticorrupção, handlers de evento |

Cada drill-down do ArchViz vira, assim, uma mudança de conversa: a visão raiz é a reunião de
arquitetura estratégica (fronteiras e contratos entre times); dois cliques abaixo é a conversa
tática de um time só (como o agregado protege suas invariantes).

---

## 2. Subdomínios e bounded contexts

### 2.1 Bounded context = nó de nível `context`

Cada bounded context entra como um `ArchNode` de nível `context` (no OKF, um concept linkado no
`index.md` raiz). Sistemas externos e atores continuam como hoje (`external: true`, ícones
`user.svg` / `generic-application.svg`).

### 2.2 Classificação estratégica via frontmatter

O importador OKF segue o espírito do formato — "produtores podem adicionar chaves arbitrárias;
consumidores toleram campos desconhecidos" — então campos DDD extras no frontmatter **não quebram
nada hoje** e ficam disponíveis para a aplicação renderizar no futuro. Convenção proposta
(chaves *planas*, pois o `parseFrontmatter` da aplicação não lê mapas aninhados):

```yaml
---
title: Contexto de Pedidos
type: Bounded Context
level: context
owner: Squad Pedidos
ddd_subdomain: core          # core | supporting | generic
ddd_context: pedidos          # slug do bounded context (ver 2.3)
---
```

- `ddd_subdomain` registra a classificação estratégica — a informação mais valiosa de um context
  map, porque orienta onde investir engenharia (core) e onde comprar/terceirizar (generic).
- `owner` já é campo suportado e renderizado no painel "Ownership & Links" — em DDD, *um contexto,
  um time dono* é regra de ouro, então preencher `owner` em todo nó de contexto é obrigatório na
  convenção.

### 2.3 Marcando a que contexto cada coisa pertence

Dentro do drill (containers e components), repetir `ddd_context: <slug>` no frontmatter de cada
concept. Hoje isso serve como metadado de documentação (visível no arquivo e na wiki); com a
extensão da seção 9.2, vira agrupamento visual — análogo ao que os `AwsGroup`s já fazem para
region/VPC, mas com semântica de fronteira *linguística* em vez de fronteira de rede.

---

## 3. Context map: as relações estratégicas

O context map é o diagrama DDD mais importante — e é exatamente a visão raiz do ArchViz, desde
que as **arestas carreguem o padrão de relacionamento**. Convenção para a seção `# Relations`
dos bundles:

```markdown
# Relations

- [Contexto de Pagamentos](pagamentos.md) — Cobra pedido {pattern: ohs-pl}
- [Contexto de Catálogo](catalogo.md) — Consulta preço via {pattern: acl}
- [Contexto de Entregas](entregas.md) — PedidoConfirmado {kind: async-event}
```

`{pattern: ...}` é um campo estruturado (mesma sintaxe de brace do `{kind: ...}`, combinável na
mesma relação — `{kind: async-event, pattern: ohs-pl}`) que a ferramenta já entende: a aresta
ganha o sufixo `[ABBREV]` automaticamente e a legenda soma uma linha com o nome completo do
padrão. Valores aceitos (`ContextMapPattern` em `types.ts`) e suas siglas:

| Valor (`pattern:`) | Sigla exibida | Padrão | Quando usar |
|---|---|---|---|
| `partnership` | `[P]` | Partnership | Dois times evoluem juntos, sucesso mútuo |
| `shared-kernel` | `[SK]` | Shared Kernel | Modelo/código compartilhado (usar com parcimônia) |
| `customer-supplier` | `[C/S]` | Customer-Supplier | Downstream é cliente com voz no roadmap do upstream |
| `conformist` | `[CF]` | Conformist | Downstream aceita o modelo do upstream como está |
| `acl` | `[ACL]` | Anti-Corruption Layer | Downstream traduz o modelo do upstream na fronteira |
| `ohs` | `[OHS]` | Open Host Service | Upstream publica um protocolo aberto para muitos consumidores |
| `published-language` | `[PL]` | Published Language | Contrato/esquema publicado |
| `ohs-pl` | `[OHS/PL]` | Open Host Service / Published Language | OHS + PL combinados |

Direção: a aresta aponta **do downstream para o upstream** quando é chamada síncrona (quem
depende → de quem), e **do publicador para o consumidor** quando é evento — mesma semântica que
os diagramas do sample já usam.

Os três `RelationKind`s existentes cobrem bem a dimensão *tática* da integração:

- `sync` — chamada requisição/resposta (REST, gRPC): acoplamento temporal entre contextos.
- `async-event` — **evento de domínio cruzando a fronteira** (ver seção 5).
- `compensation` — transação compensatória de saga (ver seção 6).

---

## 4. Blocos táticos no nível de componente

No drill de componente (dentro de um container), representar os building blocks usando o campo
`aws_resource_type` — que, como o bundle `webapp` já demonstra com `Redux Slice`, funciona para
qualquer taxonomia, não só CloudFormation:

```yaml
---
title: Pedido (Aggregate Root)
type: Aggregate Root
level: component
aws_resource_type: DDD::AggregateRoot
ddd_context: pedidos
---

# Schema

- consistencia: forte
- entidades: Pedido, ItemPedido
- valueObjects: Dinheiro, Endereco, StatusPedido
- invariante: total do pedido = soma dos itens
- invariante2: pedido CONFIRMADO nao aceita novos itens
```

O `# Schema` (bullets `chave: valor`) já é renderizado como tabela de propriedades no
`DetailsPanel` — usá-lo para **invariantes, entidades internas e value objects** transforma o
painel de detalhes num "cartão do agregado" que o time consulta durante o design. Taxonomia
sugerida para `aws_resource_type`:

| Valor | Building block |
|---|---|
| `DDD::AggregateRoot` | Raiz de agregado (fronteira de consistência) |
| `DDD::Entity` | Entidade interna a um agregado (raramente vale um nó próprio — prefira listar no Schema da raiz) |
| `DDD::DomainService` | Serviço de domínio sem estado |
| `DDD::ApplicationService` | Caso de uso / orquestração |
| `DDD::Repository` | Porta de persistência do agregado |
| `DDD::AntiCorruptionLayer` | Tradutor na fronteira com outro contexto |
| `DDD::EventHandler` / `DDD::Policy` | Reação a evento de domínio ("sempre que X, então Y") |
| `DDD::ReadModel` | Projeção de consulta (quando há CQRS) |

Regra de altitude: **entidades e value objects individuais não viram nós** — viram linhas no
`# Schema` e prosa na página wiki do agregado. Nó de componente é para coisas com fronteira
arquitetural (agregado, serviço, ACL, handler); descer além disso transforma o diagrama em
diagrama de classes, que não é o propósito da ferramenta.

O exemplo real do repositório já pratica isso sem o vocabulário: em
`public/okf-bundles/order-system/order-system/order-processor/`, o `validator.md` é um serviço
de domínio e o `repository.md` é um repository — falta apenas os frontmatters dizerem isso.

---

## 5. Eventos de domínio e o catálogo de eventos

Eventos de domínio são o vocabulário mais valioso a documentar — são a *interface pública* entre
contextos. Duas representações complementares:

**No diagrama** — toda publicação de evento é uma relação `{kind: async-event}` cujo label é **o
nome do evento na linguagem ubíqua**, no passado:

```markdown
- [Fila de Pedidos](fila-pedidos.md) — PedidoConfirmado {kind: async-event}
```

Assim a legenda azul-tracejada do ArchViz passa a significar, literalmente, "aqui atravessa um
evento de domínio", e o `tracePath` (modo upstream/downstream) responde de graça a pergunta
"quem é impactado quando `PedidoConfirmado` muda?".

**Na wiki** — cada contexto mantém uma página `eventos.md` catalogando seus eventos publicados
(nome, gatilho, payload resumido, consumidores conhecidos). Detalhe de mecânica do importador
que torna isso seguro: links `.md` relativos **na prosa do corpo** (fora das seções `# Relations`
e do `index.md`) não geram nós nem arestas — são só navegação da wiki, interceptados pelo
`OkfWikiViewer` e renderizados no próprio painel. Ou seja:

```markdown
<!-- em pedidos.md, no corpo, fora de qualquer seção especial -->
Consulte o [catálogo de eventos](pedidos/eventos.md) e o [glossário](pedidos/glossario.md)
deste contexto.
```

…dá páginas de documentação ricas e navegáveis **sem poluir o diagrama**. (Só não linkar essas
páginas nos bullets de um `index.md`, senão viram nós.)

---

## 6. Sagas e consistência eventual

Processos de negócio que atravessam agregados/contextos (o caso clássico: pedido → pagamento →
estoque → entrega, com compensações) já são o ponto forte do renderizador:

- O kind `compensation` (vermelho tracejado) marca cada transação compensatória.
- O *detour lane* do `ArchitectureGraph` existe exatamente para grafos de saga — um passo
  invocado no início e alcançado de novo no fim de uma cadeia longa roda por baixo do conteúdo
  em vez de atravessá-lo.
- O rollup faz a saga contar a história certa em cada altitude: no nível de componente vê-se o
  passo a passo; ao subir para a visão de contexto, os passos colapsam em arestas agregadas
  ("N interações") entre os contextos envolvidos.

Convenção: o **process manager / orquestrador da saga** é um nó próprio
(`aws_resource_type: DDD::Policy` ou o recurso real, ex.: Step Functions), e sua página wiki
descreve a sequência completa e as compensações — o diagrama mostra a topologia, a wiki mostra a
narrativa.

---

## 7. Linguagem ubíqua na wiki

A wiki OKF é o lugar da linguagem ubíqua — e o ponto-chave é que **cada bounded context tem o seu
glossário**, porque é isso que "bounded" significa: o mesmo termo pode ter significados
diferentes em contextos diferentes (o "Cliente" de Pedidos não é o "Cliente" de Cobrança).

Estrutura recomendada por contexto:

```
pedidos.md                    # o concept (vira nó no diagrama)
pedidos/
  index.md                    # filhos do contexto (containers → viram nós)
  glossario.md                # linguagem ubíqua — só wiki, não linkar em index.md
  eventos.md                  # catálogo de eventos — só wiki
  decisoes.md                 # ADRs / decisões de modelagem — só wiki
```

E o corpo de `pedidos.md` abre com o essencial: o propósito do contexto em uma frase, os termos
centrais com definição curta, e links para as três páginas acima. Como a wiki **acompanha a
seleção do diagrama ao vivo** (selecionou o nó, a doc abre; deep link `?panel=wiki`
compartilhável), o glossário do contexto certo está sempre a um clique da caixa que o representa
— essa é a integração diagrama↔linguagem que ferramentas de diagrama puro não têm.

---

## 8. Exemplo completo: um contexto de ponta a ponta

Bundle mínimo `okf-bundles/loja/` mostrando as convenções juntas:

```
index.md                          # raiz: context map
cliente.md                        # ator (icon: user.svg)
pedidos.md                        # BC core
cobranca.md                       # BC supporting
erp-legado.md                     # BC externo (external: true)
pedidos/
  index.md
  glossario.md  eventos.md        # só wiki
  api-pedidos.md                  # container
  svc-pedidos.md                  # container
  svc-pedidos/
    index.md
    agregado-pedido.md            # DDD::AggregateRoot
    politica-confirmacao.md       # DDD::Policy
    acl-erp.md                    # DDD::AntiCorruptionLayer
```

`index.md` (raiz — a visão de context map):

```markdown
---
title: Plataforma Loja
description: Context map da plataforma de e-commerce.
boundary_label: Plataforma Loja
---

# Concepts

- [Cliente](cliente.md) - pessoa que compra na loja
- [Contexto de Pedidos](pedidos.md) - core domain, ciclo de vida do pedido
- [Contexto de Cobrança](cobranca.md) - pagamento e faturamento
- [ERP Legado](erp-legado.md) - sistema externo de estoque
```

`pedidos.md`:

```markdown
---
title: Contexto de Pedidos
type: Bounded Context
icon: generic-application.svg
owner: Squad Pedidos
ddd_subdomain: core
ddd_context: pedidos
---

Dono do ciclo de vida do pedido, do carrinho à confirmação. Aqui, **Pedido** é um
agregado com invariantes de total e status; **Cliente** significa apenas "comprador
identificado" (difere do Cliente de Cobrança, que tem dados fiscais).

Veja o [glossário](pedidos/glossario.md) e o [catálogo de eventos](pedidos/eventos.md).

# Relations

- [Contexto de Cobrança](cobranca.md) — PedidoConfirmado {kind: async-event}
- [ERP Legado](erp-legado.md) — Reserva estoque via {pattern: acl}
```

`pedidos/svc-pedidos/agregado-pedido.md`:

```markdown
---
title: Pedido (Aggregate Root)
type: Aggregate Root
aws_resource_type: DDD::AggregateRoot
owner: Squad Pedidos
ddd_context: pedidos
---

# Schema

- consistencia: forte
- entidades: Pedido, ItemPedido
- valueObjects: Dinheiro, Endereco, StatusPedido
- invariante: total = soma dos itens
- eventosPublicados: PedidoCriado, PedidoConfirmado

# Relations

- [Política de Confirmação](politica-confirmacao.md) — PedidoConfirmado {kind: async-event}
```

Resultado no ArchViz: visão raiz = context map com badges de subdomínio e padrões `[ABBREV]`
nas arestas (com legenda); drill em Pedidos = uma caixa "Bounded Context: Pedidos" em torno dos
containers do contexto; drill no serviço = agregado, política e ACL como componentes tipados,
cada um com seu ícone DDD; painel de detalhes = cartão do agregado + seção "Domain-Driven
Design"; aba Wiki = glossário e catálogo de eventos acompanhando a seleção.

---

## 9. O que a ferramenta suporta

Todos os itens abaixo já estão implementados — nenhum exige extensão futura.

| Conceito DDD | Mecanismo |
|---|---|
| Bounded contexts no context map | Nós `level: context` na visão raiz |
| Classificação estratégica (core/supporting/generic) | `ddd_subdomain` no frontmatter → badge + tinta de borda no nó (`SUBDOMAIN_STYLE` em `ArchitectureGraph.tsx`) |
| Fronteira de um bounded context na visão de containers | `ddd_context` no frontmatter → caixa "Bounded Context: `<nome>`" (`computeBoundedContextBoxes` em `groups.ts`), independente das caixas de rede AWS e podendo sobrepô-las |
| Padrões do context map (ACL, OHS/PL, CF…) | `{pattern: acl}` estruturado na relação (mesma sintaxe de brace do `{kind: ...}`, combináveis) → sufixo `[ABBREV]` no label da aresta + linha própria na legenda (`getVisiblePatterns`) |
| Eventos de domínio | `{kind: async-event}` + label = nome do evento |
| Sagas e compensações | `{kind: compensation}` + detour lane + rollup |
| Building blocks táticos | `aws_resource_type: DDD::*` + `# Schema` como cartão do agregado, com ícone próprio (`ddd_role` + `icon: ddd-*.svg`) |
| Um contexto, um time | `owner:` frontmatter → painel "Ownership & Links" |
| Linguagem ubíqua por contexto | Páginas só-wiki (`glossario.md`, `eventos.md`) linkadas na prosa |
| Impacto de um evento | `tracePath` upstream/downstream sobre as arestas visíveis |
| Metadados táticos no painel | Seção "Domain-Driven Design" no `DetailsPanel` (subdomínio, bounded context, building block) quando `node.ddd` está presente |

O bundle `public/okf-bundles/order-system/` e `src/data/sample-architecture.json` demonstram
todas as convenções acima lado a lado — ver especialmente `order-system/order-processor/` (os
componentes `order-aggregate.md`/`acl-payment.md`/`validator.md`/`repository.md`, um de cada
building block tático com seu ícone).

### O que **não** representar aqui

- **Diagramas de classe de entidades/VOs** — abaixo da altitude da ferramenta; é papel do código
  e dos testes. O `# Schema` lista, não desenha.
- **Fluxos de dados campo a campo / payloads completos** — o catálogo de eventos na wiki resume;
  o contrato detalhado mora no repositório do serviço (linkar via `# Links`).
- **Event storming ao vivo** — o ArchViz é leitura; o resultado de uma sessão de event storming
  é *insumo* para escrever o bundle, não algo a fazer dentro da ferramenta.

---

## 10. Diretrizes de adoção para o time

1. **Comece pelo context map.** O primeiro bundle DDD de um sistema é só a visão raiz: contextos,
   atores, sistemas externos e as relações com `{pattern: ...}` + `{kind: ...}`. Já é o artefato
   que mais falta nos times — e são ~6 arquivos markdown.
2. **`owner` é obrigatório em nó de contexto.** Contexto sem dono é sintoma de fronteira mal
   traçada; a ferramenta deixa isso visível.
3. **Label de evento = nome do evento, no passado, na língua do domínio.** "PedidoConfirmado",
   não "envia mensagem para fila". A fila é o `technology`/nó; o evento é o vocabulário.
4. **Glossário antes de diagrama tático.** Só desça ao nível de componente de um contexto depois
   que `glossario.md` existir — é a ordem que o DDD prescreve (linguagem primeiro, modelo depois)
   e evita diagramas táticos com termos que ninguém alinhou.
5. **Valide sempre.** `npm run validate` roda as invariantes do modelo em todo bundle — inclua no
   CI do repositório onde os bundles do time viverem, como este repo já faz.
6. **Uma página wiki conta uma história; o diagrama mostra a topologia.** Se você está tentando
   explicar *sequência* (saga passo a passo) no diagrama, pare e escreva a narrativa na página do
   orquestrador; se está tentando explicar *estrutura* em prosa longa, pare e mova para nós e
   relações.
