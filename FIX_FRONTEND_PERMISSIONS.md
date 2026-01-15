# Fix Frontend Permissions

## Problem

The frontend container cannot write to `/app/next-env.d.ts` because of permission issues. The client directory is likely owned by `1001:1001` (Docker user) instead of `bkg:bkg`.

## Solution

Run these commands in your terminal:

```bash
sudo chown -R bkg:bkg /home/bkg/ns/client
```

Then restart the frontend:

```bash
docker-compose --profile frontend restart frontend
```

## Verify

After fixing, check the logs:

```bash
docker-compose logs frontend --tail 20
```

You should see Next.js starting successfully without permission errors.












