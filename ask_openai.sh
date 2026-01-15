#!/bin/bash

# Simple OpenAI terminal script
# Usage: ./ask_openai.sh "Your question here"

# Check for argument
if [ -z "$1" ]; then
  echo "Usage: $0 \"Your prompt here\""
  exit 1
fi

PROMPT="$1"

# Make the API call
curl -s https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d "{
    \"model\": \"gpt-3.5-turbo\",
    \"messages\": [{\"role\": \"user\", \"content\": \"$PROMPT\"}]
  }" | jq -r '.choices[0].message.content'
