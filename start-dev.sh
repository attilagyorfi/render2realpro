#!/bin/bash
# Start the dev server with the correct API key from .env.local
# This overrides any system-level OPENAI_API_KEY environment variable

cd "$(dirname "$0")"

# Read the API key from .env.local
CORRECT_KEY=$(grep '^OPENAI_API_KEY=' .env.local | cut -d'"' -f2)

if [ -z "$CORRECT_KEY" ]; then
  echo "ERROR: Could not read OPENAI_API_KEY from .env.local"
  exit 1
fi

echo "Starting dev server with API key: ${CORRECT_KEY:0:20}..."
OPENAI_API_KEY="$CORRECT_KEY" npx next dev --webpack --port 3001
