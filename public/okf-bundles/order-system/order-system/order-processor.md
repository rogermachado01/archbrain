---
type: AWS Lambda Function
title: Order Processor
description: Validates and persists incoming orders, then triggers async refund handling on failure.
level: container
aws_resource_type: AWS::Lambda::Function
group: ../groups/region-use1/vpc-main/az-a/subnet-private-a.md
---

# Schema

- runtime: nodejs20.x
- memorySize: 512
- timeout: 10

# Relations

- [Order Table](order-table.md) — Creates order (PENDING)
- [Order Queue](order-queue.md) — Publishes refund check {kind: async-event}
- [Refund Worker](refund-worker.md) — Compensates on failure {kind: compensation}
