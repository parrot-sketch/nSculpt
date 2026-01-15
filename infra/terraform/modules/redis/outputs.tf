output "endpoint" {
  description = "Redis endpoint"
  value       = var.enabled ? aws_elasticache_cluster.this[0].cache_nodes[0].address : null
}

output "port" {
  description = "Redis port"
  value       = var.enabled ? aws_elasticache_cluster.this[0].port : null
}
