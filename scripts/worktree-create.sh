#!/bin/sh
set -eu

# Create an independent dev worktree with its own domains, ports, certs and DNS.
# Native (pods + simulator) is provisioned on-demand later via `npm run worktree:ios`.

NAME="${1:-}"
INDEX="${2:-}"

if [ -z "$NAME" ]; then
  echo "Usage: scripts/worktree-create.sh <name> [index]"
  echo "  [index] is optional; a free one in 2..20 is picked at random if omitted."
  echo "  Index 1 is reserved for the base repo. Each index maps to a 10-wide port block."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DIR="worktrees/$NAME"
if [ -e "$DIR" ]; then
  echo "$DIR already exists"
  exit 1
fi

# Collect indices already taken by existing worktrees (from their localdomain.js main = "localN").
USED=""
for f in "$ROOT"/worktrees/*/localdomain.js; do
  [ -f "$f" ] || continue
  m=$(node -p "try{require('$f').main}catch(e){''}" 2>/dev/null || echo "")
  n=$(printf '%s' "$m" | sed -n 's/^local\([0-9][0-9]*\)$/\1/p')
  [ -n "$n" ] && USED="$USED $n"
done

is_used() { case " $USED " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

if [ -n "$INDEX" ]; then
  if [ "$INDEX" -lt 2 ] 2>/dev/null; then
    echo "Index must be >= 2 (index 1 is reserved for the base repo)."
    exit 1
  fi
  if is_used "$INDEX"; then
    echo "Index $INDEX is already in use by another worktree. Pick another or omit it to auto-pick."
    exit 1
  fi
else
  # Pick a random free index from the bounded pool 2..20. Combined with never deleting
  # certs, this reuses the same small set of domains, so certs are issued once then
  # renewed (renewals are exempt from Let's Encrypt's new-cert rate limit).
  FREE=""
  n=2
  while [ "$n" -le 20 ]; do
    is_used "$n" || FREE="$FREE $n"
    n=$((n + 1))
  done
  if [ -z "$FREE" ]; then
    echo "No free index in 2..20 (too many worktrees). Remove one or pass an explicit index."
    exit 1
  fi
  INDEX=$(node -e "const a=process.argv[1].trim().split(/\s+/); console.log(a[Math.floor(Math.random()*a.length)])" "$FREE")
  echo "==> picked index $INDEX"
fi

OFFSET=$(( (INDEX - 1) * 10 ))
PORT=$(( 8080 + OFFSET ))
APIPORT=$(( 3000 + OFFSET ))
STREAMPORT=$(( 3001 + OFFSET ))
METROPORT=$(( 8081 + OFFSET ))
MAIN="local$INDEX"
API="local$INDEX-api"
STREAM="local$INDEX-streaming-api"

echo "==> git worktree add $DIR (branch $NAME)"
git worktree add "$DIR" -b "$NAME"

cd "$DIR"

echo "==> writing localdomain.js"
cat > localdomain.js <<EOF
module.exports = {
  main: "$MAIN",
  api: "$API",
  streamingapi: "$STREAM",
  port: $PORT,
  apiPort: $APIPORT,
  streamingApiPort: $STREAMPORT,
  metroPort: $METROPORT,
};
EOF

echo "==> npm ci"
npm ci

echo "==> generators (theme, markdown, programs, exercises)"
npm run build:theme
npm run build:markdown
npm run build:programs
npm run build:exercises

echo "==> SSL certs (certbot + cloudflare)"
sh ../../lambda/scripts/update_liftosaur_dev_certs.sh

echo "==> DNS A records -> this machine"
sh ../../lambda/scripts/change_liftosaur_dev_api.sh

cat <<EOF

Created worktree '$NAME' (index $INDEX)
  web    https://$MAIN.liftosaur.com:$PORT
  api    https://$API.liftosaur.com:$APIPORT
  stream https://$STREAM.liftosaur.com:$STREAMPORT
  metro  $METROPORT

Next:
  cd $DIR
  npm start              # web dev server
  npm run start:server   # api + streaming
  npm run worktree:ios   # on-demand: pods + simulator + metro + run
EOF
