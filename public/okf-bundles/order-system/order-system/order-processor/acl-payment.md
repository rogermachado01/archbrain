---
type: Anti-Corruption Layer
title: Payment ACL
description: Translates the Payment Gateway's external model into the Orders bounded context's own vocabulary.
level: component
aws_resource_type: DDD::AntiCorruptionLayer
icon: ddd-acl.svg
ddd_context: Orders
ddd_role: Anti-Corruption Layer
---

# Relations

- [Payment Gateway](../../payment-gateway.md) — Charges card via {pattern: acl}
