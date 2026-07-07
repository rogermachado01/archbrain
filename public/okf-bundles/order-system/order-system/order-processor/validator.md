---
type: TypeScript Class
title: Validator
description: Validates order payloads and business rules.
level: component
technology: TypeScript class
aws_resource_type: DDD::DomainService
icon: ddd-policy.svg
ddd_context: Orders
ddd_role: Domain Service
---

# Schema

- rule: rejects orders with a total of zero or less

# Relations

- [Repository](repository.md) — Persists via
