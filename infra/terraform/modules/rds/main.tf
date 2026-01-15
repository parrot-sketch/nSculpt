resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-subnets"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name}-db-subnets"
  })
}

resource "aws_db_instance" "this" {
  identifier              = var.name
  engine                  = var.engine
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage
  db_name                 = var.db_name
  username                = var.username
  password                = var.password
  db_subnet_group_name    = aws_db_subnet_group.this.name
  vpc_security_group_ids  = var.vpc_security_group_ids
  backup_retention_period = var.backup_retention_period
  deletion_protection     = var.deletion_protection
  multi_az                = var.multi_az
  publicly_accessible     = var.publicly_accessible
  skip_final_snapshot     = true
  storage_encrypted       = true
  auto_minor_version_upgrade = true

  tags = merge(var.tags, {
    Name = var.name
  })
}
