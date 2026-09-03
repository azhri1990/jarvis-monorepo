#!/bin/bash
set -e

echo "🚀 J.A.R.V.I.S Monorepo Setup"
echo ""

# Check Node version
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node 22+"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo "⚠️  Node version is $NODE_VERSION. You need Node 22+ (preferably 22+)"
  read -p "Continue anyway? (y/n) " -n 1 -r; echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then exit 1; fi
fi

echo "✅ Node $(node -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

echo "🔗 Bootstrapping workspaces..."
npm run bootstrap

echo ""
echo "📁 Creating directories..."
mkdir -p ~/jarvis/state
chmod 700 ~/jarvis/state

echo ""
echo "🔑 Generating SHARED_SECRET..."
SECRET=$(openssl rand -hex 32)
echo "SHARED_SECRET=$SECRET" > .env.local
echo "✅ Saved to .env.local"

echo ""
echo "🎯 Next steps:"
echo "1. Build everything: npm run build"
echo "2. Check docs/DEPLOYMENT.md for full setup"
echo "3. Start gateway: npm run dev:gateway"
echo "4. Start mobile: npm run dev:mobile"
echo ""
echo "🎉 Setup complete!"
