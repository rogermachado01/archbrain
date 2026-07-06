---
type: React Component
title: Card Leadership
description: "CardLeadership is a React component used to present an individual leadership team member within a marketing web page. It is built by composing several content-driven building blocks: it uses a person data fragment to supply the underlying leadership profile fields, renders an associated image or media asset through the CtfAsset component, and displays formatted biographical or descriptive text using the CtfRichtext component."
level: component
owner: contentful/team-workflows
---

CardLeadership is a React component used to present an individual leadership team member within a marketing web page. It is built by composing several content-driven building blocks: it uses a person data fragment to supply the underlying leadership profile fields, renders an associated image or media asset through the CtfAsset component, and displays formatted biographical or descriptive text using the CtfRichtext component.

In practice, this component acts as a presentation layer that pulls together a person's photo and written content into a single card layout, likely used in a grid or list of leadership team members on an "About Us" or "Team" style page. It relies on the shared Contentful component ecosystem (ctf-asset and ctf-richtext) to remain consistent with how other content types render media and rich text elsewhere in the site.

# Relations

- [Ctf Asset](ctf-asset.md) — Displays the leadership member's photo or media asset {kind: sync}
- [Ctf Person.Generated](ctf-person.generated.md) — Supplies the leadership member's profile data fields {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the leadership member's rich text bio content {kind: sync}
