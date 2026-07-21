---
type: React Component
title: Section Headlines
description: SectionHeadlines is a shared UI component in the marketing web app template, used to render headline-style content blocks within page sections. It pulls in the Markdown component to handle the actual text rendering, letting section content be authored in Markdown and displayed consistently wherever headline sections appear across the site's pages.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Rich Content Rendering
ddd_role: Presentational Component
---

By depending on the shared Markdown renderer rather than rendering raw text itself, SectionHeadlines stays focused on layout and structure, delegating formatting concerns (bold, links, paragraphs, etc.) to a single reusable piece. This keeps headline content consistent with other Markdown-driven sections elsewhere in the app.

# Relations

- [Markdown](markdown.md) — Renders headline content as Markdown {kind: sync}
