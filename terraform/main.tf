locals {
  name_prefix    = "f4f-operations-${var.environment}"
  frontend_path  = abspath("${path.module}/../frontend")
  frontend_files = fileset(local.frontend_path, "**/*")
  content_types = {
    css  = "text/css"
    html = "text/html"
    js   = "application/javascript"
    png  = "image/png"
    svg  = "image/svg+xml"
    webp = "image/webp"
  }
  tags = {
    Project     = "Project-06"
    Application = "F4F Operations Dashboard"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

data "archive_file" "health" {
  count       = var.deploy_dashboard ? 1 : 0
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambda/health"
  output_path = "${path.module}/.terraform/${local.name_prefix}-health.zip"
}

data "archive_file" "leads" {
  count       = var.deploy_dashboard ? 1 : 0
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambda/leads"
  output_path = "${path.module}/.terraform/${local.name_prefix}-leads.zip"
}

resource "aws_s3_bucket" "frontend" {
  count  = var.deploy_dashboard ? 1 : 0
  bucket = var.dashboard_bucket_name
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  count                   = var.deploy_dashboard ? 1 : 0
  bucket                  = aws_s3_bucket.frontend[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  count  = var.deploy_dashboard ? 1 : 0
  bucket = aws_s3_bucket.frontend[0].id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  count  = var.deploy_dashboard ? 1 : 0
  bucket = aws_s3_bucket.frontend[0].id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  count  = var.deploy_dashboard ? 1 : 0
  bucket = aws_s3_bucket.frontend[0].id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_object" "frontend" {
  for_each      = var.deploy_dashboard ? local.frontend_files : toset([])
  bucket        = aws_s3_bucket.frontend[0].id
  key           = each.value
  source        = "${local.frontend_path}/${each.value}"
  etag          = filemd5("${local.frontend_path}/${each.value}")
  content_type  = lookup(local.content_types, lower(element(split(".", each.value), length(split(".", each.value)) - 1)), "application/octet-stream")
  cache_control = endswith(each.value, ".html") || endswith(each.value, ".js") ? "no-cache, must-revalidate" : "public, max-age=3600, must-revalidate"
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  count                             = var.deploy_dashboard ? 1 : 0
  name                              = "${local.name_prefix}-oac"
  description                       = "Private access to the F4F operations dashboard frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_response_headers_policy" "security" {
  count = var.deploy_dashboard ? 1 : 0
  name  = "${local.name_prefix}-security"
  security_headers_config {
    content_type_options { override = true }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "no-referrer"
      override        = true
    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = false
      override                   = true
    }
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }
  custom_headers_config {
    items {
      header   = "Content-Security-Policy"
      override = true
      value    = "default-src 'self'; connect-src 'self' https://*.execute-api.us-east-1.amazonaws.com; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    }
    items {
      header   = "Permissions-Policy"
      override = true
      value    = "camera=(), microphone=(), geolocation=(), payment=()"
    }
  }
}

resource "aws_cloudfront_distribution" "frontend" {
  count               = var.deploy_dashboard ? 1 : 0
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  origin {
    domain_name              = aws_s3_bucket.frontend[0].bucket_regional_domain_name
    origin_id                = "private-dashboard-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend[0].id
  }
  default_cache_behavior {
    target_origin_id           = "private-dashboard-s3"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD", "OPTIONS"]
    compress                   = true
    cache_policy_id            = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security[0].id
  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }
  tags = local.tags
}

data "aws_iam_policy_document" "frontend" {
  count = var.deploy_dashboard ? 1 : 0
  statement {
    sid       = "AllowCloudFrontReadOnly"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend[0].arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend[0].arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  count  = var.deploy_dashboard ? 1 : 0
  bucket = aws_s3_bucket.frontend[0].id
  policy = data.aws_iam_policy_document.frontend[0].json
}

resource "aws_cognito_user_pool" "dashboard" {
  count                    = var.deploy_dashboard ? 1 : 0
  name                     = "${local.name_prefix}-users"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  mfa_configuration        = "OPTIONAL"
  software_token_mfa_configuration { enabled = true }
  password_policy {
    minimum_length                   = 14
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 3
  }
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
  user_pool_add_ons { advanced_security_mode = "ENFORCED" }
  tags = local.tags
}

resource "aws_cognito_user_pool_client" "dashboard" {
  count                                = var.deploy_dashboard ? 1 : 0
  name                                 = "${local.name_prefix}-web"
  user_pool_id                         = aws_cognito_user_pool.dashboard[0].id
  generate_secret                      = false
  prevent_user_existence_errors        = "ENABLED"
  supported_identity_providers         = ["COGNITO"]
  explicit_auth_flows                  = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  access_token_validity                = 15
  id_token_validity                    = 15
  refresh_token_validity               = 1
  enable_token_revocation              = true
  allowed_oauth_flows_user_pool_client = false
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_group" "owners" {
  count        = var.deploy_dashboard ? 1 : 0
  name         = "OwnerAdmin"
  user_pool_id = aws_cognito_user_pool.dashboard[0].id
  description  = "F4F owners and administrators"
  precedence   = 1
}

resource "aws_cognito_user_group" "coaches" {
  count        = var.deploy_dashboard ? 1 : 0
  name         = "Coach"
  user_pool_id = aws_cognito_user_pool.dashboard[0].id
  description  = "Future least-privilege coaching role"
  precedence   = 10
}

resource "aws_iam_role" "lambda" {
  count              = var.deploy_dashboard ? 1 : 0
  name               = "${local.name_prefix}-lambda-role"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }] })
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  count      = var.deploy_dashboard ? 1 : 0
  role       = aws_iam_role.lambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lead_read" {
  count = var.deploy_dashboard ? 1 : 0
  statement {
    sid       = "ReadExistingLeadTable"
    actions   = ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan"]
    resources = [var.existing_leads_table_arn]
  }
}

resource "aws_iam_role_policy" "lead_read" {
  count  = var.deploy_dashboard ? 1 : 0
  name   = "${local.name_prefix}-read-existing-leads"
  role   = aws_iam_role.lambda[0].id
  policy = data.aws_iam_policy_document.lead_read[0].json
}

resource "aws_lambda_function" "health" {
  count            = var.deploy_dashboard ? 1 : 0
  function_name    = "${local.name_prefix}-health"
  role             = aws_iam_role.lambda[0].arn
  runtime          = "python3.13"
  handler          = "lambda_function.lambda_handler"
  filename         = data.archive_file.health[0].output_path
  source_code_hash = data.archive_file.health[0].output_base64sha256
  timeout          = 5
  memory_size      = 128
  tags             = local.tags
}

resource "aws_lambda_function" "leads" {
  count            = var.deploy_dashboard ? 1 : 0
  function_name    = "${local.name_prefix}-leads"
  role             = aws_iam_role.lambda[0].arn
  runtime          = "python3.13"
  handler          = "lambda_function.lambda_handler"
  filename         = data.archive_file.leads[0].output_path
  source_code_hash = data.archive_file.leads[0].output_base64sha256
  timeout          = 10
  memory_size      = 256
  environment {
    variables = {
      LEADS_TABLE_NAME = var.existing_leads_table_name
      MAX_RESULTS      = "50"
    }
  }
  tags = local.tags
}

resource "aws_cloudwatch_log_group" "health" {
  count             = var.deploy_dashboard ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.health[0].function_name}"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "leads" {
  count             = var.deploy_dashboard ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.leads[0].function_name}"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

resource "aws_apigatewayv2_api" "dashboard" {
  count         = var.deploy_dashboard ? 1 : 0
  name          = "${local.name_prefix}-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_credentials = false
    allow_headers     = ["authorization", "content-type"]
    allow_methods     = ["GET"]
    allow_origins     = var.allowed_origins
    max_age           = 300
  }
  tags = local.tags
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  count            = var.deploy_dashboard ? 1 : 0
  api_id           = aws_apigatewayv2_api.dashboard[0].id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-dashboard-users"
  jwt_configuration {
    audience = [aws_cognito_user_pool_client.dashboard[0].id]
    issuer   = "https://${aws_cognito_user_pool.dashboard[0].endpoint}"
  }
}

resource "aws_apigatewayv2_integration" "health" {
  count                  = var.deploy_dashboard ? 1 : 0
  api_id                 = aws_apigatewayv2_api.dashboard[0].id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.health[0].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "leads" {
  count                  = var.deploy_dashboard ? 1 : 0
  api_id                 = aws_apigatewayv2_api.dashboard[0].id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.leads[0].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "health" {
  count              = var.deploy_dashboard ? 1 : 0
  api_id             = aws_apigatewayv2_api.dashboard[0].id
  route_key          = "GET /health"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito[0].id
  target             = "integrations/${aws_apigatewayv2_integration.health[0].id}"
}

resource "aws_apigatewayv2_route" "leads" {
  count              = var.deploy_dashboard ? 1 : 0
  api_id             = aws_apigatewayv2_api.dashboard[0].id
  route_key          = "GET /leads"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito[0].id
  target             = "integrations/${aws_apigatewayv2_integration.leads[0].id}"
}

resource "aws_apigatewayv2_stage" "dashboard" {
  count       = var.deploy_dashboard ? 1 : 0
  api_id      = aws_apigatewayv2_api.dashboard[0].id
  name        = "$default"
  auto_deploy = true
  default_route_settings {
    detailed_metrics_enabled = true
    throttling_burst_limit   = 20
    throttling_rate_limit    = 10
  }
  tags = local.tags
}

resource "aws_lambda_permission" "health_api" {
  count         = var.deploy_dashboard ? 1 : 0
  statement_id  = "AllowDashboardApiHealth"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health[0].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.dashboard[0].execution_arn}/*/GET/health"
}

resource "aws_lambda_permission" "leads_api" {
  count         = var.deploy_dashboard ? 1 : 0
  statement_id  = "AllowDashboardApiLeads"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.leads[0].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.dashboard[0].execution_arn}/*/GET/leads"
}
