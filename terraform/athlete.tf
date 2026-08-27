data "archive_file" "athlete_read" {
  count       = local.application_enabled ? 1 : 0
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambda"
  output_path = "${path.module}/.terraform/${local.name_prefix}-athlete-read.zip"
  excludes    = concat(local.lambda_archive_excludes, ["health/**", "leads/**", "training_read/**", "training_write/**", "athlete_admin/**", "athlete_write/**"])
}

data "archive_file" "athlete_write" {
  count       = local.application_enabled ? 1 : 0
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambda"
  output_path = "${path.module}/.terraform/${local.name_prefix}-athlete-write.zip"
  excludes    = concat(local.lambda_archive_excludes, ["health/**", "leads/**", "training_read/**", "training_write/**", "athlete_admin/**", "athlete_read/**"])
}

data "archive_file" "athlete_admin" {
  count       = local.application_enabled ? 1 : 0
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambda"
  output_path = "${path.module}/.terraform/${local.name_prefix}-athlete-admin.zip"
  excludes    = concat(local.lambda_archive_excludes, ["health/**", "leads/**", "training_read/**", "training_write/**", "athlete_read/**", "athlete_write/**"])
}

resource "aws_cognito_user_group" "athletes" {
  count        = local.application_enabled ? 1 : 0
  name         = "Athlete"
  user_pool_id = aws_cognito_user_pool.dashboard[0].id
  description  = "Approved adult F4F beta athletes"
  precedence   = 20
}

resource "aws_dynamodb_table" "athlete_training" {
  count                       = local.application_enabled ? 1 : 0
  name                        = "f4f-athlete-training"
  billing_mode                = "PAY_PER_REQUEST"
  deletion_protection_enabled = true
  hash_key                    = "PK"
  range_key                   = "SK"
  attribute {
    name = "PK"
    type = "S"
  }
  attribute {
    name = "SK"
    type = "S"
  }
  attribute {
    name = "GSI1PK"
    type = "S"
  }
  attribute {
    name = "GSI1SK"
    type = "S"
  }
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "INCLUDE"
    non_key_attributes = [
      "athleteId",
      "displayName",
      "status",
      "adultBeta",
    ]
  }
  point_in_time_recovery {
    enabled = true
  }
  server_side_encryption {
    enabled = true
  }
  tags = local.tags
}

locals {
  lambda_assume_role = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }] })
  athlete_read_routes = toset([
    "GET /me/profile", "GET /me/assignments", "GET /me/assignments/{scheduledDate}/{assignmentId}", "GET /me/sessions/{scheduledDate}/{assignmentId}"
  ])
  athlete_write_routes = toset([
    "POST /me/assignments/{scheduledDate}/{assignmentId}/start", "PUT /me/sessions/{scheduledDate}/{assignmentId}", "POST /me/sessions/{scheduledDate}/{assignmentId}/complete"
  ])
  athlete_admin_routes = toset([
    "GET /athletes", "GET /athletes/{athleteId}", "GET /athletes/{athleteId}/assignments", "POST /athletes/{athleteId}/assignments", "GET /athletes/{athleteId}/sessions/{scheduledDate}/{assignmentId}"
  ])
}

resource "aws_iam_role" "athlete_read_lambda" {
  count              = local.application_enabled ? 1 : 0
  name               = "${local.name_prefix}-athlete-read-role"
  assume_role_policy = local.lambda_assume_role
  tags               = local.tags
}
resource "aws_iam_role" "athlete_write_lambda" {
  count              = local.application_enabled ? 1 : 0
  name               = "${local.name_prefix}-athlete-write-role"
  assume_role_policy = local.lambda_assume_role
  tags               = local.tags
}
resource "aws_iam_role" "athlete_admin_lambda" {
  count              = local.application_enabled ? 1 : 0
  name               = "${local.name_prefix}-athlete-admin-role"
  assume_role_policy = local.lambda_assume_role
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "athlete_read_basic" {
  count      = local.application_enabled ? 1 : 0
  role       = aws_iam_role.athlete_read_lambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy_attachment" "athlete_write_basic" {
  count      = local.application_enabled ? 1 : 0
  role       = aws_iam_role.athlete_write_lambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy_attachment" "athlete_admin_basic" {
  count      = local.application_enabled ? 1 : 0
  role       = aws_iam_role.athlete_admin_lambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "athlete_read" {
  count  = local.application_enabled ? 1 : 0
  name   = "${local.name_prefix}-athlete-read"
  role   = aws_iam_role.athlete_read_lambda[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:Query"], Resource = aws_dynamodb_table.athlete_training[0].arn }] })
}
resource "aws_iam_role_policy" "athlete_write" {
  count  = local.application_enabled ? 1 : 0
  name   = "${local.name_prefix}-athlete-write"
  role   = aws_iam_role.athlete_write_lambda[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:TransactWriteItems"], Resource = aws_dynamodb_table.athlete_training[0].arn }] })
}
resource "aws_iam_role_policy" "athlete_admin" {
  count = local.application_enabled ? 1 : 0
  name  = "${local.name_prefix}-athlete-admin"
  role  = aws_iam_role.athlete_admin_lambda[0].id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"], Resource = [aws_dynamodb_table.athlete_training[0].arn, "${aws_dynamodb_table.athlete_training[0].arn}/index/GSI1"] },
    { Effect = "Allow", Action = ["dynamodb:GetItem"], Resource = aws_dynamodb_table.training_content[0].arn }
  ] })
}

resource "aws_lambda_function" "athlete_read" {
  count            = local.application_enabled ? 1 : 0
  function_name    = "${local.name_prefix}-athlete-read"
  role             = aws_iam_role.athlete_read_lambda[0].arn
  runtime          = "python3.13"
  handler          = "athlete_read.lambda_function.lambda_handler"
  filename         = data.archive_file.athlete_read[0].output_path
  source_code_hash = data.archive_file.athlete_read[0].output_base64sha256
  timeout          = 10
  memory_size      = 256
  environment {
    variables = { ATHLETE_TABLE_NAME = aws_dynamodb_table.athlete_training[0].name }
  }
  tags = local.tags
}
resource "aws_lambda_function" "athlete_write" {
  count            = local.application_enabled ? 1 : 0
  function_name    = "${local.name_prefix}-athlete-write"
  role             = aws_iam_role.athlete_write_lambda[0].arn
  runtime          = "python3.13"
  handler          = "athlete_write.lambda_function.lambda_handler"
  filename         = data.archive_file.athlete_write[0].output_path
  source_code_hash = data.archive_file.athlete_write[0].output_base64sha256
  timeout          = 10
  memory_size      = 256
  environment {
    variables = { ATHLETE_TABLE_NAME = aws_dynamodb_table.athlete_training[0].name }
  }
  tags = local.tags
}
resource "aws_lambda_function" "athlete_admin" {
  count            = local.application_enabled ? 1 : 0
  function_name    = "${local.name_prefix}-athlete-admin"
  role             = aws_iam_role.athlete_admin_lambda[0].arn
  runtime          = "python3.13"
  handler          = "athlete_admin.lambda_function.lambda_handler"
  filename         = data.archive_file.athlete_admin[0].output_path
  source_code_hash = data.archive_file.athlete_admin[0].output_base64sha256
  timeout          = 10
  memory_size      = 256
  environment {
    variables = { ATHLETE_TABLE_NAME = aws_dynamodb_table.athlete_training[0].name, TRAINING_TABLE_NAME = aws_dynamodb_table.training_content[0].name }
  }
  tags = local.tags
}

resource "aws_cloudwatch_log_group" "athlete_read" {
  count             = local.application_enabled ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.athlete_read[0].function_name}"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}
resource "aws_cloudwatch_log_group" "athlete_write" {
  count             = local.application_enabled ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.athlete_write[0].function_name}"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}
resource "aws_cloudwatch_log_group" "athlete_admin" {
  count             = local.application_enabled ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.athlete_admin[0].function_name}"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

resource "aws_apigatewayv2_integration" "athlete_read" {
  count                  = local.application_enabled ? 1 : 0
  api_id                 = aws_apigatewayv2_api.dashboard[0].id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.athlete_read[0].invoke_arn
  payload_format_version = "2.0"
}
resource "aws_apigatewayv2_integration" "athlete_write" {
  count                  = local.application_enabled ? 1 : 0
  api_id                 = aws_apigatewayv2_api.dashboard[0].id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.athlete_write[0].invoke_arn
  payload_format_version = "2.0"
}
resource "aws_apigatewayv2_integration" "athlete_admin" {
  count                  = local.application_enabled ? 1 : 0
  api_id                 = aws_apigatewayv2_api.dashboard[0].id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.athlete_admin[0].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "athlete_read" {
  for_each           = local.application_enabled ? local.athlete_read_routes : toset([])
  api_id             = aws_apigatewayv2_api.dashboard[0].id
  route_key          = each.value
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito[0].id
  target             = "integrations/${aws_apigatewayv2_integration.athlete_read[0].id}"
}
resource "aws_apigatewayv2_route" "athlete_write" {
  for_each           = local.application_enabled ? local.athlete_write_routes : toset([])
  api_id             = aws_apigatewayv2_api.dashboard[0].id
  route_key          = each.value
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito[0].id
  target             = "integrations/${aws_apigatewayv2_integration.athlete_write[0].id}"
}
resource "aws_apigatewayv2_route" "athlete_admin" {
  for_each           = local.application_enabled ? local.athlete_admin_routes : toset([])
  api_id             = aws_apigatewayv2_api.dashboard[0].id
  route_key          = each.value
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito[0].id
  target             = "integrations/${aws_apigatewayv2_integration.athlete_admin[0].id}"
}

resource "aws_lambda_permission" "athlete_read_api" {
  count         = local.application_enabled ? 1 : 0
  statement_id  = "AllowDashboardApiAthleteRead"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.athlete_read[0].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.dashboard[0].execution_arn}/*/*/me/*"
}
resource "aws_lambda_permission" "athlete_write_api" {
  count         = local.application_enabled ? 1 : 0
  statement_id  = "AllowDashboardApiAthleteWrite"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.athlete_write[0].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.dashboard[0].execution_arn}/*/*/me/*"
}
resource "aws_lambda_permission" "athlete_admin_api" {
  count         = local.application_enabled ? 1 : 0
  statement_id  = "AllowDashboardApiAthleteAdmin"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.athlete_admin[0].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.dashboard[0].execution_arn}/*/*/athletes*"
}
