#!/bin/bash
# Fix workspace permissions script
# This script fixes ownership of backend files to match current user

set -e

USER_ID=$(id -u)
GROUP_ID=$(id -g)
USER_NAME=$(whoami)

echo "Fixing permissions for user: $USER_NAME (uid=$USER_ID, gid=$GROUP_ID)"
echo ""

# Check if we can use sudo
if command -v sudo &> /dev/null; then
    echo "Using sudo to fix permissions..."
    sudo chown -R $USER_ID:$GROUP_ID /home/bkg/ns/backend/src
    sudo chown -R $USER_ID:$GROUP_ID /home/bkg/ns/backend/prisma
    sudo chown -R $USER_ID:$GROUP_ID /home/bkg/ns/backend/package.json
    sudo chown -R $USER_ID:$GROUP_ID /home/bkg/ns/backend/tsconfig.json
    sudo chown -R $USER_ID:$GROUP_ID /home/bkg/ns/backend/nest-cli.json
    echo "✅ Permissions fixed!"
else
    echo "❌ sudo not available. Please run manually:"
    echo "   sudo chown -R $USER_NAME:$USER_NAME /home/bkg/ns/backend/src"
    echo "   sudo chown -R $USER_NAME:$USER_NAME /home/bkg/ns/backend/prisma"
    exit 1
fi

# Verify
echo ""
echo "Verifying permissions..."
if touch /home/bkg/ns/backend/src/modules/audit/services/test.tmp 2>/dev/null; then
    rm /home/bkg/ns/backend/src/modules/audit/services/test.tmp
    echo "✅ Write permission verified!"
else
    echo "❌ Still cannot write. May need to run with sudo manually."
fi












