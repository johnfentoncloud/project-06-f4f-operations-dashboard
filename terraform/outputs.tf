output "cloudfront_domain_name" {
  description = "CloudFront hostname after deployment approval. No custom DNS is created."
  value       = var.deploy_dashboard ? aws_cloudfront_distribution.frontend[0].domain_name : null
}

output "api_endpoint" {
  description = "Authenticated dashboard API endpoint after deployment approval."
  value       = var.deploy_dashboard ? aws_apigatewayv2_api.dashboard[0].api_endpoint : null
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID after deployment approval. This is an identifier, not a secret."
  value       = var.deploy_dashboard ? aws_cognito_user_pool.dashboard[0].id : null
}

output "cognito_user_pool_client_id" {
  description = "Public browser client ID after deployment approval. No client secret is generated."
  value       = var.deploy_dashboard ? aws_cognito_user_pool_client.dashboard[0].id : null
}
