---
type: React Component
icon: fe-component.svg
title: Section Headlines
description: SectionHeadlines is a shared UI component in the marketing webapp template responsible for rendering headline-style content blocks used across the site's sections. It depends on the Markdown component to render its textual content, meaning any headline copy passed into it is processed as markdown rather than plain strings, allowing rich text formatting (bold, links, emphasis, etc.) within section headings.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_role: Presentational Component
---

Being part of the shared-ui layer, this component is designed for reuse across multiple marketing pages or sections rather than being tied to a single route, serving as a building block that other section-level components can compose to display formatted headline text consistently throughout the app.

# Relations

- [Markdown](markdown.md) — Renders headline text as formatted markdown {kind: sync}
