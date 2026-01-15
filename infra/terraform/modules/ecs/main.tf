resource "aws_cloudwatch_log_group" "this" {
  for_each = { for cd in var.container_definitions : cd.log_group => cd.log_group }

  name              = each.key
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_ecs_cluster" "this" {
  name = var.cluster_name
  tags = var.tags
}

resource "aws_iam_role" "task_execution" {
  name = "${var.cluster_name}-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "task_execution_secrets" {
  count = length(var.secrets_access_arns) > 0 ? 1 : 0

  name = "${var.cluster_name}-secrets"
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.secrets_access_arns
      }
    ]
  })
}

resource "aws_ecs_task_definition" "this" {
  family                   = var.cluster_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task_execution.arn

  container_definitions = jsonencode([
    for cd in var.container_definitions : {
      name  = cd.name
      image = cd.image
      portMappings = [
        for pm in cd.port_mappings : {
          containerPort = pm.container_port
          hostPort      = lookup(pm, "host_port", pm.container_port)
          protocol      = pm.protocol
        }
      ]
      environment = [
        for key, value in cd.environment : {
          name  = key
          value = value
        }
      ]
      secrets = cd.secrets
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = cd.log_group
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = cd.name
        }
      }
    }
  ])

  tags = var.tags
}

resource "aws_ecs_service" "this" {
  name            = var.cluster_name
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"
  enable_execute_command = true

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = var.security_group_ids
    assign_public_ip = var.assign_public_ip
  }

  dynamic "load_balancer" {
    for_each = var.load_balancers
    content {
      target_group_arn = load_balancer.value.target_group_arn
      container_name   = load_balancer.value.container_name
      container_port   = load_balancer.value.container_port
    }
  }

  tags = var.tags
}
