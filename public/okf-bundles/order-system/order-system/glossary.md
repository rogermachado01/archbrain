---
title: Orders — Glossary
description: Ubiquitous language for the Orders bounded context.
---

Ubiquitous language for the Orders bounded context. Terms here may mean
something different in other bounded contexts (e.g. Payments) — that
difference is exactly what "bounded" means.

- **Order** — a customer's confirmed intent to purchase one or more order
  lines; its lifecycle and invariants are owned by the Order Aggregate.
- **Order Line** — a single product + quantity within an Order.
- **Refund Check** — the async step that decides whether a failed order needs
  a compensating refund.
- **Customer** — in this context, just "the identified buyer of an Order" —
  no billing or fiscal data (that belongs to the Payments context instead).

This page is wiki-only: it is not linked from any `index.md`, so it never
becomes a node on the diagram — see the [event catalog](events.md) for the
events this context publishes.
