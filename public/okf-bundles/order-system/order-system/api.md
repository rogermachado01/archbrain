---
type: Amazon API Gateway
title: API Gateway
description: Public REST entry point for the order system.
level: container
aws_resource_type: AWS::ApiGateway::RestApi
ddd_context: Orders
owner: Orders Team
---

# Schema

- endpointType: REGIONAL
- throttlingRateLimit: 1000

# Relations

- [Order Processor](order-processor.md) — Invokes
