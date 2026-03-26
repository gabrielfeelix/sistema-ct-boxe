#!/bin/bash
echo "Installing pnpm 8.15.1..."
npm install -g pnpm@8.15.1
echo "Installing dependencies..."
cd ../..
pnpm install --frozen-lockfile
