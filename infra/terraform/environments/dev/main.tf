terraform {
  required_version = ">= 1.6.0"
}

provider "aws" {
  region = var.aws_region
}

locals {
  name_prefix = "parrot-${var.environment}"
  azs         = ["${var.aws_region}a", "${var.aws_region}b"]
}

module "network" {
  source = "../../modules/network"

  name                 = local.name_prefix
  cidr                 = "10.10.0.0/24"
  azs                  = local.azs
  public_subnet_cidrs  = ["10.10.0.0/26", "10.10.0.64/26"]
  private_subnet_cidrs = ["10.10.0.128/26", "10.10.0.192/26"]
  enable_nat_gateway   = false
  tags = {
    Environment = var.environment
    Project     = "parrot"
  }
}

resource "random_password" "db" {
  length           = 24
  special          = true
  override_special = "_@"
}

resource "random_password" "jwt_secret" {
  length           = 48
  special          = true
  override_special = "_@-"
}

resource "random_password" "jwt_refresh_secret" {
  length           = 48
  special          = true
  override_special = "_@-"
}


resource "aws_security_group" "db" {
  name        = "${local.name_prefix}-db"
  description = "Database access security group"
  vpc_id      = module.network.vpc_id

  ingress {
    description = "Allow Postgres from VPC CIDR"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.10.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${local.name_prefix}-db"
    Environment = var.environment
    Project     = "parrot"
  }
}

module "rds" {
  source = "../../modules/rds"

  name                    = "${local.name_prefix}-db"
  subnet_ids              = module.network.private_subnet_ids
  vpc_security_group_ids  = [aws_security_group.db.id]
  password                = random_password.db.result
  backup_retention_period = 1
  tags = {
    Environment = var.environment
    Project     = "parrot"
  }
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${local.name_prefix}-db-credentials"
  description = "Database credentials for ${local.name_prefix}"

  tags = {
    Environment = var.environment
    Project     = "parrot"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username    = "parrot_admin"
    password    = random_password.db.result
    host        = module.rds.endpoint
    port        = module.rds.port
    database    = "parrot"
    databaseUrl = "postgresql://parrot_admin:${random_password.db.result}@${module.rds.endpoint}:${module.rds.port}/parrot"
  })
}

resource "aws_secretsmanager_secret" "app_env" {
  name        = "${local.name_prefix}-app-env"
  description = "Application secrets for ${local.name_prefix}"

  tags = {
    Environment = var.environment
    Project     = "parrot"
  }
}

resource "aws_secretsmanager_secret_version" "app_env" {
  secret_id = aws_secretsmanager_secret.app_env.id
  secret_string = jsonencode({
    jwtSecret           = random_password.jwt_secret.result
    jwtRefreshSecret    = random_password.jwt_refresh_secret.result
    jwtExpiresIn        = "15m"
    jwtRefreshExpiresIn = "7d"
  })
}

resource "aws_security_group" "redis" {
  name        = "${local.name_prefix}-redis"
  description = "Redis access security group"
  vpc_id      = module.network.vpc_id

  ingress {
    description = "Allow Redis from VPC"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.10.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${local.name_prefix}-redis"
    Environment = var.environment
    Project     = "parrot"
  }
}

module "redis" {
  source  = "../../modules/redis"
  enabled = false

  name               = "${local.name_prefix}-redis"
  subnet_ids         = module.network.private_subnet_ids
  security_group_ids = [aws_security_group.redis.id]
  tags = {
    Environment = var.environment
    Project     = "parrot"
  }
}

module "ecr" {
  source = "../../modules/ecr"

  repositories = {
    "parrot-backend" = {
      image_scan_on_push = true
    }
    "parrot-frontend" = {
      image_scan_on_push = true
    }
  }

  tags = {
    Environment = var.environment
    Project     = "parrot"
  }
}

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb"
  description = "Load balancer security group"
  vpc_id      = module.network.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${local.name_prefix}-alb"
    Environment = var.environment
    Project     = "parrot"
  }
}

resource "aws_lb" "app" {
  name               = "${local.name_prefix}-alb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.network.public_subnet_ids

  tags = {
    Environment = var.environment
    Project     = "parrot"
  }
}

resource "aws_lb_target_group" "backend" {
  name        = "${local.name_prefix}-backend"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = module.network.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
  }

  tags = {
    Environment = var.environment
    Project     = "parrot"
  }
}

resource "aws_lb_target_group" "frontend" {
  name        = "${local.name_prefix}-frontend"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.network.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
  }

  tags = {
    Environment = var.environment
    Project     = "parrot"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      host        = "#{host}"
      path        = "/#{path}"
      port        = "443"
      protocol    = "HTTPS"
      query       = "#{query}"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_route53_zone" "root" {
  name = var.root_domain
}

resource "aws_acm_certificate" "site" {
  domain_name       = var.root_domain
  validation_method = "DNS"

  subject_alternative_names = [
    "www.${var.root_domain}"
  ]

  tags = {
    Environment = var.environment
    Project     = "parrot"
  }
}

resource "aws_route53_record" "site_validation" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }

  name    = each.value.name
  type    = each.value.type
  zone_id = aws_route53_zone.root.zone_id
  records = [each.value.value]
  ttl     = 300
}

resource "aws_acm_certificate_validation" "site" {
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for record in aws_route53_record.site_validation : record.fqdn]
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate_validation.site.certificate_arn

  # Route /api/* to backend
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener_rule" "https_www_redirect" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 50

  condition {
    host_header {
      values = ["www.${var.root_domain}"]
    }
  }

  action {
    type = "redirect"
    redirect {
      host        = var.root_domain
      protocol    = "HTTPS"
      port        = "443"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener_rule" "backend_api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

resource "aws_lb_listener_rule" "frontend" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}

resource "aws_route53_record" "root_alias" {
  zone_id = aws_route53_zone.root.zone_id
  name    = var.root_domain
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www_alias" {
  zone_id = aws_route53_zone.root.zone_id
  name    = "www.${var.root_domain}"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}

resource "aws_security_group" "ecs_service" {
  name        = "${local.name_prefix}-ecs"
  description = "ECS service security group"
  vpc_id      = module.network.vpc_id

  ingress {
    description     = "Allow ALB to backend"
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "Allow ALB to frontend"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${local.name_prefix}-ecs"
    Environment = var.environment
    Project     = "parrot"
  }
}

module "ecs_backend" {
  source = "../../modules/ecs"

  aws_region = var.aws_region

  cluster_name       = "${local.name_prefix}-backend"
  subnet_ids         = module.network.public_subnet_ids
  security_group_ids = [aws_security_group.ecs_service.id]
  assign_public_ip   = true
  desired_count      = var.backend_desired_count

  container_definitions = [
    {
      name  = "backend"
      image = "${module.ecr.repositories["parrot-backend"].url}:${var.backend_image_tag}"
      port_mappings = [
        {
          container_port = 3001
        }
      ]
      environment = {
        NODE_ENV               = "production"
        PORT                   = "3001"
        API_PREFIX             = var.api_prefix
        CORS_ORIGINS           = join(",", var.cors_origins)
        SEED_DB                = "true"
        PRISMA_DB_PUSH_ON_START = "false" # Production: use proper migrations (prisma migrate deploy)
        IMPORT_KEMSA_ON_START   = "false" # set to true once to import KEMSA catalogue on next deploy
      }
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:databaseUrl::"
        },
        {
          name      = "JWT_SECRET"
          valueFrom = "${aws_secretsmanager_secret.app_env.arn}:jwtSecret::"
        },
        {
          name      = "JWT_REFRESH_SECRET"
          valueFrom = "${aws_secretsmanager_secret.app_env.arn}:jwtRefreshSecret::"
        },
        {
          name      = "JWT_EXPIRES_IN"
          valueFrom = "${aws_secretsmanager_secret.app_env.arn}:jwtExpiresIn::"
        },
        {
          name      = "JWT_REFRESH_EXPIRES_IN"
          valueFrom = "${aws_secretsmanager_secret.app_env.arn}:jwtRefreshExpiresIn::"
        }
      ]
      log_group = "/aws/ecs/${local.name_prefix}-backend"
    }
  ]

  load_balancers = [
    {
      target_group_arn = aws_lb_target_group.backend.arn
      container_name   = "backend"
      container_port   = 3001
    }
  ]

  secrets_access_arns = [
    aws_secretsmanager_secret.db_credentials.arn,
    aws_secretsmanager_secret.app_env.arn,
  ]

  tags = {
    Environment = var.environment
    Project     = "parrot"
  }
}

module "ecs_frontend" {
  source = "../../modules/ecs"

  aws_region = var.aws_region

  cluster_name       = "${local.name_prefix}-frontend"
  subnet_ids         = module.network.public_subnet_ids
  security_group_ids = [aws_security_group.ecs_service.id]
  assign_public_ip   = true
  desired_count      = var.frontend_desired_count

  container_definitions = [
    {
      name  = "frontend"
      image = "${module.ecr.repositories["parrot-frontend"].url}:${var.frontend_image_tag}"
      port_mappings = [
        {
          container_port = 3000
        }
      ]
      environment = {
        NODE_ENV                  = "production"
        NEXT_PUBLIC_API_BASE_URL  = "https://${var.root_domain}/${var.api_prefix}"
        NEXT_PUBLIC_AUTH_ONLY_MODE = tostring(var.auth_only_mode)
      }
      log_group = "/aws/ecs/${local.name_prefix}-frontend"
    }
  ]

  load_balancers = [
    {
      target_group_arn = aws_lb_target_group.frontend.arn
      container_name   = "frontend"
      container_port   = 3000
    }
  ]

  tags = {
    Environment = var.environment
    Project     = "parrot"
  }
}
