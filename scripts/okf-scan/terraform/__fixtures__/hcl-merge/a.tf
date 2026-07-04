resource "aws_dynamodb_table" "orders_table" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
}
