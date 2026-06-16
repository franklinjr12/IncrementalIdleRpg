# Android Docker Build

The host machine only needs Docker. The container provides Node.js, npm, JDK 21, Android command-line tools, Android SDK platform 36, Android build-tools 35.0.0/36.0.0, and the Gradle wrapper runtime.

## Build The Docker Image

```powershell
docker build -t phaserincremental-android-builder .
```

## Build A Debug APK

Recommended PowerShell wrapper:

```powershell
.\scripts\build-android-docker.ps1
```

Equivalent manual command:

```powershell
docker volume create phaserincremental-gradle-cache
docker volume create phaserincremental-node-modules
docker run --rm -v "${PWD}:/app" -v phaserincremental-gradle-cache:/root/.gradle -v phaserincremental-node-modules:/app/node_modules -w /app phaserincremental-android-builder bash -lc "npm ci && npm run build && npx cap sync android && cd android && bash ./gradlew assembleDebug"
```

The debug APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Build A Release APK

```powershell
.\scripts\build-android-docker.ps1 -BuildType Release
```

Unsigned release APK output:

```text
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Faster Rebuilds

After the image exists, skip rebuilding it:

```powershell
.\scripts\build-android-docker.ps1 -SkipImageBuild
```
