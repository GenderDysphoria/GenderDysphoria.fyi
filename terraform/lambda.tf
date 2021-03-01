

# -----------------------------------------------------------------------------------------------------------
# IAM Role for Redirect Lambda

resource "aws_iam_role" "lambda_redirect" {
  name = "${var.site}-lambda-redirect-role"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": [
          "edgelambda.amazonaws.com",
          "lambda.amazonaws.com"
        ]
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF

  tags = {
    Site = var.site
  }
}


# -----------------------------------------------------------------------------------------------------------
# IAM Role for Log Parsing Lambda

data "aws_iam_policy_document" "s3_bucket_readonly" {
  statement {
    actions = [
      "s3:Get*",
      "s3:List*",
    ]

    resources = [
      aws_s3_bucket.ipixel_logs.arn,
      "${aws_s3_bucket.ipixel_logs.arn}/*",
    ]
  }
}

data "aws_iam_policy_document" "lambda_assume_role" {
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




resource "aws_iam_role" "ipixel_parser" {
  name = "lambda-${var.site}-ipixel"

  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Site = var.site,
    Role = "ipixel"
  }
}

resource "aws_iam_role_policy_attachment" "ipixel_parser" {
  role       = aws_iam_role.ipixel_parser.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "ipixel_parser_cloudwatch_log_group" {
  name   = "cloudwatch-log-group"
  role   = aws_iam_role.ipixel_parser.name
  policy = data.aws_iam_policy_document.ipixel_parser_cloudwatch_log_group.json
}

resource "aws_iam_role_policy" "lambda_s3_bucket_readonly" {
  name   = "s3-bucket-readonly"
  role   = aws_iam_role.ipixel_parser.name
  policy = data.aws_iam_policy_document.s3_bucket_readonly.json
}

resource "aws_lambda_permission" "s3_bucket_invoke_function" {
  function_name = aws_lambda_function.ipixel_parser.arn
  action        = "lambda:InvokeFunction"

  principal  = "s3.amazonaws.com"
  source_arn = aws_s3_bucket.ipixel_logs.arn
}

