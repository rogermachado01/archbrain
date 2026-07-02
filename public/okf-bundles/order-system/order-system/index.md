# Containers

- [API Gateway](api.md) - public entry point
- [Order Processor](order-processor.md) - core Lambda handling orders
- [Order Queue](order-queue.md) - async fan-out for refund checks
- [Order Table](order-table.md) - order records
- [Refund Worker](refund-worker.md) - compensating transaction
