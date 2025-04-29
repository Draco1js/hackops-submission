#!/bin/bash

# This script helps you set up GitHub secrets for your CI/CD workflow
# You'll need the GitHub CLI (gh) installed: https://cli.github.com/

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI is not installed. Please install it first: https://cli.github.com/"
    exit 1
fi

# Check if logged in to GitHub
if ! gh auth status &> /dev/null; then
    echo "You're not logged in to GitHub. Please run 'gh auth login' first."
    exit 1
fi

# Get the repository name
REPO=$(git config --get remote.origin.url | sed 's/.*github.com[:\/]\(.*\)\.git/\1/')

if [ -z "$REPO" ]; then
    echo "Could not determine repository name. Please make sure you're in a git repository with a GitHub remote."
    exit 1
fi

echo "Setting up secrets for repository: $REPO"

# Set VPS_HOST secret
echo "Setting VPS_HOST secret..."
gh secret set VPS_HOST --body "142.93.160.146" --repo "$REPO"

# Set VPS_USERNAME secret
echo "Setting VPS_USERNAME secret..."
gh secret set VPS_USERNAME --body "root" --repo "$REPO"

# Set VPS_SSH_KEY secret
echo "Setting VPS_SSH_KEY secret..."
# Read the SSH key from the file
if [ -f "vps.key" ]; then
    gh secret set VPS_SSH_KEY --body "$(cat vps.key)" --repo "$REPO"
else
    echo "SSH key file 'vps.key' not found. Please create this file with your SSH private key."
    exit 1
fi

echo "GitHub secrets have been set up successfully!"
