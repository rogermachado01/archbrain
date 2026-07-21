---
type: React Component
title: Contentful Context
description: ContentfulContext is a React component that supplies Contentful-related state or data to the pages it wraps, making it available to nested components without prop drilling. It is used on the home route (/) and on dynamic slug-based content pages (/[slug]), which are the two route patterns that render Contentful-backed content in this app.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: generic
ddd_context: Contentful Platform Infrastructure
ddd_role: Context Provider
---

Because it appears on both the root route and the catch-all slug route, this context sits at a level in the component tree where it can serve any page whose content originates from Contentful, regardless of the specific page being rendered. This positions it as shared infrastructure within the shared-ui layer rather than something tied to a single page's logic.
