resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  availability_zone = "us-east-1a"
}

resource "aws_dynamodb_table" "orders_table" {
  name         = "orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
}
