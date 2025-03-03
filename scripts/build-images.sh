#!/bin/bash
set -e

# Get the project root directory (parent of script directory)
PROJECT_ROOT="$(dirname "$(dirname "$(realpath "$0")")")"

# Change to the project root directory
cd "${PROJECT_ROOT}"

# Get package version from package.json
IMAGE_NAME="bolasblack/traefik-avahi-helper"
VERSION=$(node -p "require('./package.json').version")
TAG="${VERSION}"

echo "Building Docker image ${IMAGE_NAME}:${TAG} for multiple platforms..."

# Check if Docker is using containerd image store
if ! docker info | grep -q "containerd"; then
  echo "Warning: Docker may not be using containerd image store."
  echo "Multi-platform builds require containerd image store enabled in Docker Desktop settings or Docker Engine configuration."
  echo "Please enable containerd image store and try again."
  echo "https://docs.docker.com/engine/storage/containerd/"
  echo "https://docs.docker.com/build/building/multi-platform/#install-qemu-manually"
  exit 1
fi

# Use standard docker build with multi-platform support
echo "Using docker build with multi-platform support..."
docker build \
  --platform linux/amd64,linux/arm64 \
  --tag "${IMAGE_NAME}:latest" \
  --tag "${IMAGE_NAME}:${TAG}" \
  --push \
  .

echo "Successfully built and pushed ${IMAGE_NAME}:${TAG} and ${IMAGE_NAME}:latest for multiple platforms."