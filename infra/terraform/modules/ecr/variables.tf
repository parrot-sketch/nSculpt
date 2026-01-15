variable "repositories" {
  description = "Map of repository names to configuration"
  type = map(object({
    image_scan_on_push = optional(bool, true)
    tags               = optional(map(string), {})
  }))
}

variable "tags" {
  description = "Default tags to apply"
  type        = map(string)
  default     = {}
}
