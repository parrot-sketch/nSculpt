locals {
  repo_definitions = { for name, cfg in var.repositories : name => merge(cfg, { tags = merge(var.tags, lookup(cfg, "tags", {})) }) }
}

resource "aws_ecr_repository" "this" {
  for_each = local.repo_definitions

  name                 = each.key
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = each.value.image_scan_on_push
  }

  tags = each.value.tags
}

resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = local.repo_definitions
  repository = aws_ecr_repository.this[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Retain last 10 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
