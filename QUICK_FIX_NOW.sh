#!/bin/bash
# Quick fix for immediate permission issues
# Run this NOW to fix the current file you're trying to save

echo "🔧 Quick permission fix..."
echo ""

# Fix the specific file mentioned
sudo chown bkg:bkg /home/bkg/ns/backend/prisma/scripts/merge-schema.sh 2>&1 && echo "✅ Fixed merge-schema.sh" || echo "⚠️  Could not fix merge-schema.sh"

# Fix all prisma scripts
sudo chown -R bkg:bkg /home/bkg/ns/backend/prisma/scripts/ 2>&1 && echo "✅ Fixed all prisma scripts" || echo "⚠️  Could not fix prisma scripts"

# Fix common problem directories
sudo chown -R bkg:bkg /home/bkg/ns/backend/src/ 2>&1 && echo "✅ Fixed backend/src/" || echo "⚠️  Could not fix backend/src/"
sudo chown -R bkg:bkg /home/bkg/ns/client/ 2>&1 && echo "✅ Fixed client/" || echo "⚠️  Could not fix client/"

echo ""
echo "✅ Quick fix complete! You should now be able to save files."
echo ""
echo "For a permanent solution, see: FIX_PERMISSIONS_GUIDE.md"











