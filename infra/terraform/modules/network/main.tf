locals {
  tags = merge({
    "Module" = "network",
    "Name"   = var.name,
  }, var.tags)
}

resource "aws_vpc" "this" {
  cidr_block           = var.cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.tags, { "Component" = "vpc" })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = merge(local.tags, { "Component" = "igw" })
}

resource "aws_subnet" "public" {
  for_each = { for idx, cidr in var.public_subnet_cidrs : idx => cidr }

  vpc_id                  = aws_vpc.this.id
  cidr_block              = each.value
  availability_zone       = length(var.azs) > each.key ? var.azs[tonumber(each.key)] : null
  map_public_ip_on_launch = true

  tags = merge(local.tags, {
    "Component" = "subnet-public"
    "Tier"      = "public"
    "Index"     = tostring(each.key)
  })
}

resource "aws_subnet" "private" {
  for_each = { for idx, cidr in var.private_subnet_cidrs : idx => cidr }

  vpc_id            = aws_vpc.this.id
  cidr_block        = each.value
  availability_zone = length(var.azs) > each.key ? var.azs[tonumber(each.key)] : null

  tags = merge(local.tags, {
    "Component" = "subnet-private"
    "Tier"      = "private"
    "Index"     = tostring(each.key)
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags   = merge(local.tags, { "Component" = "rtb-public" })
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

resource "aws_route_table_association" "public" {
  for_each       = aws_subnet.public
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count = length(var.private_subnet_cidrs) > 0 ? 1 : 0

  vpc_id = aws_vpc.this.id
  tags   = merge(local.tags, { "Component" = "rtb-private" })
}

# Optional NAT gateway for future use (disabled in free-tier deployments)
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? 1 : 0

  domain = "vpc"
  tags   = merge(local.tags, { "Component" = "eip-nat" })
}

resource "aws_nat_gateway" "this" {
  count = var.enable_nat_gateway ? 1 : 0

  allocation_id = aws_eip.nat[0].id
  subnet_id     = values(aws_subnet.public)[0].id
  tags          = merge(local.tags, { "Component" = "nat" })
}

resource "aws_route" "private_nat" {
  count = var.enable_nat_gateway && length(aws_route_table.private) > 0 ? 1 : 0

  route_table_id         = aws_route_table.private[0].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[0].id
}

resource "aws_route_table_association" "private" {
  for_each = aws_route_table.private == [] ? {} : aws_subnet.private

  subnet_id      = each.value.id
  route_table_id = aws_route_table.private[0].id
}
