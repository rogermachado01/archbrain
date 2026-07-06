---
type: React Component
title: Page Link
description: PageLink is a React component rendered on the homepage and on dynamic slug pages, giving those routes a consistent way to render internal links within page content.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Navigation & Layout
ddd_role: Link Component
---

It builds on the shared Link component, importing both Link itself and its LinkProps type from the shared link module, so it can pass through the same typed props while adapting them for use in page-level contexts.

# Relations

- [Link](link.md) — Wraps the shared Link component for page-level navigation {kind: sync}
