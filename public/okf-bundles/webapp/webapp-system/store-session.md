---
type: React Context
title: Session Store
level: container
technology: React Context
icon: fe-store.svg
aws_resource_type: React Context
---

# Schema

- state: user, accessToken, expiresAt
- refreshStrategy: silent refresh on 401

# Relations

- [Amazon Cognito](../cognito.md) — refresh token {kind: sync}
