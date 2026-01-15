#!/bin/bash
#
# Docker Cleanup Script
# 
# Comprehensive Docker cleanup that removes:
# - All stopped and running containers
# - All images
# - All volumes
# - All build cache
# - All unused networks
#
# WARNING: This will remove ALL Docker resources!
# Use with caution in production environments.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# Function to show Docker disk usage
show_disk_usage() {
    echo ""
    print_info "Current Docker disk usage:"
    docker system df
    echo ""
}

# Function to stop all running containers
stop_all_containers() {
    print_info "Stopping all running containers..."
    RUNNING=$(docker ps -q)
    if [ -z "$RUNNING" ]; then
        print_info "No running containers found."
    else
        docker stop $RUNNING 2>/dev/null || true
        print_success "Stopped all running containers"
    fi
}

# Function to remove all containers
remove_all_containers() {
    print_info "Removing all containers..."
    ALL_CONTAINERS=$(docker ps -aq)
    if [ -z "$ALL_CONTAINERS" ]; then
        print_info "No containers found."
    else
        docker rm $ALL_CONTAINERS 2>/dev/null || true
        print_success "Removed all containers"
    fi
}

# Function to remove all images
remove_all_images() {
    print_info "Removing all images..."
    ALL_IMAGES=$(docker images -q)
    if [ -z "$ALL_IMAGES" ]; then
        print_info "No images found."
    else
        docker rmi -f $ALL_IMAGES 2>/dev/null || true
        print_success "Removed all images"
    fi
}

# Function to remove all volumes
remove_all_volumes() {
    print_info "Removing all volumes..."
    ALL_VOLUMES=$(docker volume ls -q)
    if [ -z "$ALL_VOLUMES" ]; then
        print_info "No volumes found."
    else
        docker volume rm $ALL_VOLUMES 2>/dev/null || true
        print_success "Removed all volumes"
    fi
}

# Function to prune system
prune_system() {
    print_info "Pruning Docker system (images, containers, volumes, networks, build cache)..."
    RECLAIMED=$(docker system prune -a --volumes -f 2>&1 | grep "Total reclaimed space" || echo "")
    if [ ! -z "$RECLAIMED" ]; then
        print_success "$RECLAIMED"
    else
        print_success "System pruned"
    fi
}

# Function to prune networks
prune_networks() {
    print_info "Pruning unused networks..."
    docker network prune -f > /dev/null 2>&1 || true
    print_success "Pruned unused networks"
}

# Main cleanup function
main_cleanup() {
    echo ""
    echo "=========================================="
    echo "  Docker Complete Cleanup Script"
    echo "=========================================="
    echo ""
    
    # Show initial state
    print_warning "WARNING: This will remove ALL Docker resources!"
    echo ""
    show_disk_usage
    
    # Confirm before proceeding
    if [ "$1" != "--yes" ] && [ "$1" != "-y" ]; then
        read -p "Are you sure you want to continue? (yes/no): " CONFIRM
        if [ "$CONFIRM" != "yes" ]; then
            print_info "Cleanup cancelled."
            exit 0
        fi
    fi
    
    echo ""
    print_info "Starting cleanup process..."
    echo ""
    
    # Step 1: Stop all containers
    stop_all_containers
    
    # Step 2: Remove all containers
    remove_all_containers
    
    # Step 3: Prune system (this handles images, volumes, build cache)
    prune_system
    
    # Step 4: Prune networks
    prune_networks
    
    # Step 5: Final cleanup of any remaining volumes
    remove_all_volumes
    
    # Show final state
    echo ""
    print_success "Cleanup complete!"
    echo ""
    show_disk_usage
    
    # Verify cleanup
    CONTAINERS=$(docker ps -aq | wc -l)
    IMAGES=$(docker images -q | wc -l)
    VOLUMES=$(docker volume ls -q | wc -l)
    
    if [ "$CONTAINERS" -eq 0 ] && [ "$IMAGES" -eq 0 ] && [ "$VOLUMES" -eq 0 ]; then
        print_success "Docker environment is completely clean!"
        echo ""
        print_info "Containers: 0"
        print_info "Images: 0"
        print_info "Volumes: 0"
        print_info "Build Cache: 0"
    else
        print_warning "Some resources may still exist:"
        [ "$CONTAINERS" -gt 0 ] && print_warning "  Containers: $CONTAINERS"
        [ "$IMAGES" -gt 0 ] && print_warning "  Images: $IMAGES"
        [ "$VOLUMES" -gt 0 ] && print_warning "  Volumes: $VOLUMES"
    fi
    
    echo ""
}

# Help function
show_help() {
    echo "Docker Cleanup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -y, --yes    Skip confirmation prompt"
    echo "  -h, --help   Show this help message"
    echo ""
    echo "This script will:"
    echo "  - Stop all running containers"
    echo "  - Remove all containers"
    echo "  - Remove all images"
    echo "  - Remove all volumes"
    echo "  - Remove all build cache"
    echo "  - Prune unused networks"
    echo ""
    echo "WARNING: This removes ALL Docker resources!"
}

# Parse arguments
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main_cleanup "$@"
        ;;
esac










