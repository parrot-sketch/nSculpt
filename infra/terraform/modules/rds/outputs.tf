output "endpoint" {
  value       = aws_db_instance.this.address
  description = "RDS endpoint"
}

output "port" {
  value       = aws_db_instance.this.port
  description = "RDS port"
}

output "identifier" {
  value       = aws_db_instance.this.id
  description = "RDS instance identifier"
}
