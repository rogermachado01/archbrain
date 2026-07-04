resource "aws_lambda_function" "orders" {
  function_name = "orders-dev"
  runtime       = "nodejs20.x"
  memory_size   = 512

  environment {
    variables = {
      ORDERS_TABLE = aws_dynamodb_table.orders_table.name
    }
  }
}
