

# -----------------------------------------------------------------------------------------------------------
# Grant the log parsing lambda access to the logs bucket

resource "aws_lambda_permission" "allow_bucket" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.logs_parser.arn
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.logs.arn
}


# -----------------------------------------------------------------------------------------------------------
# Log Parsing Lambda

data "archive_file" "logs_parser" {
  type        = "zip"
  source_dir  = "${path.module}/files/decorate"
  output_path = "${path.module}/files/decorate.zip"
}

resource "aws_lambda_function" "logs_parser" {
  filename      = data.archive_file.logs_parser.output_path
  function_name = "${var.site}-logs-decorator"
  handler       = "index.handler"
  source_code_hash = data.archive_file.logs_parser.output_base64sha256
  runtime = "nodejs12.x"
  memory_size = "128"
  timeout = "5"
  role = aws_iam_role.lambda.arn

  tags = {
    Name   = "${var.site}-log-dist"
    Site = var.site
  }
}

resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = aws_s3_bucket.logs.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.logs_parser.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "RAW/"
    filter_suffix       = ".gz"
  }
}

# Reduce log retention to two weeks
resource "aws_cloudwatch_log_group" "logs_parser" {
  name              = "/aws/lambda/${aws_lambda_function.logs_parser.function_name}"
  retention_in_days = 14
}


# -----------------------------------------------------------------------------------------------------------
# Athena Configuration

resource "aws_s3_bucket" "athena" {
  bucket = "${var.site}-athena"
  acl = "private"
  tags = {
    Name = "${var.site}-athena"
    Site = var.site
  }
}

resource "aws_athena_workgroup" "wg" {
  name = "${var.site}-wg"
  tags = {
    Name = "${var.site}-wg"
    Site = var.site
  }
}

resource "aws_athena_database" "db" {
  name = var.site
  bucket = aws_s3_bucket.athena.id
}
