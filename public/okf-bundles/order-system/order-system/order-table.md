---
type: Amazon DynamoDB
title: Order Table
description: Stores order records.
level: container
aws_resource_type: AWS::DynamoDB::Table
ddd_context: Orders
owner: Orders Team
---

# Schema

- billingMode: PAY_PER_REQUEST
- partitionKey: orderId
