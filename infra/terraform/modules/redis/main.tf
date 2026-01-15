locals {
  tags = merge(var.tags, {
    Name = var.name
  })
}

resource "aws_elasticache_subnet_group" "this" {
  count      = var.enabled ? 1 : 0
  name       = "${var.name}-subnets"
  subnet_ids = var.subnet_ids

  tags = local.tags
}

resource "aws_elasticache_cluster" "this" {
  count               = var.enabled ? 1 : 0
  cluster_id          = replace(var.name, "_", "-")
  engine              = "redis"
  engine_version      = var.engine_version
  node_type           = var.node_type
  num_cache_nodes     = 1
  port                = 6379
  subnet_group_name   = aws_elasticache_subnet_group.this[0].name
  security_group_ids  = var.security_group_ids
  maintenance_window  = "sun:05:00-sun:06:00"
  snapshot_retention_limit = 0

  tags = local.tags
}
