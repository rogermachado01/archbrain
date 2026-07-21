---
type: UI Capability
title: Contentful Media
description: Contentful Media handles image and asset delivery for the marketing web app, pulling media references from Contentful entries and rendering them across the site's pages wherever content editors have attached images to their content models.
level: container
icon: fe-design-system.svg
ddd_subdomain: supporting
ddd_context: Content Rendering
ddd_role: Media Renderer
---

As a UI capability, it sits between the Contentful-authored content and the rendered page, so any page or component that displays editor-managed content also depends on this capability to resolve and present the associated media assets correctly.
