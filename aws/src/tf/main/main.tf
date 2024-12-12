terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~>5.46"
    }
  }
}

provider "aws" {
  profile = "default"
  region = "eu-central-1"
}

provider "aws" {
  alias = "us-east-1"
  profile = "default"
  region = "us-east-1"
}

variable "environment" {
  type = string
}

variable "zone_id" {
  type = string
}

variable "ui-cache-policy-id" {
  type = string
}

variable "domain" {
  type = string
}

locals {
  default-name = "ppl-${var.environment}"
  ui-domain-name = var.domain
  default-tags = {
    application: "ppl"
    environment: var.environment
  }
}
