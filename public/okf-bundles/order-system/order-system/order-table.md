---
type: Amazon DynamoDB
title: Order Table
description: Stores order records.
level: container
aws_resource_type: AWS::DynamoDB::Table
---

# Schema

- billingMode: PAY_PER_REQUEST
- partitionKey: orderId
