#!/bin/bash
# Download alle MuscleWiki video's voor Lisanne's app
# Run vanuit de FitnessApp map: bash download-videos.sh

mkdir -p videos
cd videos

echo "Downloaden Lisanne's video's..."

# Nieuwe oefeningen
curl -L -o goblet-squat.mp4 "https://media.musclewiki.com/media/uploads/videos/branded/female-dumbbell-goblet-squat-front.mp4"
curl -L -o glute-bridge.mp4 "https://media.musclewiki.com/media/uploads/videos/branded/female-bodyweight-glute-bridge-front.mp4"

# Stretches
curl -L -o hip-flexor.mp4 "https://media.musclewiki.com/media/uploads/videos/branded/female-bodyweight-hip-flexor-stretch-kneeling-lunge-3-front.mp4"
curl -L -o hamstrings.mp4 "https://media.musclewiki.com/media/uploads/videos/branded/female-hamstrings-stretch-variation-1-side.mp4"
curl -L -o quads.mp4 "https://media.musclewiki.com/media/uploads/videos/branded/female-quads-stretch-variation-1-side.mp4"
curl -L -o calves.mp4 "https://media.musclewiki.com/media/uploads/videos/branded/female-calves-stretch-variation-1-side.mp4"
curl -L -o chest-doorway.mp4 "https://media.musclewiki.com/media/uploads/videos/branded/female-chest-stretch-variation-1-side.mp4"
curl -L -o rug-stretch.mp4 "https://media.musclewiki.com/media/uploads/videos/branded/female-abdominals-stretch-variation-1-side.mp4"
curl -L -o glutes.mp4 "https://media.musclewiki.com/media/uploads/videos/branded/female-glutes-stretch-variation-1-side.mp4"

echo ""
echo "Klaar! Gedownloade bestanden:"
ls -lh *.mp4
