

# -----------------------------------------------------------------------------------------------------------
# Grant the log parsing lambda access to the logs bucket

resource "aws_lambda_permission" "s3_bucket_invoke_function" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ipixel_parser.arn
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.ipixel_logs.arn
}


# -----------------------------------------------------------------------------------------------------------
# Log Parsing Lambda


resource "aws_s3_bucket_notification" "ipixel_logs" {
  bucket = aws_s3_bucket.ipixel_logs.bucket

  lambda_function {
    lambda_function_arn = aws_lambda_function.ipixel_parser.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "RAW/"
    filter_suffix       = ".gz"
  }

  depends_on = [aws_lambda_permission.s3_bucket_invoke_function]
}

data "archive_file" "ipixel_parser" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = ".terraform/tmp/lambda/ipixel_parser.zip"
}

resource "aws_lambda_function" "ipixel_parser" {
  function_name = "ipixel-parser-${var.site}"

  runtime                        = "nodejs12.x"
  handler                        = "index.handler"
  timeout                        = 5
  reserved_concurrent_executions = 3

  environment {
    variables = {
      CLOUDWATCH_LOGS_GROUP_ARN = aws_cloudwatch_log_group.ipixel_results.arn
    }
  }

  role = aws_iam_role.ipixel_parser.arn

  filename         = data.archive_file.ipixel_parser.output_path
  source_code_hash = data.archive_file.ipixel_parser.output_base64sha256

  tags = {
    Site = var.site,
    Role = "ipixel"
  }

  depends_on = [
    aws_cloudwatch_log_group.ipixel_parser_logs,
    aws_cloudwatch_log_group.ipixel_results,
  ]
}
