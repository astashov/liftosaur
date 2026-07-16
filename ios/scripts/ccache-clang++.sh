#!/bin/sh
# See ccache-clang.sh for why these wrappers exist instead of RN's bundled ones.
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
export CCACHE_CONFIGPATH="${CCACHE_CONFIGPATH:-$SCRIPT_DIR/../ccache.conf}"
CCACHE_BINARY="$(command -v ccache || echo /opt/homebrew/bin/ccache)"
if [ -x "$CCACHE_BINARY" ]; then
  exec "$CCACHE_BINARY" clang++ "$@"
fi
exec clang++ "$@"
