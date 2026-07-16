#!/bin/sh
# RN's bundled ccache wrappers rely on the CCACHE_BINARY build setting reaching
# them as an env var, which Xcode 26 doesn't do — so they silently fall back to
# plain clang. Resolve everything locally instead.
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
export CCACHE_CONFIGPATH="${CCACHE_CONFIGPATH:-$SCRIPT_DIR/../ccache.conf}"
CCACHE_BINARY="$(command -v ccache || echo /opt/homebrew/bin/ccache)"
if [ -x "$CCACHE_BINARY" ]; then
  exec "$CCACHE_BINARY" clang "$@"
fi
exec clang "$@"
