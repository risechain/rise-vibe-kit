#!/bin/bash

# Script to recreate all template apps with fixes

echo "🧹 Cleaning up existing apps in appTests..."
mkdir -p appTests
cd appTests
rm -rf chat-app pump-app frenpet-app

echo -e "\n📦 Creating chat-app..."
node ../create-rise-app/bin/cli.js chat-app --template chat --yes --no-install

echo -e "\n📦 Creating pump-app..."
node ../create-rise-app/bin/cli.js pump-app --template pump --yes --no-install

echo -e "\n📦 Creating frenpet-app..."
node ../create-rise-app/bin/cli.js frenpet-app --template frenpet --yes --no-install

echo -e "\n✅ Verifying contract addresses..."
echo -e "\nChat App address:"
grep "address:" chat-app/frontend/src/contracts/contracts.ts | head -1
echo "Expected: 0xcf7b7f03188f3b248d6a3d4bd589dc7c31b55084"

echo -e "\nPump App address:"
grep "address:" pump-app/frontend/src/contracts/contracts.ts | head -1
echo "Expected: 0x04f339ec4d75cf2833069e6e61b60ef56461cd7c"

echo -e "\nFrenPet App address:"
grep "address:" frenpet-app/frontend/src/contracts/contracts.ts | head -1
echo "Expected: 0x2d222d701b29e9d8652bb9afee0a1dabdad0bc23"

echo -e "\n✅ Checking NavigationBar for dropdown removal..."
echo -e "\nChat App NavigationBar:"
if grep -q "DropdownMenu" chat-app/frontend/src/components/NavigationBar.tsx 2>/dev/null; then
  echo "❌ Still has DropdownMenu"
else
  echo "✓ No DropdownMenu found (good!)"
fi

echo -e "\nPump App NavigationBar:"
if grep -q "DropdownMenu" pump-app/frontend/src/components/NavigationBar.tsx 2>/dev/null; then
  echo "❌ Still has DropdownMenu"
else
  echo "✓ No DropdownMenu found (good!)"
fi

echo -e "\nFrenPet App NavigationBar:"
if grep -q "DropdownMenu" frenpet-app/frontend/src/components/NavigationBar.tsx 2>/dev/null; then
  echo "❌ Still has DropdownMenu"
else
  echo "✓ No DropdownMenu found (good!)"
fi

cd ..

echo -e "\n✅ All apps recreated! You can now test them manually."