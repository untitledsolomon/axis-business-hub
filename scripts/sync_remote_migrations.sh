#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?Need SUPABASE_ACCESS_TOKEN environment variable or GitHub secret}" 
: "${SUPABASE_PROJECT_ID:?Need SUPABASE_PROJECT_ID environment variable or workflow input/secret}"

echo "Starting Supabase remote migrations sync helper"

# Check for supabase CLI
if command -v supabase >/dev/null 2>&1; then
  echo "Found supabase CLI: $(supabase --version 2>/dev/null || echo '(version unknown)')"
else
  echo "supabase CLI not found. Attempting to continue — some operations may fail."
fi

# Attempt to list remote migrations (try common CLI variants). Save JSON to remote_migs.json
echo "Listing remote migrations for project: $SUPABASE_PROJECT_ID"

if supabase migrations list --project-ref "$SUPABASE_PROJECT_ID" --json > remote_migs.json 2>/dev/null; then
  echo "Saved remote migration list to remote_migs.json"
elif supabase migrations list --project-id "$SUPABASE_PROJECT_ID" --json > remote_migs.json 2>/dev/null; then
  echo "Saved remote migration list to remote_migs.json"
else
  echo "Failed to run 'supabase migrations list' with common flags."
  echo "Guidance: run locally with your supabase CLI or use the Supabase Studio to download migration SQL. Example local command (may vary by CLI version):"
  echo "  supabase migrations list --project-ref <project_ref> --json"
  echo "If that works, you can then download missing SQL files and place them under supabase/migrations with exact filenames."
  exit 1
fi

# Compare remote migration names to local files
python3 - <<'PY'
import json, os, sys

with open('remote_migs.json') as f:
    data = json.load(f)

# Normalize extraction of migration name/version depending on CLI output shape
remote_names = []
for item in data:
    # try common keys
    name = item.get('name') or item.get('version') or item.get('filename')
    if name:
        remote_names.append(name)

local_dir = 'supabase/migrations'
local_files = set(os.listdir(local_dir)) if os.path.isdir(local_dir) else set()

missing = [n for n in remote_names if n and n not in local_files]
if not missing:
    print('No remote-only migrations found. Nothing to do.')
    sys.exit(0)

print('Remote-only migrations detected:')
for m in missing:
    print(' -', m)

print('\nAttempting best-effort download hints for each missing migration.')
for v in missing:
    # Provide a best-effort CLI command suggestion — actual CLI flags may differ by version
    filename = v if v.endswith('.sql') else v + '.sql'
    out = os.path.join(local_dir, filename)
    print('\nMigration:', v)
    print('Suggested manual download command (run locally):')
    print(f"  supabase migrations download --project-ref {os.environ['SUPABASE_PROJECT_ID']} --name '{v}' --output '{out}'")

print('\nAfter downloading the missing SQL files into supabase/migrations with EXACT filenames, commit and push them. Then run:')
print('  supabase db push')
print('\nExiting with status 0 (operator action required).')
PY

# End

echo "Helper completed. If missing migrations were detected, follow printed guidance to fetch and commit them."
