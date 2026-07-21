---
type: React Component
title: Card Leadership
description: CardLeadership is a React component in the Contentful content-blocks family that renders a leadership profile card, combining a person's media asset with structured text content. It draws on `PersonFieldsFragment` data to populate the card, pairing an image via `CtfAsset` with rich text content rendered through `CtfRichtext`, giving each leadership entry a photo alongside formatted biographical or role information.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: core
ddd_context: People Cards
ddd_role: Presentational Component
---

This component is used wherever a page needs to showcase individual team or leadership members as part of a larger Contentful-driven content block, such as an "about us" or "leadership" section assembled from a list of these cards.

# Relations

- [Ctf Asset](../contentful-media/ctf-asset.md) — Displays the leader's photo or media asset {kind: sync}
- [Ctf Person](ctf-person.md) — Supplies the person's profile data for the card {kind: sync}
- [Ctf Richtext](ctf-richtext.md) — Renders the leader's bio or description as rich text {kind: sync}
