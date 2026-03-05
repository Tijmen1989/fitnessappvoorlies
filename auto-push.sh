#!/bin/bash
# ── Auto-push naar GitHub ──
# Dit script checkt of er wijzigingen zijn in de FitnessApp map
# en pusht ze automatisch naar GitHub.

cd ~/Documents/FitnessApp || exit 1

# Check of er wijzigingen zijn
if [ -n "$(git status --porcelain)" ]; then
  git add .
  git commit -m "Auto-update $(date '+%d-%m-%Y %H:%M')"
  git push
  echo "$(date): Wijzigingen gepusht naar GitHub" >> ~/Documents/FitnessApp/.push-log.txt
fi
