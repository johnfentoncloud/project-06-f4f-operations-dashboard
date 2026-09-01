output "cloudfront_domain_name" {
  description = "CloudFront hostname after deployment approval. No custom DNS is created."
  value       = local.application_enabled ? aws_cloudfront_distribution.frontend[0].domain_name : null
}

output "api_endpoint" {
  description = "Authenticated dashboard API endpoint after deployment approval."
  value       = local.application_enabled ? aws_apigatewayv2_api.dashboard[0].api_endpoint : null
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID after deployment approval. This is an identifier, not a secret."
  value       = local.application_enabled ? aws_cognito_user_pool.dashboard[0].id : null
}

output "cognito_user_pool_client_id" {
  description = "Public browser client ID after deployment approval. No client secret is generated."
  value       = local.application_enabled ? aws_cognito_user_pool_client.dashboard[0].id : null
}

output "dashboard_certificate_arn" {
  description = "ACM certificate ARN requested in us-east-1 for the permanent application hostname."
  value       = local.certificate_enabled ? aws_acm_certificate.dashboard[0].arn : null
}

output "dashboard_certificate_validation_records" {
  description = "CNAME records to add manually in Porkbun before the application stage."
  value = local.certificate_enabled ? {
    for option in aws_acm_certificate.dashboard[0].domain_validation_options : option.domain_name => {
      name  = option.resource_record_name
      type  = option.resource_record_type
      value = option.resource_record_value
    }
  } : {}
}

output "dashboard_dns_target" {
  description = "Create a Porkbun CNAME for dashboard only after CloudFront is deployed."
  value       = local.application_enabled ? aws_cloudfront_distribution.frontend[0].domain_name : null
}

output "monitoring_alert_topic_arn" {
  description = "Dedicated Project 06 operational-alert topic ARN."
  value       = local.application_enabled ? aws_sns_topic.monitoring_alerts[0].arn : null
}
