#!/bin/sh
# Im eigenen Terminal starten oder als Programm ausführen.
set -eu
cd -- "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PORT="${PORT:-8081}"
export PORT
node tools/serve.mjs &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT HUP INT TERM
sleep 1
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo 'Server konnte nicht gestartet werden. Ist der Port bereits belegt?'
  exit 1
fi
if command -v firefox >/dev/null 2>&1; then
  firefox --new-tab "http://127.0.0.1:$PORT/" &
else
  xdg-open "http://127.0.0.1:$PORT/" &
fi
printf 'Server läuft auf http://127.0.0.1:%s/ — dieses Terminal geöffnet lassen.\n' "$PORT"
wait "$SERVER_PID"
