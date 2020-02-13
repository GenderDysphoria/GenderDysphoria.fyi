
# -----------------------------------------------------------------------------------------------------------
# Website SSL Certificate

resource "aws_acm_certificate" "cert" {
  domain_name       = var.domain
  validation_method = "DNS"

  subject_alternative_names = formatlist("%s.%s",
    var.subdomains,
    var.domain,
  )

  tags = {
    Name = "Site Certificate"
    Site = var.site
    Category = "SSL"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  count   = length(aws_acm_certificate.cert.subject_alternative_names) + 1
  zone_id = aws_route53_zone.zone.id
  ttl     = 60

  name    = aws_acm_certificate.cert.domain_validation_options[count.index].resource_record_name
  type    = aws_acm_certificate.cert.domain_validation_options[count.index].resource_record_type
  records = [aws_acm_certificate.cert.domain_validation_options[count.index].resource_record_value]
}

resource "aws_acm_certificate_validation" "cert" {
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = aws_route53_record.cert_validation[*].fqdn
}
