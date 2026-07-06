---
type: React Component
title: Ctf Duplex.Generated
description: `ctf-duplex.generated` is a generated artifact belonging to the React Component layer of the Next.js marketing web app template, associated with a "duplex" content type from Contentful. Rather than defining component logic itself, this file exists to pull in the GraphQL fragment types and fragment documents that a duplex-style component needs in order to render its content correctly.
level: component
owner: contentful/team-workflows
---

`ctf-duplex.generated` is a generated artifact belonging to the React Component layer of the Next.js marketing web app template, associated with a "duplex" content type from Contentful. Rather than defining component logic itself, this file exists to pull in the GraphQL fragment types and fragment documents that a duplex-style component needs in order to render its content correctly.

It depends on two other generated modules: one supplying fields related to page links, and another supplying fields related to Contentful assets (such as images or media). By importing the fragment types and fragment documents from these modules, `ctf-duplex.generated` ensures that any component or query built around it has typed access to both the linked-page data and the associated asset data that a duplex layout (which typically pairs an image/asset with linking content) would require.

# Relations

- [Page Link.Generated](page-link.generated.md) — Supplies typed page-link data for the duplex's linked content {kind: sync}
- [Ctf Asset.Generated](ctf-asset.generated.md) — Supplies typed asset data for the duplex's image/media content {kind: sync}
