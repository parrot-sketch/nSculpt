terraform {
  backend "s3" {
    bucket         = "parrot-infra-terraform-state"
    key            = "global/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "parrot-terraform-locks"
    encrypt        = true
  }
}
