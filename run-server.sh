#!/usr/bin/env bash
# Run the cuRiding server, restarting it if it crashes. Logs to server.log.
cd "$(dirname "$0")/server" || exit 1
while true; do
  .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 >> ../server.log 2>&1
  echo "server exited $(date), restarting in 3s" >> ../server.log
  sleep 3
done
