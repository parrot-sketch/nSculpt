#!/bin/bash
# Permanent Permission Fix Script
# Fixes all file ownership issues in the workspace

set -e

USER_ID=$(id -u)
GROUP_ID=$(id -g)
USER_NAME=$(whoami)

echo "🔧 Fixing permissions for user: $USER_NAME (uid=$USER_ID, gid=$GROUP_ID)"
echo ""

# Fix backend directory
echo "Fixing backend directory..."
sudo chown -R $USER_NAME:$USER_NAME backend/ 2>/dev/null || true
echo "✅ Backend permissions fixed"

# Fix client directory
echo "Fixing client directory..."
sudo chown -R $USER_NAME:$USER_NAME client/ 2>/dev/null || true
echo "✅ Client permissions fixed"

# Fix root workspace files
echo "Fixing root workspace files..."
sudo chown -R $USER_NAME:$USER_NAME *.md *.sh *.yml *.yaml Makefile 2>/dev/null || true
echo "✅ Root files permissions fixed"

echo ""
echo "✅ All permissions fixed!"
echo ""
echo "To prevent this issue in the future, run:"
echo "  ./configure-docker-user.sh"
echo ""











