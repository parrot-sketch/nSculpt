#!/bin/bash
# Fix all file permissions in the workspace
# This script fixes ownership of all files to match current user

set -e

USER_ID=$(id -u)
GROUP_ID=$(id -g)
USER_NAME=$(whoami)

echo "Fixing permissions for user: $USER_NAME (uid=$USER_ID, gid=$GROUP_ID)"
echo ""

# Fix backend directory
if [ -d "backend" ]; then
    echo "Fixing backend directory..."
    sudo chown -R $USER_ID:$GROUP_ID backend/
    echo "✅ Backend permissions fixed"
fi

# Fix client directory
if [ -d "client" ]; then
    echo "Fixing client directory..."
    sudo chown -R $USER_ID:$GROUP_ID client/
    echo "✅ Client permissions fixed"
fi

# Fix root workspace files
echo "Fixing root workspace files..."
sudo chown $USER_ID:$GROUP_ID *.md *.sh *.yml *.yaml 2>/dev/null || true
echo "✅ Root files permissions fixed"

echo ""
echo "✅ All permissions fixed!"
echo ""
echo "Verifying..."
if [ -d "backend/src" ]; then
    if touch backend/src/test.tmp 2>/dev/null; then
        rm backend/src/test.tmp
        echo "✅ Backend: Write permission verified"
    else
        echo "❌ Backend: Still cannot write"
    fi
fi

if [ -d "client" ]; then
    if touch client/test.tmp 2>/dev/null; then
        rm client/test.tmp
        echo "✅ Client: Write permission verified"
    else
        echo "❌ Client: Still cannot write"
    fi
fi

echo ""
echo "Done! You should now be able to save all files without sudo."












