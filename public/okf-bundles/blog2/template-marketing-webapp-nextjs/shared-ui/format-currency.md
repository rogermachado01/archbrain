---
type: React Component
title: Format Currency
description: `format-currency` is a shared React component in the marketing web app's UI layer responsible for rendering currency values consistently wherever prices or monetary amounts appear across the site.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Business Info & Settings
ddd_role: Formatting Utility Component
---

It pulls locale or configuration data by importing `useContentfulContext` from the Contentful context module, allowing it to format currency output in line with content-driven settings rather than hardcoding formatting rules.

# Relations

- [Contentful Context](contentful-context.md) — Reads locale/config data to format currency correctly {kind: sync}
