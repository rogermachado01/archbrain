---
type: Software System
title: Order System
description: Accepts orders and coordinates payment, queueing, and refunds.
level: context
ddd_subdomain: core
ddd_context: Orders
owner: Orders Team
---

The core system being documented in this example bundle. Its containers live
in the `order-system/` subdirectory next to this file.

See the [glossary](order-system/glossary.md) and [event catalog](order-system/events.md)
for the Orders bounded context's ubiquitous language.

# Relations

- [Payment Gateway](payment-gateway.md) — Processes payments using {pattern: acl}
