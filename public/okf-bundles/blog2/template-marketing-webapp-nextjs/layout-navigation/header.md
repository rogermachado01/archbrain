---
type: React Component
title: Header
description: The Header component sits at the top of every page rendered through this template, giving users a persistent way to orient themselves and navigate the site. It wraps the CTF-driven navigation and a home link inside a fixed-height bar, so it's one of the first things a visitor interacts with when landing on the marketing site.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Header And Chrome
ddd_role: Presentational Component
---

Internally, the header delegates its navigation content to CtfNavigationGql, which pulls the actual menu structure from Contentful, keeping the header itself free of hardcoded links. The logo or brand element uses the shared Link component to route back to the index page, making the header a consistent entry point back to the homepage from anywhere in the app. Layout sizing values imported from the theme module ensure the header's height and content width stay consistent with the rest of the page shell across breakpoints.

# Relations

- [Ctf Navigation](ctf-navigation.md) — Renders the site's CMS-driven navigation menu {kind: sync}
- [Link](link.md) — Uses shared Link for the home/logo link {kind: sync}
- [Theme](../generic-ui-utilities/theme.md) — Sources header height and container width from the theme {kind: sync}
- [Index Page](../index-page.md) — Logo link navigates back to the homepage {kind: sync}
