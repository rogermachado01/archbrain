---
type: React Route
title: Checkout
description: Formulário de pagamento e confirmação do pedido.
level: container
icon: fe-screen.svg
---

Seus componentes vivem no diretório `screen-checkout/` ao lado deste arquivo.

# Relations

- [Cart Slice](store-cart.md) — dispatch checkout {kind: async-event}
- [Orders Service](svc-orders.md) — envia pedido {kind: sync}
- [Cart Slice](store-cart.md) — rollback optimistic update (pedido falhou) {kind: compensation}
- [Design System](ds-components.md) — compõe UI {kind: sync}
