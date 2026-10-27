#!/usr/bin/env bash
# Rebuilds Grove and installs it on the iPhone plugged into this Mac.
# Run it with `npm run ios:reinstall` when the free 7-day install has expired
# (the app stops opening). Your data stays: it lives on the phone, not in the install.
# Needs: Xcode installed, your Apple ID added in Xcode, and the iPhone unlocked,
# plugged in by cable and trusting this Mac.

# Stop at the first command that fails, treat unset variables as errors.
set -euo pipefail

# Work from the project folder, wherever the script is started from.
cd "$(dirname "$0")/.."

# Build the app's web bundle for the iPhone (relative paths, no service worker).
npm run build:native

# Copy that bundle and the native plugins into the Xcode project.
npx cap sync ios

# Make a temporary file for the device list, removed again when the script ends.
devices_json="$(mktemp)"
trap 'rm -f "$devices_json"' EXIT

# Ask Xcode's device tool for every iPhone it can see, written as JSON.
xcrun devicectl list devices --json-output "$devices_json" >/dev/null

# Pick a paired iPhone that is reachable right now, preferring one on a cable (empty if none).
udid="$(node -e '
  const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const phones = (d.result?.devices ?? []).filter((x) =>
    x.hardwareProperties?.platform === "iOS" &&
    x.connectionProperties?.pairingState === "paired" &&
    x.connectionProperties?.tunnelState !== "unavailable");
  const phone = phones.find((x) => x.connectionProperties?.transportType === "wired") ?? phones[0];
  process.stdout.write(phone?.hardwareProperties?.udid ?? "");
' "$devices_json")"

# With no iPhone found, open the project in Xcode instead so you can pick one and press Run.
if [ -z "$udid" ]; then
  echo "No paired iPhone found. Plug it in, unlock it, tap Trust, then run this again."
  echo "Opening Xcode so you can run it from there instead."
  npx cap open ios
  exit 1
fi

# Signing uses the Personal Team picked once in Xcode (step in the setup notes).
# If you would rather pass it here, run: GROVE_TEAM_ID=YOURTEAMID npm run ios:reinstall
team_setting=()
if [ -n "${GROVE_TEAM_ID:-}" ]; then
  # Use the team id given on the command line for this build.
  team_setting=("DEVELOPMENT_TEAM=$GROVE_TEAM_ID")
fi

# Build the app for that iPhone; -allowProvisioningUpdates renews the free 7-day signing.
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -destination "id=$udid" \
  -derivedDataPath ios/DerivedData \
  -allowProvisioningUpdates \
  ${team_setting[@]+"${team_setting[@]}"} \
  build

# Install the freshly built app on the iPhone (replaces the expired one, keeps its data).
xcrun devicectl device install app --device "$udid" ios/DerivedData/Build/Products/Debug-iphoneos/App.app

# Open Grove on the iPhone.
xcrun devicectl device process launch --device "$udid" com.vejaysuriyaa.grove

# Say it worked.
echo "Grove is installed again. It runs for another 7 days."
