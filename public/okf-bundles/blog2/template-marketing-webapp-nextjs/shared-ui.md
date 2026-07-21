---
type: Shared UI & Utilities
title: Shared Ui
description: Shared UI & Utilities in this Next.js marketing template collects the reusable building blocks that appear across multiple pages rather than living inside any single route — buttons, cards, typography, layout wrappers, and helper functions that other page-level and section-level components import as needed.
level: container
owner: contentful/team-workflows
---

Because marketing sites tend to repeat the same visual patterns (call-to-action buttons, section containers, icon wrappers) across the homepage, pricing, and other landing pages, this concept acts as the common dependency that keeps those instances visually and behaviorally consistent. Utilities in this group typically wrap formatting, styling, or small logic tasks that don't belong to any specific page's business purpose.

Anything placed here is meant to be imported, not duplicated: when a new page or section needs a piece of UI that already exists in this shared layer, it should reference it directly rather than reimplementing it, keeping the rest of the app's route-specific concepts focused only on their unique content and logic.
