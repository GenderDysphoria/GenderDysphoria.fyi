data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

resource "aws_cloudwatch_log_group" "ipixel_results" {
  name = "/aws/ipixel/${var.site}"

  retention_in_days = 30

  tags = {
    Site = var.site,
    Role = "ipixel"
  }
}

data "aws_iam_policy_document" "logs_cloudwatch_log_group" {
  statement {
    actions   = ["logs:DescribeLogStreams"]
    resources = ["arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"]
  }

  statement {
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.ipixel_results.arn}:*"]
  }
}

resource "aws_cloudwatch_log_group" "ipixel_parser_logs" {
  name = "/aws/ipixel_parser/${var.site}"

  retention_in_days = 3

  tags = {
    Site = var.site,
    Role = "ipixel"
  }
}

data "aws_iam_policy_document" "ipixel_parser_cloudwatch_log_group" {
  statement {
    actions   = ["logs:DescribeLogStreams"]
    resources = ["arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"]
  }

  statement {
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.ipixel_parser_logs.arn}:*"]
  }
}
