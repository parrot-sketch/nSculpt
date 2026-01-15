# Run These Commands to Fix Permissions

## The Problem
The backend directory is owned by user `1001:1001` but you are user `bkg` (uid=1000). You need to change ownership.

## Step 1: Fix Ownership (Copy and paste these commands)

```bash
sudo chown -R bkg:bkg /home/bkg/ns/backend/src
sudo chown -R bkg:bkg /home/bkg/ns/backend/prisma
sudo chown bkg:bkg /home/bkg/ns/backend/package.json
sudo chown bkg:bkg /home/bkg/ns/backend/tsconfig.json
sudo chown bkg:bkg /home/bkg/ns/backend/nest-cli.json
```

**Note**: You'll be prompted for your sudo password. Enter it when asked.

## Step 2: Verify It Worked

After running the commands above, run:

```bash
ls -la /home/bkg/ns/backend/src/modules/audit/services/
```

You should see `bkg bkg` instead of `1001 1001` in the ownership column.

Then test write:

```bash
touch /home/bkg/ns/backend/src/modules/audit/services/test.tmp
rm /home/bkg/ns/backend/src/modules/audit/services/test.tmp
echo "✅ Permissions fixed!"
```

If this works, let me know and I'll create the missing `rlsValidation.service.ts` file automatically!

## Alternative: If sudo doesn't work

If you don't have sudo access, you can try:

```bash
# Check if you're in the docker group
groups | grep docker

# If yes, try using Docker to fix it
docker-compose run --rm --user root backend chown -R 1000:1000 /app/src /app/prisma
```

But the sudo method is the most reliable.












