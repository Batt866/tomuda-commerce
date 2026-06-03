#!/bin/bash
set -e
cd "$(dirname "$0")/.."
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

KEYSTORE="android/tomuda-release.keystore"
KEYSTORE_PROPS="android/keystore.properties"

if [ ! -f "$KEYSTORE" ]; then
  echo "→ Release keystore үүсгэж байна..."
  keytool -genkey -v -keystore "$KEYSTORE" \
    -alias tomuda -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass tomudaRelease2026 -keypass tomudaRelease2026 \
    -dname "CN=TOMUDA Commerce, OU=Mobile, O=TOMUDA, L=Ulaanbaatar, C=MN"
fi

if [ ! -f "$KEYSTORE_PROPS" ]; then
  cat > "$KEYSTORE_PROPS" <<'EOF'
storeFile=../tomuda-release.keystore
storePassword=tomudaRelease2026
keyAlias=tomuda
keyPassword=tomudaRelease2026
EOF
fi

echo "→ Capacitor sync..."
npx cap sync android

echo "→ Release APK build..."
cd android
./gradlew assembleRelease

mkdir -p ../static/tomuda/downloads
cp app/build/outputs/apk/release/app-release.apk ../static/tomuda/downloads/TOMUDA.apk
echo "✓ APK: static/tomuda/downloads/TOMUDA.apk (release, signed)"
