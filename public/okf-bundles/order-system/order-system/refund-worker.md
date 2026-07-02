---
type: AWS Lambda Function
title: Refund Worker
description: Compensating transaction that reverts an order when the saga fails.
level: container
aws_resource_type: AWS::Lambda::Function
group: ../groups/region-use1/vpc-main/az-a/subnet-private-a.md
---

# Schema

- runtime: nodejs20.x
- memorySize: 256
- timeout: 10

# Relations

- [Order Table](order-table.md) — Reverts order status
