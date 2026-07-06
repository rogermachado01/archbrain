---
type: React Component
title: Card Leadership
description: card-leadership is a React component that renders a leadership profile card, most likely used to present a person from a team or leadership listing within the marketing web app. It brings together a person's visual asset, their descriptive text content, and structured person field data to compose a cohesive card view.
level: component
owner: contentful/team-workflows
---

card-leadership is a React component that renders a leadership profile card, most likely used to present a person from a team or leadership listing within the marketing web app. It brings together a person's visual asset, their descriptive text content, and structured person field data to compose a cohesive card view.

The component relies on CtfAsset to display imagery associated with the leadership profile, such as a portrait or headshot. It uses CtfRichtext to render any accompanying rich text content, like a bio or descriptive blurb. It also imports PersonFieldsFragment, a generated type, to type the person data fields it receives and works with, ensuring the card's props align with the underlying content model.

# Relations

- [Ctf Asset](ctf-asset.md) — Displays the person's portrait image {kind: sync}
- [Ctf Person.Generated](ctf-person.generated.md) — Renders the person's bio or descriptive text {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Types the incoming person field data {kind: sync}
