---
type: React Component
title: Ctf Image
description: CtfImage is a React component in the shared-ui layer of the marketing web app, responsible for rendering images sourced from Contentful. It appears on the home route (/) and on dynamic content-driven pages (/[slug]), making it a common building block wherever marketing pages need to display Contentful-managed imagery.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: Contentful Media
ddd_role: Presentational Component
---

Because it lives under shared-ui, CtfImage is not tied to a single page template but is reused across whatever routes pull in Contentful entries containing image fields. Its presence on both the root route and the catch-all slug route indicates it's invoked as part of the rendering pipeline for arbitrary Contentful-backed page content, rather than being page-specific markup.
