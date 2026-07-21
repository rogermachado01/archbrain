---
type: React Component
title: Ctf Cta
description: CtfCta is the React component that renders a call-to-action block within the Next.js marketing site, combining rich text content with a styled, themeable link target. It sits in the shared-ui layer alongside other Contentful-driven components, meaning it's designed to be dropped into page templates wherever an editor-configured CTA needs to appear.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Content Sections
ddd_role: Presentational Component
---

The component composes CtfRichtext to render its accompanying text content, pulls color/style configuration from the shared theme module to keep its visual treatment consistent with the rest of the site, and resolves its destination using the page-link fragment data, allowing the CTA to link to internally modeled pages rather than hardcoded URLs.

# Relations

- [Ctf Richtext](ctf-richtext.md) — Renders the CTA's rich text body {kind: sync}
- [Theme](theme.md) — Applies themed color styling to the CTA {kind: sync}
- [Page Link](page-link.md) — Resolves the CTA's destination page link {kind: sync}
