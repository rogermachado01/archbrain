---
type: Amazon Simple Queue Service
title: Order Queue
description: Buffers refund-check events for asynchronous processing.
level: container
aws_resource_type: AWS::SQS::Queue
ddd_context: Orders
owner: Orders Team
---

# Schema

- visibilityTimeout: 30
- fifo: false

# Relations

- [Refund Worker](refund-worker.md) — RefundRequested {kind: async-event}
