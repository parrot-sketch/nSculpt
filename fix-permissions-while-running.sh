#!/bin/bash
# Fix permissions while containers are running
# This script fixes ownership and ensures files can be saved

set -e

USER_ID=$(id -u)
GROUP_ID=$(id -g)
USER_NAME=$(whoami)

echo "Fixing permissions for user: $USER_NAME (uid=$USER_ID, gid=$GROUP_ID)"
echo ""
echo "Note: This will fix permissions even while containers are running."
echo "Containers may recreate some files, but source files will be yours."
echo ""

# Fix backend source files (most important)
echo "Fixing backend source files..."
sudo find backend/src -type f -exec chown $USER_ID:$GROUP_ID {} \; 2>/dev/null || true
sudo find backend/src -type d -exec chown $USER_ID:$GROUP_ID {} \; 2>/dev/null || true
sudo find backend/prisma -type f -exec chown $USER_ID:$GROUP_ID {} \; 2>/dev/null || true
sudo find backend/prisma -type d -exec chown $USER_ID:$GROUP_ID {} \; 2>/dev/null || true
echo "✅ Backend source files fixed"

# Fix client source files (exclude .next and node_modules)
echo "Fixing client source files..."
sudo find client -type f -not -path "*/node_modules/*" -not -path "*/.next/*" -exec chown $USER_ID:$GROUP_ID {} \; 2>/dev/null || true
sudo find client -type d -not -path "*/node_modules/*" -not -path "*/.next/*" -exec chown $USER_ID:$GROUP_ID {} \; 2>/dev/null || true
echo "✅ Client source files fixed"

# Fix specific files that are commonly problematic
echo "Fixing common problematic files..."
sudo chown -R $USER_ID:$GROUP_ID backend/package.json backend/tsconfig.json backend/nest-cli.json 2>/dev/null || true
sudo chown -R $USER_ID:$GROUP_ID client/package.json client/tsconfig.json client/next.config.js 2>/dev/null || true
echo "✅ Common files fixed"

# Make sure .next directory is writable (even if owned by container user)
if [ -d "client/.next" ]; then
    echo "Fixing .next directory permissions..."
    sudo chmod -R u+w client/.next 2>/dev/null || true
    sudo chown -R $USER_ID:$GROUP_ID client/.next 2>/dev/null || true
    echo "✅ .next directory fixed"
fi

echo ""
echo "✅ Permissions fixed!"
echo ""
echo "If you still have issues saving specific files:"
echo "1. Close the file in your IDE"
echo "2. Run: sudo chown $USER_NAME:$USER_NAME <file-path>"
echo "3. Reopen the file"
echo ""
echo "To prevent this in the future, you can:"
echo "- Stop containers before making changes: docker-compose stop"
echo "- Or run this script periodically: ./fix-permissions-while-running.sh"












