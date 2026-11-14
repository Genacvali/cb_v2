#!/bin/bash
# Builds /Applications/CrystalBudget.app (start/stop launcher for the local dev server).
# Every rebuild changes the code signature, so macOS asks for Documents access again.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPTS="$(dirname "${HERE}")"
PUBLIC="$(dirname "${SCRIPTS}")/public"
DEST="/Applications/CrystalBudget.app"
TMP="$(mktemp -d)/CrystalBudget.app"
SUPPORT="${HOME}/Library/Application Support/CrystalBudget"

osacompile -o "${TMP}" "${HERE}/CrystalBudget.applescript"

RES="${TMP}/Contents/Resources"
cp "${SCRIPTS}/cb-service.sh" "${RES}/cb-service.sh"
chmod +x "${RES}/cb-service.sh"
cp "${PUBLIC}/app-icon.icns" "${RES}/CrystalBudget.icns"
cp "${PUBLIC}/app-icon.icns" "${RES}/applet.icns"
rm -f "${RES}/Assets.car"

PLIST="${TMP}/Contents/Info.plist"
pb() { /usr/libexec/PlistBuddy -c "$1" "${PLIST}" 2>/dev/null || true; }
pb "Delete :CFBundleIconName"
pb "Delete :CFBundleIconFile"
pb "Add :CFBundleIconFile string CrystalBudget"
pb "Delete :CFBundleIdentifier"
pb "Add :CFBundleIdentifier string com.genacvali.crystalbudget.launcher"
pb "Delete :CFBundleName"
pb "Add :CFBundleName string CrystalBudget"
pb "Delete :CFBundleDisplayName"
pb "Add :CFBundleDisplayName string CrystalBudget"
pb "Delete :NSDocumentsFolderUsageDescription"
pb "Add :NSDocumentsFolderUsageDescription string CrystalBudget запускает локальный сервер из папки проекта в «Документах»."

# Signature must be redone after editing the bundle, otherwise macOS silently denies Documents access
codesign --force --deep --sign - "${TMP}"
codesign --verify --deep --strict "${TMP}"

mkdir -p "${SUPPORT}"
cp "${SCRIPTS}/cb-service.sh" "${SUPPORT}/cb-service.sh"
chmod +x "${SUPPORT}/cb-service.sh"

rm -rf "${DEST}"
cp -R "${TMP}" "${DEST}"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "${DEST}"
echo "Установлено: ${DEST}"
