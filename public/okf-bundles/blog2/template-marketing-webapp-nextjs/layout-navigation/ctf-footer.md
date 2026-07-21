---
type: React Component
title: Ctf Footer
description: CtfFooter renders the site footer shown at the bottom of both the marketing homepage (/) and dynamic content pages (/[slug]), giving visitors consistent navigation and links regardless of which page they land on. It resolves its content — menu groups and page links — from Contentful-authored data, keeping footer structure editable without code changes.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Site Chrome
ddd_role: Contentful-Connected Component
---

The component draws on Contentful's live-preview context to reflect editorial updates, applies the shared container width from the theme to align the footer with the rest of the page layout, and uses generated GraphQL fragment types for menu groups and page links to type the structured content it receives as props. Internal navigation links within the footer are rendered through the shared Link component rather than raw anchors.

# Relations

- [Link](link.md) — Renders internal footer navigation links {kind: sync}
- [Contentful Context](../generic-ui-utilities/contentful-context.md) — Reads Contentful preview/editing context for live content {kind: sync}
- [Theme](../generic-ui-utilities/theme.md) — Aligns footer content to the shared page container width {kind: sync}
- [Ctf MenuGroup.Generated](ctf-menuGroup.generated.md) — Types footer menu group data from Contentful {kind: sync}
- [Page Link](page-link.md) — Types footer page link data from Contentful {kind: sync}
