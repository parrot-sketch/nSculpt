#!/bin/bash
# Configure Docker containers to run as host user
# This prevents permission issues with bind-mounted volumes

set -e

USER_ID=$(id -u)
GROUP_ID=$(id -g)
USER_NAME=$(whoami)

echo "🔧 Configuring Docker to use host user: $USER_NAME (uid=$USER_ID, gid=$GROUP_ID)"
echo ""

# Create .env file with user IDs if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Host user configuration for Docker containers
HOST_UID=$USER_ID
HOST_GID=$GROUP_ID
HOST_USER=$USER_NAME
EOF
    echo "✅ Created .env file"
else
    # Update existing .env file
    if grep -q "HOST_UID" .env; then
        sed -i "s/^HOST_UID=.*/HOST_UID=$USER_ID/" .env
        sed -i "s/^HOST_GID=.*/HOST_GID=$GROUP_ID/" .env
        sed -i "s/^HOST_USER=.*/HOST_USER=$USER_NAME/" .env
        echo "✅ Updated .env file"
    else
        echo "" >> .env
        echo "# Host user configuration for Docker containers" >> .env
        echo "HOST_UID=$USER_ID" >> .env
        echo "HOST_GID=$GROUP_ID" >> .env
        echo "HOST_USER=$USER_NAME" >> .env
        echo "✅ Added user config to .env file"
    fi
fi

echo ""
echo "📝 Next steps:"
echo "1. Update Dockerfiles to use HOST_UID and HOST_GID build args"
echo "2. Update docker-compose.yml to pass these build args"
echo "3. Rebuild containers: docker-compose build --no-cache"
echo "4. Restart containers: docker-compose down && docker-compose up -d"
echo ""











