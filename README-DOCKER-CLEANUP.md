# Docker Cleanup Script

A comprehensive script to completely clean up your Docker environment.

## Usage

### Interactive Mode (with confirmation)
```bash
./docker-cleanup.sh
```

### Non-Interactive Mode (skip confirmation)
```bash
./docker-cleanup.sh --yes
# or
./docker-cleanup.sh -y
```

### Show Help
```bash
./docker-cleanup.sh --help
# or
./docker-cleanup.sh -h
```

## What It Does

The script performs a complete Docker cleanup:

1. **Stops all running containers** - Gracefully stops all running Docker containers
2. **Removes all containers** - Removes both running and stopped containers
3. **Removes all images** - Deletes all Docker images
4. **Removes all volumes** - Deletes all Docker volumes (including data!)
5. **Removes build cache** - Cleans up all build cache
6. **Prunes networks** - Removes unused Docker networks

## Features

- ✅ **Safe confirmation** - Prompts for confirmation before proceeding (unless `--yes` flag is used)
- ✅ **Colored output** - Easy-to-read colored output for better visibility
- ✅ **Disk usage display** - Shows before/after disk usage
- ✅ **Error handling** - Continues even if some resources can't be removed
- ✅ **Verification** - Verifies cleanup was successful

## Warnings

⚠️ **WARNING**: This script removes **ALL** Docker resources including:
- All containers (running and stopped)
- All images
- All volumes (including persistent data!)
- All build cache
- All unused networks

**Use with caution!** This is irreversible. Make sure you:
- Have backups of any important data in volumes
- Don't need any of the running containers
- Are ready to rebuild images from scratch

## Example Output

```
==========================================
  Docker Complete Cleanup Script
==========================================

⚠ WARNING: This will remove ALL Docker resources!

ℹ Current Docker disk usage:
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          25        4         12.73GB   11.45GB (89%)
Containers      7         4         1.403MB   0B (0%)
Local Volumes   61        6         10.39GB   8.991GB (86%)
Build Cache     218       0         954.4MB   954.4MB

Are you sure you want to continue? (yes/no): yes

ℹ Starting cleanup process...

ℹ Stopping all running containers...
✅ Stopped all running containers
ℹ Removing all containers...
✅ Removed all containers
ℹ Pruning Docker system...
✅ Total reclaimed space: 23.66GB
✅ Pruned unused networks
ℹ Removing all volumes...
✅ Removed all volumes

✅ Cleanup complete!

ℹ Current Docker disk usage:
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          0         0         0B        0B
Containers      0         0         0B        0B
Local Volumes   0         0         0B        0B
Build Cache     0         0         0B        0B

✅ Docker environment is completely clean!

ℹ Containers: 0
ℹ Images: 0
ℹ Volumes: 0
ℹ Build Cache: 0
```

## When to Use

Use this script when you want to:
- Start completely fresh with Docker
- Free up disk space
- Remove all traces of previous Docker projects
- Clean up after switching between projects
- Troubleshoot Docker issues by starting from scratch

## After Cleanup

After running the cleanup, you can:
1. Rebuild your project from scratch:
   ```bash
   docker-compose up --build
   ```

2. Or use your Makefile:
   ```bash
   make rebuild
   ```

## Safety Tips

1. **Backup important data** before running if you have volumes with important data
2. **Check what's running** with `docker ps -a` before cleanup
3. **Use `--yes` flag carefully** - only in scripts or when absolutely sure
4. **Review the script** before running if you're concerned about what it does

## Troubleshooting

If the script fails:
- Make sure you have Docker installed and running
- Check that you have permissions to run Docker commands
- Some resources might be in use - try stopping containers manually first










