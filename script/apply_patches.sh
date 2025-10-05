#!/usr/bin/env bash
set -euo pipefail

PATCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

apply_patch () {
  local patch="$1"
  echo "Applying $patch..."
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    # try various -p levels
    git apply "$patch" || git apply -p1 "$patch" || git apply -p2 "$patch"
  else
    patch -p0 -N -s < "$patch" || patch -p1 -N -s < "$patch" || patch -p2 -N -s < "$patch"
  fi
}

apply_patch "$PATCH_DIR/patch1_free_signals.diff"
apply_patch "$PATCH_DIR/patch2_remove_mocks.diff"
apply_patch "$PATCH_DIR/patch3_prod_hardening.diff"

echo "All patches applied."
