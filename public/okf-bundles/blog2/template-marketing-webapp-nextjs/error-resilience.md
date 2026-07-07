---
type: UI Capability
icon: fe-design-system.svg
title: Resiliência a Erros
description: Estados de fallback exibidos quando uma entrada do Contentful está ausente ou uma consulta GraphQL falha — mantém o site utilizável e evita telas quebradas para o visitante, mesmo diante de conteúdo incompleto ou indisponível.
level: container
owner: contentful/team-workflows
---

Seus componentes vivem no diretório `error-resilience/` ao lado deste arquivo. É consumido por outras capacidades (Vitrine de Produtos, Dados do Negócio) quando uma entrada referenciada não é encontrada — não depende de nenhuma delas.
