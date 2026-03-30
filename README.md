# Buddy Client

Buddy Client is the Cocos Creator 3.8.7 frontend for the study companion project.

## Workspace

- Engine: Cocos Creator 3.8.7
- Root: `E:\buddy-client`
- Git repo: outer repository only

## Initial Structure

- `assets/scenes`: editor-created scene files
- `assets/scripts/app`: app-level state
- `assets/scripts/core`: config and storage helpers
- `assets/scripts/network`: backend API client
- `assets/scripts/types`: shared TypeScript types
- `assets/scripts/ui`: page controllers and UI modules

## Current Goal

1. Keep the project recognized by Cocos Creator 3.8.7.
2. Build one clean client implementation only under `assets/scripts`.
3. Align all API calls with the real `buddy-server` routes.
4. Add login and main status pages before expanding other screens.
