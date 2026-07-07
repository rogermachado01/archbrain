---
title: Orders — Event Catalog
description: Domain events published by the Orders bounded context.
---

Domain events published by the Orders bounded context. Each is drawn on the
diagram as an asynchronous-event relation labeled with the event name.

## OrderAccepted

- **Trigger:** the Order Processor validates and persists a new order.
- **Consumers:** Order Queue (async fan-out into the refund-check flow).

## RefundRequested

- **Trigger:** the Order Queue forwards an accepted order for refund-eligibility checking.
- **Consumers:** Refund Worker.

See the [glossary](glossary.md) for what these terms mean in this context.
