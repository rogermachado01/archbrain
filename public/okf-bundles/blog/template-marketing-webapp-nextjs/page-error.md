---
type: React Component
title: Page Error
description: page-error is a React Component within the Next.js marketing webapp template, serving as the error boundary or error page shown when something goes wrong during rendering or navigation. It relies on the shared theme configuration to keep its presentation consistent with the rest of the site, rather than defining its own standalone styling.
level: component
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Error Handling
ddd_role: Presentational Component
---

page-error is a React Component within the Next.js marketing webapp template, serving as the error boundary or error page shown when something goes wrong during rendering or navigation. It relies on the shared theme configuration to keep its presentation consistent with the rest of the site, rather than defining its own standalone styling.

By pulling in the colorful theme, this component ensures that even error states remain visually aligned with the overall brand and design language used throughout the template, giving users a cohesive experience even when a failure occurs.

# Relations

- [Theme](theme.md) — Applies the shared color theme to style the error page {kind: sync}
