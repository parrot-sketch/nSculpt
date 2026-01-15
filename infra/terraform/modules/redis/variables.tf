variable "enabled" {
  description = "Whether to create redis resources"
  type        = bool
  default     = false
}

variable "name" {
  description = "Cluster identifier"
  type        = string
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "subnet_ids" {
  description = "Subnet IDs for the cache subnet group"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security groups to attach"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply"
  type        = map(string)
  default     = {}
}
