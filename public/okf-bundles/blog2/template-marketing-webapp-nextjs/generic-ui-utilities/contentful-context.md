---
type: React Component
title: Contentful Context
description: ContentfulContext is a React component in the generic UI utilities layer of this Next.js marketing site, wired into both the home route (/) and the dynamic content route (/[slug]). It provides Contentful-related context to whatever it wraps, making it a shared plumbing piece for pages that render Contentful-sourced content.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

Because it's present on both the root page and the catch-all slug route, it acts as a common ancestor in the component tree for any page that needs access to Contentful data or state, rather than being tied to a single page's layout.
