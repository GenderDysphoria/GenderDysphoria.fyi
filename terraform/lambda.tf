

# -----------------------------------------------------------------------------------------------------------
# IAM Role for Redirect Lambda

data "aws_iam_policy_document" "lambda_redirect" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = [
        "edgelambda.amazonaws.com",
        "lambda.amazonaws.com"
      ]
    }
  }
}

resource "aws_iam_role" "lambda_redirect" {
  name = "${var.site}-lambda-redirect-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_redirect.json

  tags = {
    Site = var.site
  }
}

#######################################################
# LOGGING POLICY

data "aws_iam_policy_document" "lambda_logging" {
  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:CreateLogGroup"
    ]

    resources = [ "arn:aws:logs:*:*:*" ]
  }
}

resource "aws_iam_policy" "lambda_logging" {
  name        = "${var.site}_lambda_logging"
  path        = "/"
  description = "IAM policy for logging from a lambda"

  policy = data.aws_iam_policy_document.lambda_logging.json
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_redirect.name
  policy_arn = aws_iam_policy.lambda_logging.arn
}

#######################################################
# REPLICATION POLICY

# aws_iam_policy_document.lambda_replication
data "aws_iam_policy_document" "lambda_replication" {
  statement {
    actions = [
      "lambda:EnableReplication*",
    ]
    resources = [
      "*"
    ]
  }

  statement {
    actions = [
      "iam:CreateServiceLinkedRole"
    ]
    resources = [
      "arn:aws:iam::*:role/aws-service-role/events.amazonaws.com/AWSServiceRoleForCloudWatchEvents*"
    ]
    condition {
      test = "StringLike"
      variable = "iam:AWSServiceName"
      values = ["events.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "lambda_replication" {
  name        = "${var.site}_lambda_replication"
  path        = "/"
  description = "IAM policy for replication by lambda@edge"

  policy = data.aws_iam_policy_document.lambda_replication.json
}

resource "aws_iam_role_policy_attachment" "lambda_replication" {
  role       = aws_iam_role.lambda_redirect.name
  policy_arn = aws_iam_policy.lambda_replication.arn
}

