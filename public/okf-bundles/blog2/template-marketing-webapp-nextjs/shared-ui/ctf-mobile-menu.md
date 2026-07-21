---
type: React Component
title: Ctf Mobile Menu
description: CtfMobileMenu renders the collapsed navigation panel shown on small screens, giving mobile visitors access to the same site links exposed by the desktop navigation. It sits alongside ctf-navigation as the responsive counterpart that presents navigation entries in a mobile-friendly layout once a menu toggle is triggered.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Layout & Navigation
ddd_role: Presentational Component
---

To build its links, the component relies on the shared Link component for rendering each navigation item consistently with the rest of the app, and it reads from the Contentful context hook to access locale or preview state needed when resolving content for display.

# Relations

- [Ctf Navigation](ctf-navigation.md) — Shares navigation data structure with the main site navigation {kind: sync}
- [Link](link.md) — Renders each mobile menu entry as a link {kind: sync}
- [Contentful Context](contentful-context.md) — Reads Contentful context for locale/preview state {kind: sync}
