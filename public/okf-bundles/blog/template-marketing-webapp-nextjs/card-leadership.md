---
type: React Component
title: Card Leadership
description: card-leadership is a React component in the marketing web app template that presents a leadership profile card, likely used to showcase a person's biography alongside associated media within a marketing page. It draws on person data structured as PersonFieldsFragment, suggesting it displays fields such as a name, title, or biography tied to an individual entry from the content model.
level: component
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: People Content
ddd_role: Presentational Component
---

card-leadership is a React component in the marketing web app template that presents a leadership profile card, likely used to showcase a person's biography alongside associated media within a marketing page. It draws on person data structured as PersonFieldsFragment, suggesting it displays fields such as a name, title, or biography tied to an individual entry from the content model.

To render its content, the component composes three other pieces of the ctf-components system: it uses CtfAsset to display an image or media asset (such as a headshot), and CtfRichtext to render formatted text (such as a bio or description) as rich content rather than plain strings. Together these dependencies indicate that card-leadership acts as a presentational wrapper that pulls together a person's image, text, and structured data into a single visual card.

# Relations

- [Ctf Asset](ctf-asset.md) — Displays the person's photo or media asset {kind: sync}
- [Ctf Person.Generated](ctf-person.generated.md) — Supplies the person's profile data for the card {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders formatted biography or description text {kind: sync}
