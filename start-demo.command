#!/bin/bash
cd "$(dirname "$0")"
echo "Starting local BILAG website demo at http://localhost:8080 ..."
open "http://localhost:8080/index.html"
python3 -m http.server 8080
