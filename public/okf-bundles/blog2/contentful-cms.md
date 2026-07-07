---
type: External System
title: Contentful CMS
description: CMS headless que armazena e fornece, via GraphQL, o conteúdo estruturado renderizado pelas páginas do site.
level: context
external: true
icon: generic-application.svg
---

Backend de conteúdo consumido pela aplicação Next.js através de hooks GraphQL gerados (ex.: `ctf-page.generated`, `business-info.generated`) — cada rota busca as entradas relevantes no build/request e as entrega para os componentes de `shared-ui` renderizarem.
