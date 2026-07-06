---
type: Shared UI & Utilities
title: Shared Ui
description: Shared UI & Utilities collects the reusable building blocks—common components, styling helpers, and small utility functions—that the marketing webapp's pages and features draw on rather than duplicating logic themselves. It sits underneath the route-level views, providing the consistent visual and functional primitives (buttons, layout wrappers, formatting or helper functions) that keep the interface coherent across the site.
level: container
owner: contentful/team-workflows
---

Because it isn't tied to a single route, this concept is pulled into whichever part of the Next.js app needs it, letting feature-specific code stay focused on its own concerns while relying on this shared layer for common presentation and utility needs.
