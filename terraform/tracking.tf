

# -----------------------------------------------------------------------------------------------------------
# Bucket for holding the tracking pixel file

resource "aws_s3_bucket" "pixel" {
  bucket = "t.${var.domain}"
  acl    = "public-read"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }

  tags = {
    Name = "Tracking Pixel"
    Site = var.site
  }
}

resource "aws_s3_bucket_object" "ipixel" {
  bucket       = aws_s3_bucket.pixel.bucket
  key          = "i"
  source       = "${path.module}/files/i.gif"
  etag         = filemd5("${path.module}/files/i.gif")
  acl          = "public-read"
  content_type = "image/gif"
}

resource "aws_s3_bucket" "logs" {
  bucket = "${var.site}-analytics"

  tags = {
    Name = "Logs Storage"
    Site = var.site
  }
}

# -----------------------------------------------------------------------------------------------------------
# Cloudfront Configuration for the tracking pixel

resource "aws_cloudfront_distribution" "tracking" {
  origin {
    domain_name = aws_s3_bucket.pixel.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.pixel.bucket}"
  }

  enabled         = true
  is_ipv6_enabled = true
  comment         = "Cloudfront distribution for tracking pixel"

  logging_config {
    include_cookies = true
    bucket          = aws_s3_bucket.logs.bucket_regional_domain_name
    prefix          = "RAW"
  }

  aliases = [
    "t.${var.domain}"
  ]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.pixel.bucket}"

    forwarded_values {
      query_string = true

      cookies {
        forward = "all"
      }

      headers = [
        "Origin",
        "Access-Control-Request-Headers",
        "Access-Control-Request-Method",
      ]
    }

    viewer_protocol_policy = "allow-all"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.cert.arn
    ssl_support_method  = "sni-only"
  }

  tags = {
    Name = "Tracking Site"
    Site = var.site
  }
}

resource "aws_route53_record" "tracking" {
  name    = "t.${var.domain}"
  zone_id = aws_route53_zone.zone.zone_id
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.tracking.domain_name
    zone_id                = aws_cloudfront_distribution.tracking.hosted_zone_id
    evaluate_target_health = false
  }
}
