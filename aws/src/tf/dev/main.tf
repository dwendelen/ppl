terraform {
  backend "s3" {
    bucket = "ppl-tf-state"
    key = "dev"
    region = "eu-central-1"
  }
}

module "main" {
  source = "../main"
  environment = "dev"
  domain = "dev.ppl.daan.se"
  zone_id = "Z03939243KT7G9JBEYEX5"
  ui-cache-policy-id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
}
