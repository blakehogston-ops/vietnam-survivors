#!/bin/bash
# Usage: steam/rebuild_from.sh <lead_sha>   (run from anywhere; works on branch rc8.2/25-pkg-merge)
# Re-merges Lead's sha using the MERGE_NOTES.md rules, runs the gates, preps and builds the Windows zip. Never pushes.
set -euo pipefail
SHA=${1:?usage: rebuild_from.sh <sha>}
R=/workspace/wt-rc82-sbe; B=/workspace/builds; cd "$R"
H=$(date +%H%M); if [ "$H" -ge 1935 ] && [ "$H" -lt 2115 ]; then echo "QA box quiet window (7:35-9:15 PM ET): no builds now."; exit 1; fi
[ "$(git rev-parse --abbrev-ref HEAD)" = "rc8.2/25-pkg-merge" ] || { echo "not on rc8.2/25-pkg-merge"; exit 1; }
git diff --quiet -- . ':!steam/package.json' || { echo "dirty tree; stop"; exit 1; }
git checkout -q -- steam/package.json   # drop prep's old lcoStamp edit
if ! git merge --no-ff --no-edit "$SHA" -m "rc8.2: merge $SHA (packaging)"; then
  for f in $(git diff --name-only --diff-filter=U); do
    case "$f" in
      steam/main.js|steam/*) echo "CONFLICT in $f: resolve by hand (see steam/MERGE_NOTES.md), then rerun from the gates"; exit 2;;
      ASSET_LICENSE_LOG.md) git show :2:"$f" > /tmp/o; git show :1:"$f" > /tmp/b 2>/dev/null || : > /tmp/b; git show :3:"$f" > /tmp/t
                            git merge-file --union /tmp/o /tmp/b /tmp/t; cp /tmp/o "$f"; git add "$f";;
      *) git checkout --theirs -- "$f"; git add "$f";;   # game code: Lead's side
    esac
  done
  git commit -q --no-edit
fi
NEW=$(git rev-parse --short HEAD); echo "merge sha $NEW"
# gates
! rg -q '^(<<<<<<<|>>>>>>>)' . || { echo "conflict markers left"; exit 3; }
for f in steam/*.js; do node --check "$f"; done
rg -q 'reqOk\(r\)\{ if\(!r\)return true' index.html || { echo "reqOk guard missing"; exit 3; }
rg -q 'L=G\.spkCap\|\|\(G\.spkCap=\[\]\)' index.html || { echo "spkCap fix missing"; exit 3; }
rg -q 'function redactPath' steam/main.js || { echo "redactPath missing"; exit 3; }
BRAND=$(printf "%s%s" zip po); [ "$(rg -i "$BRAND" | wc -l)" -eq 0 ] || { echo "brand gate FAILED"; exit 3; }
git diff --stat "$SHA" HEAD -- . ':!steam'
# build
cd steam
[ -d node_modules ] || npm ci
[ -d dist ] && mkdir -p superseded && mv -n dist "superseded/dist-before-$NEW"
node prep.js
npx electron-builder --win zip --x64
OUT=$B/win-rc8.2-$NEW-candidate; mkdir -p "$OUT"
cp -n "dist/Last Chopper Out-0.7.0-win.zip" "$OUT/LCO-win-rc8.2-$NEW.zip"
! unzip -l "$OUT/LCO-win-rc8.2-$NEW.zip" | rg -q '/(tools|qa|proof)/' || { echo "tools/qa/proof leaked into zip"; exit 4; }
(cd "$B" && sha256sum "win-rc8.2-$NEW-candidate/LCO-win-rc8.2-$NEW.zip" | tee "rc8.2-${NEW}_SHA256.txt")
printf 'CANDIDATE until QA confirms. merge of %s at %s. No icon step (box Wine broken), unsigned. Do not share.\n' "$SHA" "$NEW" > "$OUT/CANDIDATE.txt"
git -C "$R" checkout -q -- steam/package.json
echo "done: $OUT"
