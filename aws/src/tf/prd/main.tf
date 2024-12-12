terraform {
  backend "s3" {
    bucket = "ppl-tf-state"
    key = "prd"
    region = "eu-central-1"
  }
}

module "main" {
  source = "../main"
  environment = "prd"
  domain = "ppl.daan.se"
  zone_id = "Z03939243KT7G9JBEYEX5"
  ui-cache-policy-id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
}
