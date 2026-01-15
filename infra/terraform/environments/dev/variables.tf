variable "environment" {
  description = "Environment name (dev/stage/prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for this environment"
  type        = string
  default     = "us-east-1"
}

variable "root_domain" {
  description = "Root domain managed in Route 53"
  type        = string
  default     = "nsac.co.ke"
}

variable "backend_image_tag" {
  description = "ECR image tag to deploy for the backend service"
  type        = string
  default     = "latest"
}

variable "backend_desired_count" {
  description = "Number of backend tasks to run"
  type        = number
  default     = 1
}

variable "api_prefix" {
  description = "Global API prefix for the backend service"
  type        = string
  default     = "api"
}

variable "cors_origins" {
  description = "Allowed origins for backend CORS"
  type        = list(string)
  default     = ["http://localhost:3000"]
}

variable "frontend_image_tag" {
  description = "ECR image tag to deploy for the frontend service"
  type        = string
  default     = "latest"
}

variable "frontend_desired_count" {
  description = "Number of frontend tasks to run"
  type        = number
  default     = 1
}

variable "auth_only_mode" {
  description = "Whether to run the frontend in authentication-only maintenance mode"
  type        = bool
  default     = false
}
