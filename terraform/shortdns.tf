
# Site DNS Zone and extra domains
# -----------------------------------------------------------------------------------------------------------

# aws_route53_zone.zone
resource "aws_route53_zone" "short_redirect" {
  name = var.shortdomain

  tags = {
    Site = var.site
    Category = "DNS"
  }
}

# namecheap_domain_records.zone
resource "namecheap_domain_records" "short_redirect" {
  domain = var.shortdomain
  mode = "OVERWRITE"

  nameservers = aws_route53_zone.short_redirect.name_servers
}


# -----------------------------------------------------------------------------------------------------------
# SSL Certificate

# aws_acm_certificate.cert
resource "aws_acm_certificate" "shortcert" {
  domain_name       = var.shortdomain
  validation_method = "DNS"

  subject_alternative_names = [
    "www.${var.shortdomain}",
  ]

  tags = {
    Name = "Site Certificate"
    Site = var.site
    Category = "SSL"
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    namecheap_domain_records.short_redirect,
  ]
}

resource "aws_route53_record" "shortcert" {
  count = length(aws_acm_certificate.shortcert.domain_validation_options)

  zone_id = aws_route53_zone.short_redirect.id
  name    = element(aws_acm_certificate.shortcert.domain_validation_options.*.resource_record_name, count.index)
  type    = element(aws_acm_certificate.shortcert.domain_validation_options.*.resource_record_type, count.index)
  records = [element(aws_acm_certificate.shortcert.domain_validation_options.*.resource_record_value, count.index)]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "shortcert" {
  certificate_arn         = aws_acm_certificate.shortcert.arn
  validation_record_fqdns = aws_route53_record.shortcert.*.fqdn
}

# -----------------------------------------------------------------------------------------------------------
# Redirection Bucket


data "aws_iam_policy_document" "cloudfront_access" {
  statement {
    sid = "AllowCFOriginAccess"

    actions = [
      "s3:GetObject",
    ]

    resources = [
      "${aws_s3_bucket.short_redirect.arn}/*",
    ]

    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }
}

resource "aws_s3_bucket_policy" "cloudfront_access" {
  bucket = aws_s3_bucket.short_redirect.id
  policy = data.aws_iam_policy_document.cloudfront_access.json
}

resource "aws_s3_bucket" "short_redirect" {
  bucket = "${var.shortdomain}"
}


resource "aws_s3_bucket_acl" "short_redirect" {
  bucket = aws_s3_bucket.short_redirect.id
  acl    = "public-read"
}

resource "aws_s3_bucket_website_configuration" "short_redirect" {
  bucket = aws_s3_bucket.short_redirect.bucket

  redirect_all_requests_to {
    host_name = var.domain
    protocol = "https"
  }
}


resource "aws_cloudfront_distribution" "short_redirect" {
  origin {
    domain_name = aws_s3_bucket.short_redirect.bucket_regional_domain_name
    origin_id   = aws_s3_bucket.short_redirect.bucket

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["SSLv3", "TLSv1", "TLSv1.1", "TLSv1.2"]
    }
  }

  comment         = aws_s3_bucket.short_redirect.bucket
  enabled         = true
  is_ipv6_enabled = false

  aliases = ["www.${var.shortdomain}", var.shortdomain]

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = aws_s3_bucket.short_redirect.bucket
    compress         = true

    min_ttl     = 31536000
    max_ttl     = 31536000
    default_ttl = 31536000

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = aws_lambda_function.short_redirect.qualified_arn
      include_body = false
    }

    viewer_protocol_policy = "allow-all"
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.shortcert.arn
    ssl_support_method  = "sni-only"
  }

  wait_for_deployment = false
  depends_on          = [aws_acm_certificate_validation.shortcert]
}

resource "aws_route53_record" "short_redirect_site" {
  name    = var.shortdomain
  zone_id = aws_route53_zone.short_redirect.zone_id
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.short_redirect.domain_name
    zone_id                = aws_cloudfront_distribution.short_redirect.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "short_redirect_www" {
  name    = "www.${var.shortdomain}"
  zone_id = aws_route53_zone.short_redirect.zone_id
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.short_redirect.domain_name
    zone_id                = aws_cloudfront_distribution.short_redirect.hosted_zone_id
    evaluate_target_health = false
  }
}



# -----------------------------------------------------------------------------------------------------------
# Lambda Redirect

data "archive_file" "short_redirect" {
  type        = "zip"
  output_path = ".terraform/tmp/lambda/shortdns.zip"
  source_file = "${path.module}/shortdns.js"
}

resource "aws_lambda_function" "short_redirect" {
  description      = "index.html subdirectory redirect"
  function_name    = "${var.site}-short-redirect"
  handler          = "shortdns.handler"

  filename         = data.archive_file.short_redirect.output_path
  source_code_hash = data.archive_file.short_redirect.output_base64sha256

  publish          = true
  role             = aws_iam_role.lambda_redirect.arn
  runtime          = "nodejs16.x"

  tags = {
    Name   = "${var.site}-short"
    Site = var.site
  }
}

