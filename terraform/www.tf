
resource "aws_cloudfront_origin_access_identity" "origin_access_identity" {
}

# -----------------------------------------------------------------------------------------------------------
# Cloudfront Configuration

resource "aws_cloudfront_distribution" "site" {
  origin {
    domain_name = aws_s3_bucket_website_configuration.src.website_endpoint
    origin_id   = "S3-Website-${aws_s3_bucket_website_configuration.src.website_endpoint}"

    custom_origin_config {
      origin_protocol_policy = "http-only"
      http_port = "80"
      https_port = "443"
      origin_ssl_protocols = ["SSLv3", "TLSv1", "TLSv1.1", "TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = [
    var.domain,
    "www.${var.domain}"
  ]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Website-${aws_s3_bucket_website_configuration.src.website_endpoint}"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    lambda_function_association {
      event_type   = "origin-request"
      lambda_arn   = aws_lambda_function.index_redirect.qualified_arn
      include_body = false
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn       = aws_acm_certificate.cert.arn
    ssl_support_method        = "sni-only"
    minimum_protocol_version  = "TLSv1.1_2016"
  }

  # viewer_certificate {
  #   cloudfront_default_certificate = true
  # }

  tags = {
    Name = "Main Site"
    Site = var.site
  }
}

# -----------------------------------------------------------------------------------------------------------
# Domains

resource "aws_route53_record" "site" {
  name    = var.domain
  zone_id = aws_route53_zone.zone.zone_id
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  name    = "www.${var.domain}"
  zone_id = aws_route53_zone.zone.zone_id
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

# -----------------------------------------------------------------------------------------------------------
# Lambda Subdirectory index.html Redirect

data "archive_file" "index_redirect" {
  type        = "zip"
  output_path = ".terraform/tmp/lambda/index_redirect.zip"
  source_file = "${path.module}/files/index_redirect.js"
}

resource "aws_lambda_function" "index_redirect" {
  description      = "index.html subdirectory redirect"
  filename         = "${path.module}/files/index_redirect.js.zip"
  function_name    = "${var.site}-index-redirect"
  handler          = "index_redirect.handler"
  # source_code_hash = data.archive_file.index_redirect.output_base64sha256
  publish          = true
  role             = aws_iam_role.lambda_redirect.arn
  runtime          = "nodejs16.x"

  tags = {
    Name   = "${var.site}-index-redirect"
    Site = var.site
  }
}

