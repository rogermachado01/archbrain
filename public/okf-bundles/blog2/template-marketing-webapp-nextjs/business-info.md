---
type: UI Capability
icon: fe-design-system.svg
title: Dados do Negócio & Configurações
description: Informações institucionais (dados de contato/negócio) e preferências do site (idioma, moeda) expostas ao visitante e usadas para configurar a experiência da página.
level: container
owner: contentful/team-workflows
---

Seus componentes vivem no diretório `business-info/` ao lado deste arquivo.

# Relations

- [Renderização de Conteúdo (CMS)](content-rendering.md) — Lê contexto do Contentful para popular formulários e formatação de moeda/idioma {kind: sync}
- [Mídia de Conteúdo](content-media.md) — Tipa os campos de imagem associados aos dados do negócio {kind: sync}
- [Resiliência a Erros](error-resilience.md) — Cai para UI de não encontrado quando a entrada de dados do negócio está ausente {kind: sync}
