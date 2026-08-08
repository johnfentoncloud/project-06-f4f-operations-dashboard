variable "aws_region" {
  description = "AWS region for the dashboard application."
  type        = string
  default     = "us-east-1"
}

variable "deploy_dashboard" {
  description = "Explicit deployment approval gate. Keep false during Phase 1 local development."
  type        = bool
  default     = false
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
    condition     = !var.deploy_dashboard || length(var.dashboard_bucket_name) >= 3
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
    condition     = !var.deploy_dashboard || can(regex("^arn:aws:dynamodb:[a-z0-9-]+:[0-9]{12}:table/", var.existing_leads_table_arn))
    error_message = "Provide the exact existing lead-table ARN before enabling deployment."
  }
}

variable "allowed_origins" {
  description = "Dashboard origins allowed by API Gateway CORS."
  type        = list(string)
  default     = ["http://localhost:8080", "http://127.0.0.1:8080"]
}

variable "log_retention_days" {
  description = "CloudWatch log retention for dashboard Lambda functions."
  type        = number
  default     = 30
}
