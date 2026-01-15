# Permission Issues Explanation

## Root Cause

The permission issues you're encountering are due to **file ownership mismatches** between:
- **Docker container user**: `nestjs` (UID 1001, GID 1001)
- **Local host user**: `bkg` (UID 1000, GID 1000)

### Why This Happens

1. **Docker Volume Mounts**: When you mount `./backend:/app` in `docker-compose.yml`, files created inside the container are owned by the container's user (nestjs, UID 1001).

2. **Local Execution**: When you run commands locally (outside Docker), your local user (bkg, UID 1000) tries to write to files owned by UID 1001, resulting in `EACCES: permission denied`.

3. **File Permissions**: The `schema.prisma` file had permissions `755` (rwxr-xr-x), which means:
   - Owner (1001) can read, write, execute
   - Group (1001) can read, execute
   - Others can read, execute
   - **Only the owner can write**

## The Fix

We fixed it by changing ownership inside the Docker container:

```bash
docker-compose exec -T backend sh -c "chown 1000:1000 /app/prisma/schema.prisma && chmod 664 /app/prisma/schema.prisma"
```

This:
- Changes ownership to UID 1000 (your local user)
- Sets permissions to `664` (rw-rw-r--), allowing both owner and group to write

## Best Practices to Avoid This

### Option 1: Always Run Commands in Docker (Recommended)
```bash
# Instead of: npm run schema:generate
# Use:
docker-compose exec backend npm run schema:generate
```

### Option 2: Fix Ownership in Dockerfile
Add to `Dockerfile.dev`:
```dockerfile
# Fix ownership for mounted volumes
RUN chown -R 1000:1000 /app
```

### Option 3: Use Docker Compose User Mapping
In `docker-compose.yml`, add:
```yaml
backend:
  user: "${UID:-1000}:${GID:-1000}"
```

### Option 4: Create a Helper Script
```bash
#!/bin/bash
# fix-permissions.sh
docker-compose exec backend sh -c "chown -R 1000:1000 /app && chmod -R 664 /app"
```

## Current Status

✅ **Fixed**: `schema.prisma` is now writable by your local user
✅ **Solution**: Run Prisma commands inside Docker container where dependencies are installed

## Recommended Workflow

1. **Development**: Run commands inside Docker:
   ```bash
   docker-compose exec backend npm run schema:generate
   docker-compose exec backend npm run dev
   ```

2. **Or use Makefile targets**:
   ```bash
   make schema-generate  # If you add this target
   ```

3. **For one-off fixes**: Use the ownership fix command above

## Why This Matters

- **Security**: Proper file permissions prevent unauthorized access
- **Collaboration**: Consistent ownership ensures team members can work with files
- **CI/CD**: Build systems need predictable file permissions
- **Docker**: Container user vs host user mismatches are common in development

## Related Files

- `docker-compose.yml`: Volume mounts configuration
- `Dockerfile.dev`: Container user setup
- `backend/prisma/schema.prisma`: Generated file (owned by container user)
- `backend/prisma/schema/*.prisma`: Source files (should be owned by local user)












