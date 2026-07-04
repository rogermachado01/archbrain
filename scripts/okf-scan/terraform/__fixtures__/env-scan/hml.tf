resource "aws_lambda_function" "orders_hml_only" {
  function_name = "orders-hml-only"
  runtime       = "nodejs20.x"
}
