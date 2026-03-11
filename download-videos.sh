#!/bin/bash
# Download missende MuscleWiki video's voor Lisanne's app
# Run vanuit de FitnessApp map: bash download-videos.sh

mkdir -p videos
cd videos

# Functie: probeer meerdere URL-variaties, download de eerste die werkt
try_download() {
  local filename="$1"
  shift

  # Skip als bestand al goed is (> 1KB)
  if [ -f "$filename" ] && [ $(stat -f%z "$filename" 2>/dev/null || stat -c%s "$filename" 2>/dev/null) -gt 1000 ]; then
    echo "✓ $filename bestaat al ($(du -h "$filename" | cut -f1))"
    return 0
  fi

  echo "Downloaden $filename..."
  for url in "$@"; do
    curl -sL -o "$filename.tmp" "$url"
    local size=$(stat -f%z "$filename.tmp" 2>/dev/null || stat -c%s "$filename.tmp" 2>/dev/null)
    if [ "$size" -gt 1000 ]; then
      mv "$filename.tmp" "$filename"
      echo "  ✓ Gedownload! ($(du -h "$filename" | cut -f1))"
      return 0
    fi
  done
  rm -f "$filename.tmp"
  echo "  ✗ NIET GEVONDEN - download handmatig van musclewiki.com"
  return 1
}

echo "=== Lisanne's video's downloaden ==="
echo ""

# Glute bridge
try_download glute-bridge.mp4 \
  "https://media.musclewiki.com/media/uploads/videos/branded/female-bodyweight-glute-bridge-front.mp4" \
  "https://media.musclewiki.com/media/uploads/videos/branded/female-Bodyweight-glute-bridge-front.mp4" \
  "https://media.musclewiki.com/media/uploads/videos/branded/female-bodyweight-glute-bridge-side.mp4"

# Hip flexor stretch
try_download hip-flexor.mp4 \
  "https://media.musclewiki.com/media/uploads/videos/branded/female-bodyweight-hip-flexor-stretch-kneeling-lunge-3-front.mp4" \
  "https://media.musclewiki.com/media/uploads/videos/branded/female-hip-flexors-stretch-variation-1-side.mp4" \
  "https://media.musclewiki.com/media/uploads/videos/branded/female-quads-stretch-variation-2-side.mp4" \
  "https://media.musclewiki.com/media/uploads/videos/branded/female-bodyweight-hip-flexor-stretch-kneeling-lunge-front.mp4"

# Deze hoeven niet opnieuw (werken al):
# chest-press, incline-press, shoulder-press, dumbbell-row, leg-ext, leg-curl,
# plank, goblet-squat, calves, chest-doorway, hamstrings, quads, rug-stretch, glutes

echo ""
echo "=== Resultaat ==="
echo "Werkende video's (>1KB):"
find . -name "*.mp4" -size +1k -exec ls -lh {} \; 2>/dev/null | awk '{print "  ✓", $NF, $5}'
echo ""
echo "Kapotte/missende video's (<1KB):"
find . -name "*.mp4" ! -size +1k -exec ls -lh {} \; 2>/dev/null | awk '{print "  ✗", $NF, $5}'
echo ""
echo "Tip: voor missende video's, ga naar musclewiki.com, zoek de oefening,"
echo "rechtsklik op de video > 'Save video as' en sla op met de juiste naam."
