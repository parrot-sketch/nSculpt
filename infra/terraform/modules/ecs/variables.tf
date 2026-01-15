variable "cluster_name" {
  description = "ECS cluster name"
  type        = string
}

variable "subnet_ids" {
  description = "Subnets for ECS services"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security groups for ECS services"
  type        = list(string)
}

variable "assign_public_ip" {
  description = "Assign public IP to tasks"
  type        = bool
  default     = true
}

variable "task_cpu" {
  description = "Task CPU units"
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Task memory (MB)"
  type        = number
  default     = 512
}

variable "container_definitions" {
  description = "List of container definitions"
  type = list(object({
    name        = string
    image       = string
    port_mappings = list(object({
      container_port = number
      host_port      = optional(number)
      protocol       = optional(string, "tcp")
    }))
    environment = optional(map(string), {})
    secrets     = optional(list(object({
      name      = string
      valueFrom = string
    })), [])
    log_group  = string
  }))
}

variable "load_balancers" {
  description = "Optional ALB/NLB configuration"
  type = list(object({
    target_group_arn = string
    container_name   = string
    container_port   = number
  }))
  default = []
}

variable "secrets_access_arns" {
  description = "Secrets that the task execution role can read"
  type        = list(string)
  default     = []
}

variable "desired_count" {
  description = "Number of tasks to run"
  type        = number
  default     = 1
}

variable "tags" {
  description = "Tags to apply"
  type        = map(string)
  default     = {}
}

variable "aws_region" {
  description = "AWS region used for logging configuration"
  type        = string
}
