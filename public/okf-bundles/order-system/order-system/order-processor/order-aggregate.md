---
type: Aggregate Root
title: Order Aggregate
description: Owns the order's lifecycle and enforces its consistency invariants.
level: component
aws_resource_type: DDD::AggregateRoot
icon: ddd-aggregate.svg
ddd_context: Orders
ddd_role: Aggregate Root
---

# Schema

- entities: Order, OrderLine
- valueObjects: Money, Address, OrderStatus
- invariant: total equals the sum of its order lines
- invariant2: a CONFIRMED order accepts no further items

# Relations

- [Repository](repository.md) — Persisted via
