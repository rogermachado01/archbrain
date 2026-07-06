---
type: React Component
title: Ctf Page.Generated
description: `ctf-page.generated` is a generated React component that represents a Page content type from Contentful, part of the marketing webapp Next.js template. As a generated artifact, it is tied to a GraphQL schema and relies on shared fragments to compose the shape of the data it consumes, rather than defining that data independently.
level: component
owner: contentful/team-workflows
---

`ctf-page.generated` is a generated React component that represents a Page content type from Contentful, part of the marketing webapp Next.js template. As a generated artifact, it is tied to a GraphQL schema and relies on shared fragments to compose the shape of the data it consumes, rather than defining that data independently.

This component depends on the `ctf-asset.generated` module for asset-related fields, pulling in both the fragment type definition and the corresponding document used to structure or validate asset data at runtime. This suggests that pages rendered by this component can include embedded or referenced assets (such as images or media) as part of their content, with the asset shape and query logic centralized in the dedicated asset module rather than duplicated here.

# Relations

- [Ctf Asset.Generated](ctf-asset.generated.md) — Uses asset field types to type page content {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Uses the asset query fragment to fetch embedded media {kind: sync}
