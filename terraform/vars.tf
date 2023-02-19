
variable "region" {
  type = string
  description = "AWS Hosting Region"
  default = "us-east-1"
}

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

variable "shortdomain" {
  type = string
  default = "gdb.fyi"
}

variable "subdomains" {
    type = list
    default = [
        "www",
        "t"
    ]
}

variable "namecheap" {
  type = map
  description = "Namecheap Credentials"
  default = {
    username = ""
    apikey = ""
  }

  validation {
    condition     = length(var.namecheap.username) > 0
    error_message = "Must provide a namecheap configuration."
  }
}