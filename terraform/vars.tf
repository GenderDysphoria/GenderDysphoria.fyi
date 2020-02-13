
variable "site" {
  type = string
  description = "The name of the site"
  default = "gdbible"
}

variable "domain" {
  type = string
  description = "The base domain name of the site that all these belong to."
  default = "genderdysphoria.fyi"
}

variable "subdomains" {
    type = list
    default = [
        "www",
        "t"
    ]
}

provider "aws" {
  profile    = "default"
  region     = "us-east-1"
}
