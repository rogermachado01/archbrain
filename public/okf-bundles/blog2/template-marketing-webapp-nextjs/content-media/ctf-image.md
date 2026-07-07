---
type: React Component
icon: fe-component.svg
title: Ctf Image
description: CtfImage is a shared React component in the marketing web app's UI layer, rendering Contentful-sourced image assets wherever it's included in the page tree. It appears on both the homepage (`/`) and the dynamic slug-based content route (`/[slug]`), making it a common visual building block across the site's top-level and CMS-driven pages.
level: component
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_role: Presentational Component
---

Because it's used on both the root route and the catch-all slug route, this component likely renders images pulled from Contentful entries as part of the page content assembled for each route, rather than being tied to a single fixed page layout. Its placement in `shared-ui` indicates it's meant to be reused across different page templates rendered by this app rather than being specific to one route's markup.
