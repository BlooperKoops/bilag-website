#!/bin/bash
# BILAG website — local demo launcher
# Double-click this file in Finder (or run it from Terminal) to start a local
# preview of the site. Press Ctrl+C in this window to stop it.

cd "$(dirname "$0")" || exit 1

# Pick the first free port from 8080 upwards
PORT=8080
while lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT+1))
done

echo ""
echo "  BILAG website demo"
echo "  ------------------"
echo "  Serving: $(pwd)"
echo "  Address: http://localhost:$PORT"
echo ""
echo "  Your browser should open automatically."
echo "  Leave this window open while you demo; press Ctrl+C to stop."
echo ""

# Open the browser once the server is listening
( for i in $(seq 1 30); do
    if curl -s -o /dev/null "http://localhost:$PORT/index.html"; then
      open "http://localhost:$PORT/index.html"
      exit 0
    fi
    sleep 0.3
  done ) &

python3 -m http.server "$PORT"
