---
type: React Component
title: Ctf Image
description: `ctf-image` is a React component in the contentful-media module responsible for rendering image assets sourced from Contentful. It appears on the homepage (`/`) and on dynamic content-driven pages (`/[slug]`), where it's used to display media associated with the page's Contentful entries as visitors navigate between the site's landing page and its individual slug-based content pages.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
---

Because it's shared across both the root route and the catch-all slug route, `ctf-image` acts as a common rendering unit for image content wherever Contentful-backed pages need to display associated media, keeping image presentation consistent across the different page templates that pull content from Contentful.
