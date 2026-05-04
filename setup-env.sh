#!/bin/bash

# ============================================
# CryptoDraw Environment Setup Script
# ============================================
# Run this script to setup your environment

set -e  # Exit on error

echo "🚀 CryptoDraw Environment Setup"
echo "================================"

# Function to check if file exists
check_file() {
    if [ ! -f "$1" ]; then
        echo "❌ File $1 not found!"
        return 1
    else
        echo "✅ Found $1"
        return 0
    fi
}

# Function to copy env file
copy_env() {
    local source=$1
    local target=$2
    
    if [ -f "$target" ]; then
        echo "⚠️  $target already exists. Backup created as $target.bak"
        cp "$target" "$target.bak"
    fi
    
    cp "$source" "$target"
    echo "📁 Copied $source to $target"
}

# Check if we're in the right directory
if [ ! -f "hardhat.config.js" ]; then
    echo "❌ Please run this script from the CryptoDraw root directory"
    exit 1
fi

echo ""
echo "📋 Available environment configurations:"
echo "1. Development (harmony_testnet)"
echo "2. Production (harmony_mainnet)"
echo "3. Custom setup"
echo ""

read -p "Choose option (1-3): " choice

case $choice in
    1)
        echo "🔧 Setting up DEVELOPMENT environment..."
        copy_env ".env.development" ".env"
        echo ""
        echo "✅ Development environment configured!"
        echo "📝 Edit .env file to add your:"
        echo "   - PRIVATE_KEY (testnet key)"
        echo "   - Wallet addresses"
        echo "   - Token addresses (if different)"
        ;;
    2)
        echo "🏭 Setting up PRODUCTION environment..."
        copy_env ".env.production" ".env"
        echo ""
        echo "✅ Production environment template configured!"
        echo "🚨 IMPORTANT: Edit .env file with REAL values:"
        echo "   - PRIVATE_KEY (use hardware wallet recommended)"
        echo "   - All wallet addresses (use multi-sig)"
        echo "   - API keys and monitoring"
        echo "   - Database and Redis URLs"
        ;;
    3)
        echo "🎨 Setting up CUSTOM environment..."
        copy_env ".env.example" ".env"
        echo ""
        echo "✅ Custom environment template configured!"
        echo "📝 Edit .env file with your custom configuration"
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🔐 Security reminders:"
echo "   - Never commit .env files to git"
echo "   - Use strong, unique private keys"
echo "   - Enable 2FA on all accounts"
echo "   - Use multi-sig wallets for production"
echo ""

# Check if .env was created successfully
if check_file ".env"; then
    echo "🎉 Environment setup complete!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Edit .env with your values"
    echo "   2. Install dependencies: npm install"
    echo "   3. Compile contracts: npx hardhat compile"
    echo "   4. Deploy: npx hardhat run scripts/deploy-harmony.js --network harmony_testnet"
else
    echo "❌ Failed to create .env file"
    exit 1
fi