---
type: React Component
title: Ctf Navigation
description: CtfNavigation renders the top-level site navigation shown on both the homepage (/) and generic slug pages (/[slug]), giving visitors a consistent way to move between pages regardless of which route they landed on.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Navigation Menu
ddd_role: Contentful-Connected Component
---

It builds its navigation items from menu group data pulled through the ctf-menuGroup fragment, rendering individual entries with the page-link component and the shared Link wrapper for routing. It also reads from the Contentful context hook, which suggests the navigation adapts its rendered content based on the current Contentful preview/editing state rather than relying solely on static props.

# Relations

- [Link](link.md) — Wraps navigation entries with the shared Link component for routing {kind: sync}
- [Page Link](page-link.md) — Renders individual navigation entries as page links {kind: sync}
- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Sources menu group structure and labels from the shared menu group fragment {kind: sync}
- [Contentful Context](../generic-ui-utilities/contentful-context.md) — Reads live Contentful state to adjust navigation rendering {kind: sync}
