---
type: React Component
title: Page Link
description: PageLink is a React component rendered on the home page (`/`) and dynamic slug pages (`/[slug]`), where marketing content needs internal navigation links. It builds on the shared `Link` component, adapting it for use within page content rather than global navigation elements like headers or footers.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Layout & Navigation
ddd_role: Presentational Component
---

By wrapping the shared `Link` and its `LinkProps` type, PageLink likely provides a page-scoped entry point for authors or CMS-driven content to insert links within body copy, without each page needing to import the lower-level link primitive directly.

# Relations

- [Link](link.md) — Wraps the shared Link component for use within page content {kind: sync}
