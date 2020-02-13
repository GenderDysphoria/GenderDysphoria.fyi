

# -----------------------------------------------------------------------------------------------------------
# Site DNS Zone and extra domains

resource "aws_route53_zone" "zone" {
  name = var.domain

  tags = {
    Site = var.site
    Category = "DNS"
  }
}

# -----------------------------------------------------------------------------------------------------------
# Email Domains

resource "aws_route53_record" "mail_exchange" {
  zone_id = aws_route53_zone.zone.zone_id
  name    = ""
  type    = "MX"
  ttl     = 86400

  records = [
    "1 ASPMX.L.GOOGLE.COM",
    "5 ALT1.ASPMX.L.GOOGLE.COM",
    "5 ALT2.ASPMX.L.GOOGLE.COM",
    "10 ASPMX2.GOOGLEMAIL.COM",
    "10 ASPMX3.GOOGLEMAIL.COM",
  ]

}

resource "aws_route53_record" "google_mail_verify" {
  zone_id = aws_route53_zone.zone.zone_id
  name    = ""
  type    = "TXT"
  ttl     = 300

  records = [
    "google-site-verification=qidEaa68dfZvcMDRv-pQdLlTSUpF1TJWiwtaVoGK8s8",
  ]
}


resource "aws_route53_record" "google_mail_secure" {
  zone_id = aws_route53_zone.zone.zone_id
  name    = ""
  type    = "SPF"
  ttl     = 86400

  records = [
    "v=spf1 include:_spf.google.com ~all"
  ]
}

resource "aws_route53_record" "dkim" {
  zone_id = aws_route53_zone.zone.zone_id
  name    = "google._domainkey"
  type    = "TXT"
  ttl     = 300
  records = [
    "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwwirvGkh1h1vMmlK1IEHgs6tlfvkGPv7OLT2yz8hppjTe+sIov8DcBsj3NwotlywotXXgibO5fRJfLHgz0t0eTGeY15c/3K75VnVtKTm4QQ80COU/dCQ1ZbdSmfthEA7w2r0rAEXf20/2J+s8JzCwUidPQfCoYDH+QfSSw\"\"LjOwzSrjBPn+gg2Weh75DxmPHvw1mxA1WD0s+QjZlrLs4hgv41LMJr68Jh5zy+FVRNJAFX1HHVumZDS0StbaDU6r7CvARODQjv+0YMHQRvhDN9LXPp+RGRIegF6ApUM4nEDhDAiM8a/ubUXacX3jMMrSuHgxwhKAk6l0m/LctiNZ943QIDAQAB"
  ]
}
