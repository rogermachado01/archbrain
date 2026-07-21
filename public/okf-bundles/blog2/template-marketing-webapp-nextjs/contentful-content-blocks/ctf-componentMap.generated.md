---
type: React Component
title: Ctf ComponentMap.Generated
description: `ctf-componentMap.generated` maps Contentful content type IDs to their corresponding React components, giving the content-blocks rendering layer a lookup table it can use to turn a block's `__typename` (or content type id) into the actual component that should render it.
level: component
icon: fe-component.svg
owner: contentful/team-workflows
ddd_subdomain: supporting
ddd_context: Page Composition
ddd_role: Generated Component Map
---

In practice this file sits between the data fetched from Contentful and the generic block renderer used throughout the marketing webapp: whenever a page or section pulls in a list of content blocks, the renderer consults this generated map to resolve each block entry to its React component rather than hard-coding a switch statement per content type. Because it's generated, it's expected to be kept in sync automatically as new content-block components and Contentful content types are added, rather than edited by hand.
