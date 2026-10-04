#!/bin/bash
# TOMUDA Android debug APK build (Java 21 + Android SDK шаардлагатай)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

if [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "✗ Java 21 олдсонгүй. Суулгах:"
  echo "  brew install openjdk@21"
  exit 1
fi

if [ ! -d "$ANDROID_HOME" ]; then
  echo "✗ Android SDK олдсонгүй: $ANDROID_HOME"
  echo "  Android Studio суулгах эсвэл command-line tools тохируулна уу."
  exit 1
fi

echo "Java: $($JAVA_HOME/bin/java -version 2>&1 | head -1)"
echo "SDK:  $ANDROID_HOME"
echo ""

npm install
npx cap sync android

cd android
./gradlew assembleDebug

APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "✓ APK бэлэн:"
echo "  $APK"
echo ""
echo "Утсанд илгээж суулгана (Telegram/Drive/USB)."
