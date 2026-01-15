output "vpc_id" {
  value       = module.network.vpc_id
  description = "VPC id for the dev environment"
}

output "public_subnet_ids" {
  value       = module.network.public_subnet_ids
  description = "Public subnets (ALB / public ECS tasks)"
}

output "private_subnet_ids" {
  value       = module.network.private_subnet_ids
  description = "Private subnets (data layer / private ECS tasks)"
}

output "db_endpoint" {
  value       = module.rds.endpoint
  description = "Database endpoint address"
}

output "db_port" {
  value       = module.rds.port
  description = "Database port"
}

output "db_credentials_secret_arn" {
  value       = aws_secretsmanager_secret.db_credentials.arn
  description = "Secrets Manager ARN for database credentials"
}

output "redis_endpoint" {
  value       = module.redis.endpoint
  description = "Redis endpoint (null when disabled)"
}

output "ecr_repositories" {
  value       = module.ecr.repositories
  description = "Map of ECR repositories (url + arn)"
}

output "alb_dns_name" {
  value       = aws_lb.app.dns_name
  description = "Application Load Balancer DNS"
}

output "ecs_backend_cluster_id" {
  value       = module.ecs_backend.cluster_id
  description = "ECS cluster ID for backend"
}

output "ecs_backend_service_name" {
  value       = module.ecs_backend.service_name
  description = "Backend ECS service name"
}

output "route53_nameservers" {
  value       = aws_route53_zone.root.name_servers
  description = "Route 53 NS records to set at registrar"
}
