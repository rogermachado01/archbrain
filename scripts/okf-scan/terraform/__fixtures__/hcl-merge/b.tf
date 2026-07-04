resource "aws_dynamodb_table" "payments_table" {
  name         = "payments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
}
