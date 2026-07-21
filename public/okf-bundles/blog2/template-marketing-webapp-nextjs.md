---
type: Frontend Application
title: Template Marketing Webapp Nextjs
description: template-marketing-webapp-nextjs is a Next.js frontend application serving as the marketing website. It retrieves its page content from Contentful CMS via GraphQL, allowing marketing pages to be rendered from structured content managed outside the codebase.
level: context
owner: contentful/team-workflows
---

By pulling content through a GraphQL interface rather than embedding it directly, the application separates presentation logic from content, so page copy, assets, and structured fields can be updated in Contentful without requiring changes to the frontend code itself.

# Relations

- [Contentful Cms](contentful-cms.md) — Pulls page content for rendering marketing pages {kind: sync}
