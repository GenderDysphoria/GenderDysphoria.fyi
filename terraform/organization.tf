
resource "aws_organizations_organization" "org" {
  aws_service_access_principals = [
    "cloudtrail.amazonaws.com",
    "config.amazonaws.com",
  ]

  feature_set = "ALL"
}

data "aws_organizations_organization" "gdb" {}

resource "aws_organizations_organizational_unit" "gdb" {
  name      = "Gender Dysphoria Bible"
  parent_id = data.aws_organizations_organization.gdb.roots[0].id
}

resource "aws_organizations_account" "account" {
  name  = "gdb-manage"
  email = "aws@genderdysphoria.fyi"
  parent_id = aws_organizations_organizational_unit.gdb.id
}
