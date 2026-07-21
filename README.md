# ArchBrain

ArchBrain é um visualizador interativo de arquitetura de nuvem. Ele combina as camadas do
**modelo C4** (Context → Container → Component) com o **detalhamento de recursos AWS**,
permitindo navegar ("drill down") entre os níveis de uma arquitetura em um canvas e inspecionar
a configuração AWS de qualquer recurso selecionado.

Não há edição nem backend nesta versão — as arquiteturas vêm de um registro de fontes de
dados somente-leitura (arquivos JSON simples e/ou bundles OKF) que o usuário escolhe no
cabeçalho da aplicação.

## Como rodar

Pré-requisito: Node.js instalado (o projeto usa Next.js 16 + Turbopack).

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

### Outros comandos

```bash
npm run build      # build de produção (roda também a checagem de TypeScript)
npm run start      # serve o build de produção
npm run lint        # ESLint
npm run validate    # valida cada entrada de DATA_SOURCES (arquivos JSON e bundles OKF)
npm test            # roda a suíte de testes (Vitest)
npm run okf-scan    # CLI do pipeline de scan de repositórios (ver seção "OKF" abaixo)
```

## Como usar a aplicação

### Navegando pelo diagrama

- **Seleção**: clique em um nó para selecionar — o painel à direita ("Resource") mostra o
  tipo, tecnologia e todas as propriedades AWS (`aws.properties`) desse recurso.
- **Drill down**: dê duplo clique em um nó com filhos (indicado visualmente) para entrar no
  nível seguinte (Context → Container → Component). O breadcrumb no topo mostra a cadeia de
  ancestrais e permite voltar a qualquer nível anterior, não só um passo por vez.
- **Zoom/pan**: arraste para mover o canvas, use a roda do mouse para zoom. Um minimapa
  aparece automaticamente quando há muitos nós na tela.
- **Exportar**: os botões de download exportam o diagrama atual como PNG ou SVG.

### Trocando a fonte de dados

O seletor no cabeçalho lista todas as arquiteturas registradas em `DATA_SOURCES`
(`src/lib/data-sources.ts`) — tanto arquivos JSON estáticos quanto bundles OKF. Trocar a
fonte reseta a navegação de volta para a raiz.

### Busca e deep links

- `Ctrl+K` / `Cmd+K` abre a busca rápida, filtrando por nome, tecnologia ou tipo de recurso
  AWS. Clicar em um resultado navega direto para aquele nó.
- Toda a navegação (fonte selecionada, nível atual, nó selecionado, aba do painel lateral)
  fica na URL (`?source=...&parent=...&node=...&panel=...`), então qualquer estado da
  aplicação pode ser compartilhado como link.

### Rastreamento de caminho (Path Mode)

O controle "Path Mode" destaca, a partir do nó selecionado, tudo que está *upstream*
(o que alimenta esse recurso) ou *downstream* (o que esse recurso alimenta), opcionalmente
filtrado por tipo de relação (síncrono / evento assíncrono / compensação).

### Legenda de relações

Um overlay no canto do canvas mostra apenas os tipos de relação (`sync`, `async-event`,
`compensation`, agregada) realmente presentes na visão atual, junto com os padrões DDD de
context-map (`ACL`, `OHS`, etc.) quando aplicável.

### Aba "Wiki" (apenas para fontes OKF)

Quando a fonte de dados ativa é um bundle OKF, o painel lateral ganha uma segunda aba
("Wiki") que renderiza o markdown original do bundle (a documentação "crua", não só os dados
estruturados usados no diagrama). Essa aba acompanha automaticamente o que está em foco no
diagrama — selecionar outro nó ou entrar em outro container atualiza o conteúdo exibido sem
precisar reclicar na aba.

### Grupos de rede AWS e Bounded Contexts

Quando o dataset carrega grupos AWS (`ArchModel.groups` — região/VPC/AZ/subnet), essas
caixas aparecem automaticamente nas visões em nível de container. Quando os nós têm metadados
DDD (`ddd_context`), nós do mesmo contexto delimitado são agrupados em uma caixa tracejada
separada — as duas coisas podem se sobrepor de propósito, já que representam limites
diferentes (rede vs. linguagem/domínio).

## Fontes de dados: adicionando sua própria arquitetura

Toda fonte precisa ser um `ArchModel` válido (ver `src/lib/types.ts`) e é registrada em
`src/lib/data-sources.ts`. Duas formas:

- **JSON estático**: crie um arquivo em `src/data/`, importe via dynamic import (`load: () =>
  import("@/data/minha-arquitetura.json").then(m => m.default)`).
- **Bundle OKF**: uma pasta de markdown com frontmatter YAML em `public/okf-bundles/<nome>/`
  (ver `public/okf-bundles/order-system/` como exemplo completo), carregada via
  `importOkfBundle("/okf-bundles/<nome>")`.

Todo `load()` passa por `validateArchModel` antes de resolver — um dataset malformado
(referência solta, ciclo de `parentId`, nível C4 incorreto) rejeita a promise em vez de
renderizar um grafo incompleto. Rode `npm run validate` para checar todas as fontes de uma vez
(o mesmo validador roda em CI).

Para as convenções completas de bundles OKF (hierarquia, `# Relations`, metadados DDD,
`# Schema`, ícones, `# Links`, boundary customizado) veja a seção "Importing OKF bundles" em
`CLAUDE.md`.

## OKF — gerando um bundle a partir de repositórios reais

Bundles OKF hoje são escritos à mão. Para uma arquitetura real espalhada por vários
repositórios (Terraform + serviços Lambda + frontend), existe um pipeline em
`scripts/okf-scan/` que **escaneia** esses repositórios e **gera** um bundle OKF pronto para
registrar em `DATA_SOURCES`, em vez de escrever o markdown manualmente.

### O que ele faz

1. **Checa o que mudou** (`check-repo-freshness`) — para cada repositório do `repo-map.yaml`,
   faz um `git ls-remote` (branch) ou hash de conteúdo (Terraform) contra o que está
   registrado em `.scan-manifest.json`. Repositórios sem mudança são pulados por completo
   nesta rodada.
2. **Sincroniza worktrees** apenas dos repositórios que mudaram — nunca mexe no checkout do
   próprio usuário; usa um `git worktree` isolado em cache local.
3. **Escaneia** Terraform (parsing estático de HCL, sem `terraform init`/credenciais/state),
   repositórios Lambda (AST TypeScript: handlers exportados, chamadas ao AWS SDK v3) e
   repositórios de frontend (componentes React, chamadas de API, slices Redux) — cada
   scanner só emite fatos com evidência, nunca inventa relações.
4. **Sintetiza** (`synthesize`) o bundle: frontmatter e `# Schema`/`# Relations`
   determinísticos a partir dos fatos, mais **uma chamada ao Claude por conceito** para gerar
   a descrição em prosa (1-3 parágrafos), sempre fundamentada apenas nos fatos daquele
   conceito. Conceitos cujos fatos não mudaram desde a última rodada são pulados
   inteiramente — nenhuma chamada de LLM, arquivo `.md` intocado byte a byte.
5. **Valida** o resultado pelo mesmo caminho de produção (`validateArchModel`) usado pelo
   restante da aplicação.

### Configuração: `repo-map.yaml`

Mapeamento explícito (não auto-detectado) de recursos Terraform e repositórios para
checkouts locais, mais branch/arquivo por ambiente:

```yaml
terraform:
  path: ../infra-terraform      # clone local; escaneado no lugar, sem worktree
  envFiles:
    dev: dev.tf
    hml: hml.tf
    prd: prd.tf

resources:
  aws_lambda_function.orders:
    repo: ../orders-service     # clone local com o remote já configurado
    branch: { dev: develop, hml: staging, prd: main }
  aws_lambda_function.payments:
    repo: ../payments-service
    branch: { dev: develop, hml: staging, prd: main }

frontend:
  - repo: ../web-storefront
    branch: { dev: develop, hml: staging, prd: main }
```

Um exemplo completo está em `scripts/okf-scan/__fixtures__/repo-map.example.yaml`.

### Rodando

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # necessário — synthesize chama o Claude por conceito

npm run okf-scan -- \
  --repo-map repo-map.yaml \
  --env dev \
  --out public/okf-bundles/ecommerce-dev
```

Flags:

| Flag | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `--repo-map <path>` | sim | — | caminho para o `repo-map.yaml` |
| `--env <dev\|hml\|prd>` | sim | — | ambiente a escanear |
| `--out <dir>` | sim | — | diretório de saída do bundle (ex.: `public/okf-bundles/ecommerce-dev`) |
| `--force` | não | `false` | ignora o manifest e a checagem de freshness; reescreve tudo |
| `--concurrency-git N` | não | `20` | chamadas `git ls-remote` simultâneas |
| `--concurrency-scan N` | não | `4` | repositórios escaneados (worktree + AST) simultaneamente |
| `--concurrency-llm N` | não | `6` | chamadas ao Claude simultâneas |
| `--materialize propose\|apply` | não | — | ver "Materialização em containers" abaixo |
| `--plan <path>` | apenas com `--materialize apply` | — | caminho do plano de materialização (JSON) a aplicar |

Ao final, o comando imprime quantos conceitos foram escritos/pulados, quais precisam de
revisão manual (`needsReview`) e o trecho pronto para colar em `DATA_SOURCES`
(`src/lib/data-sources.ts`) apontando para o bundle recém-gerado.

Um novo run reaproveita o que não mudou: repositórios sem alteração são pulados na checagem
de freshness, e mesmo dentro de um repositório que mudou, só os conceitos cujo hash de
entrada mudou de fato disparam uma nova chamada ao Claude. Use `--force` depois de mudar o
prompt/lógica de síntese (quando as *entradas* não mudaram, mas a *saída* desejada mudou).

### Materialização em containers (`--materialize`)

Por padrão o pipeline organiza os conceitos escaneados exatamente como o código os expõe (ex.:
todos os componentes de um repo frontend caem achatados num único container `shared-ui`). Para
reorganizá-los em containers por domínio (ex.: `business-info`, `content-media`,
`marketing-blocks`), rode em dois passos:

```bash
# 1. gera uma proposta de reorganização (não escreve o bundle final)
npm run okf-scan -- --repo-map repo-map.yaml --env dev --out public/okf-bundles/blog2 --materialize propose

# 2. revise/ajuste o plano em public/okf-bundles/blog2/<arquivo-da-proposta>.json, depois aplique
npm run okf-scan -- --repo-map repo-map.yaml --env dev --out public/okf-bundles/blog2 --materialize apply --plan public/okf-bundles/blog2/<arquivo-da-proposta>.json
```

O `propose` usa o Claude para sugerir o agrupamento (e possíveis atores raiz inferidos); o
`apply` só lê o plano e materializa — não chama o Claude de novo. Containers já materializados
em uma rodada anterior são pulados automaticamente na próxima `propose`.

### Exemplo: regenerando os bundles `blog` / `blog2`

Este repo já tem um `repo-map.yaml` na raiz apontando para
`./example/template-marketing-webapp-nextjs` (ambiente `dev`, branch `main`). Para recriar os
bundles de exemplo `public/okf-bundles/blog` (flat) e `public/okf-bundles/blog2`
(materializado por domínio):

```bash
export ANTHROPIC_API_KEY=sk-ant-...

# blog: scan simples, sem reorganização em containers
npm run okf-scan -- --repo-map repo-map.yaml --env dev --out public/okf-bundles/blog --force

# blog2: scan + materialização em containers (ver seção acima)
npm run okf-scan -- --repo-map repo-map.yaml --env dev --out public/okf-bundles/blog2 --force --materialize propose
npm run okf-scan -- --repo-map repo-map.yaml --env dev --out public/okf-bundles/blog2 --materialize apply --plan public/okf-bundles/blog2/<arquivo-da-proposta>.json
```

`--force` garante um scan completo do zero em vez de reaproveitar o `.scan-manifest.json`
existente. Sem `--force`, o comando roda incremental — só rescaneia o que mudou desde a última
rodada.

### Rodando por ambiente

Cada ambiente (`dev`/`hml`/`prd`) gera seu próprio bundle e sua própria entrada em
`DATA_SOURCES` (ex.: `ecommerce-dev`, `ecommerce-hml`, `ecommerce-prd`) — ambientes têm
topologias e configurações genuinamente diferentes, então não são mesclados em um único
`ArchModel`.

### Limitações da v1 (propositais)

- Não clona repositórios novos — cada entrada de `repo-map.yaml` precisa já apontar para um
  clone local com o remote configurado.
- `ddd_subdomain`/`ddd_context`/`ddd_role` nunca são escritos pelo pipeline — são curadoria
  manual, preservada entre rodadas (uma regeneração nunca sobrescreve esses campos nem uma
  seção `# Links` editada à mão).
- Sem inferência a partir de dados de observabilidade (CloudWatch/X-Ray) — só o que o
  Terraform e o código declaram estaticamente.
- Lambdas apenas em Node/TypeScript.

Para as convenções de bundle OKF que o pipeline produz, veja `CLAUDE.md`.

## Saiba mais

- [Documentação do Next.js](https://nextjs.org/docs)
- `CLAUDE.md` — arquitetura interna da aplicação (modelo de dados, pipeline de renderização,
  convenções de bundle OKF, etc.)
