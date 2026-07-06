---
type: React Component
title: Ctf Info Block.Generated
description: `ctf-info-block.generated` is a generated React component belonging to the marketing webapp template built on Next.js. As a generated artifact, it corresponds to a content-modeled "info block" entry, typically used to render a titled block of marketing copy alongside supporting media within a page.
level: component
owner: contentful/team-workflows
---

`ctf-info-block.generated` is a generated React component belonging to the marketing webapp template built on Next.js. As a generated artifact, it corresponds to a content-modeled "info block" entry, typically used to render a titled block of marketing copy alongside supporting media within a page.

To support its media needs, this component draws on the generated Contentful asset module, importing the `AssetFieldsFragment` type and its companion `AssetFieldsFragmentDoc` document. This allows the info block to type and query asset data (such as images) using the shared GraphQL fragment defined for Contentful assets, keeping asset field selection consistent with other components in the template.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Pulls in asset data for the block's media content {kind: sync}
