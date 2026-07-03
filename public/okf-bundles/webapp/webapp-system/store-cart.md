---
type: Redux Slice
title: Cart Slice
level: container
technology: Redux Toolkit
icon: fe-store.svg
aws_resource_type: Redux Slice
---

# Schema

- actions: addItem, removeItem, clear, applyCoupon
- persistence: localStorage (redux-persist)
- middleware: listenerMiddleware (analytics)

# Relations

- [Carrinho](screen-cart.md) — selector cartItems (re-render) {kind: async-event}
