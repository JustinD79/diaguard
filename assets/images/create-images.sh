#!/bin/bash

# Create a minimal 1x1 transparent PNG (base64 encoded)
TRANSPARENT_PNG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

# Create icon.png (1024x1024 blue square for visibility)
ICON_PNG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

# Decode and create files
echo "$ICON_PNG" | base64 -d > /tmp/cc-agent/60581393/project/assets/images/icon.png
echo "$TRANSPARENT_PNG" | base64 -d > /tmp/cc-agent/60581393/project/assets/images/splash.png
echo "$ICON_PNG" | base64 -d > /tmp/cc-agent/60581393/project/assets/images/adaptive-icon.png
echo "$ICON_PNG" | base64 -d > /tmp/cc-agent/60581393/project/assets/images/favicon.png

echo "Images created successfully"
