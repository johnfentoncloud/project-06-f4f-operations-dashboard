variable "aws_region" {
  description = "AWS region for the dashboard application."
  type        = string
  default     = "us-east-1"
}

variable "deployment_stage" {
  description = "Approval gate: local creates nothing, certificate requests ACM only, application creates the dashboard after certificate issuance."
  type        = string
  default     = "local"

  validation {
    condition     = contains(["local", "certificate", "application"], var.deployment_stage)
    error_message = "deployment_stage must be local, certificate, or application."
  }
}

variable "environment" {
  description = "Short environment name used in resource names and tags."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod."
  }
}

variable "dashboard_bucket_name" {
  description = "Globally unique private S3 bucket name, required only when deployment is approved."
  type        = string
  default     = ""

  validation {
    condition     = var.deployment_stage != "application" || length(var.dashboard_bucket_name) >= 3
    error_message = "Provide a globally unique dashboard_bucket_name before enabling deployment."
  }
}

variable "existing_leads_table_name" {
  description = "Existing Project 04 DynamoDB table name. Do not create or alter that table here."
  type        = string
  default     = ""
}

variable "existing_leads_table_arn" {
  description = "Exact existing Project 04 DynamoDB table ARN for least-privilege read access."
  type        = string
  default     = ""

  validation {
    condition     = var.deployment_stage != "application" || can(regex("^arn:aws:dynamodb:[a-z0-9-]+:[0-9]{12}:table/", var.existing_leads_table_arn))
    error_message = "Provide the exact existing lead-table ARN before enabling deployment."
  }
}

variable "allowed_origins" {
  description = "Dashboard origins allowed by API Gateway CORS."
  type        = list(string)
  default     = ["https://app.fenton4fitness.com"]
}

variable "dashboard_domain_name" {
  description = "Permanent Athlete Performance Hub hostname. Porkbun DNS remains externally managed."
  type        = string
  default     = "app.fenton4fitness.com"
}

variable "cognito_domain_prefix" {
  description = "Globally unique prefix for the Cognito managed-login domain."
  type        = string
  default     = "f4f-operations-065634457564"
}

variable "log_retention_days" {
  description = "CloudWatch log retention for dashboard Lambda functions."
  type        = number
  default     = 30
}
