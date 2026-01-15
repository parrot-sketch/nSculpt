# Fix Permissions - Run These Commands

## Quick Fix Commands

Run these commands in your terminal (they require sudo password):

```bash
# Fix backend source directory ownership
sudo chown -R bkg:bkg /home/bkg/ns/backend/src

# Fix prisma directory
sudo chown -R bkg:bkg /home/bkg/ns/backend/prisma

# Fix root backend files
sudo chown bkg:bkg /home/bkg/ns/backend/package.json
sudo chown bkg:bkg /home/bkg/ns/backend/tsconfig.json
sudo chown bkg:bkg /home/bkg/ns/backend/nest-cli.json
```

## Verify Fix

After running the commands, verify:

```bash
# Check ownership
ls -la /home/bkg/ns/backend/src/modules/audit/services/

# Test write permission
touch /home/bkg/ns/backend/src/modules/audit/services/test.tmp
rm /home/bkg/ns/backend/src/modules/audit/services/test.tmp
echo "✅ Permissions fixed!"
```

## After Permissions Are Fixed

Once you can write to the directory, I can create the missing `rlsValidation.service.ts` file automatically.

---

**Status**: Waiting for you to run the sudo commands above.












