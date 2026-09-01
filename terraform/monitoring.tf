resource "aws_sns_topic" "monitoring_alerts" {
  count = local.application_enabled ? 1 : 0

  name = "${local.name_prefix}-monitoring-alerts"
  tags = local.tags
}

resource "aws_sns_topic_subscription" "monitoring_email" {
  count = local.application_enabled && var.monitoring_alert_email != null ? 1 : 0

  topic_arn = aws_sns_topic.monitoring_alerts[0].arn
  protocol  = "email"
  endpoint  = var.monitoring_alert_email
}

resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  count = local.application_enabled ? 1 : 0

  alarm_name          = "${local.name_prefix}-api-5xx"
  alarm_description   = "Project 06 HTTP API returned at least one server error in five minutes."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 1
  metric_name         = "5xx"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.dashboard[0].id
    Stage = aws_apigatewayv2_stage.dashboard[0].name
  }

  alarm_actions = [aws_sns_topic.monitoring_alerts[0].arn]
  tags          = local.tags
}

resource "aws_cloudwatch_metric_alarm" "athlete_write_errors" {
  count = local.application_enabled ? 1 : 0

  alarm_name          = "${local.name_prefix}-athlete-write-errors"
  alarm_description   = "Project 06 Athlete session write Lambda recorded an unhandled function error."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.athlete_write[0].function_name
  }

  alarm_actions = [aws_sns_topic.monitoring_alerts[0].arn]
  tags          = local.tags
}

resource "aws_cloudwatch_metric_alarm" "training_write_errors" {
  count = local.application_enabled ? 1 : 0

  alarm_name          = "${local.name_prefix}-training-write-errors"
  alarm_description   = "Project 06 workout-template write Lambda recorded an unhandled function error."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  datapoints_to_alarm = 1
  threshold           = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.training_write[0].function_name
  }

  alarm_actions = [aws_sns_topic.monitoring_alerts[0].arn]
  tags          = local.tags
}
