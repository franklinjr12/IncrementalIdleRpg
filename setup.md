Below is the setup path I’d use for a **Phaser + TypeScript + Vite + Capacitor** environment where the same game runs in the browser and can later be packaged for Android.

Phaser has official Vite/TypeScript templates, Vite builds the browser bundle with `vite build`, and Capacitor can wrap an existing web project as an Android app. ([Phaser][1])

## 1. Install the basic tools

Install:

```bash
node --version
npm --version
git --version
```

Recommended:

```txt
Node.js LTS
npm
Git
VS Code or Cursor
Android Studio, only when you want Android builds
```

You can build and test the browser game without Android Studio. You only need Android Studio/SDK later when packaging to Android, because Capacitor Android development depends on the Android runtime/tooling. ([Capacitor][2])

---

## 2. Create the Phaser project

Use the Phaser project generator or the official Vite TypeScript template. Phaser’s `create-phaser-game` CLI lets you choose official templates interactively. ([Phaser][3])

```bash
npm create @phaserjs/game@latest
```

Choose something close to:

```txt
Phaser
TypeScript
Vite
No React, no Vue, no Angular
```

Then:

```bash
cd your-game-name
npm install
npm run dev
```

Open the local URL that Vite prints, usually:

```txt
http://localhost:5173
```

---

## 3. Confirm the browser build works

Run:

```bash
npm run build
npm run preview
```

Vite’s production build command creates a static bundle suitable for deployment. ([vitejs][4])

Your built browser game should appear in:

```txt
dist/
```

At this point, your game can already be deployed as a static website to places like Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any normal web server.

---

## 4. Organize the project to be AI-friendly

Before adding mobile, I would restructure the source code so game logic is not trapped inside Phaser scenes.

Suggested structure:

```txt
src/
  main.ts

  scenes/
    BootScene.ts
    PreloadScene.ts
    MainScene.ts
    UpgradeScene.ts

  game/
    GameState.ts
    GameLoop.ts
    Economy.ts
    OfflineProgress.ts
    SaveSystem.ts

  data/
    upgrades.json
    buildings.json
    achievements.json

  ui/
    Hud.ts
    Button.ts
    Panel.ts

  assets/
    images/
    audio/
```

For incremental games, keep these as pure TypeScript as much as possible:

```txt
GameState.ts
Economy.ts
OfflineProgress.ts
SaveSystem.ts
```

That way, an AI agent can safely edit formulas, upgrades, save logic, and balancing without touching rendering code.

---

## 5. Add mobile-friendly browser behavior early

In `index.html`, make sure you have a mobile viewport:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

In your Phaser config, start with a responsive scale mode:

```ts
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 720,
  height: 1280,
  backgroundColor: "#1d1d1d",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene,
    PreloadScene,
    MainScene
  ]
};
```

For an incremental mobile game, I would design in **portrait-first** resolution:

```txt
720 × 1280
```

Then test browser resizing constantly.

---

## 6. Add save/load for browser first

Start with `localStorage`:

```ts
export function saveGame(state: GameState) {
  localStorage.setItem("save", JSON.stringify(state));
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem("save");
  return raw ? JSON.parse(raw) : null;
}
```

Later, if the save data grows, move to IndexedDB.

For incremental games, store:

```txt
resources
upgrades bought
buildings owned
achievements
lastSavedAt timestamp
settings
```

Then on load, calculate offline progress using `Date.now()`.

---

## 7. Add Capacitor to the existing web project

From the project root:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

Use something like:

```txt
App name: My Incremental Game
App ID: com.franklin.myincrementalgame
```

Capacitor can be added to an existing modern JavaScript project, which is exactly what you are doing here. ([Capacitor][5])

---

## 8. Configure Capacitor to use the Vite build output

Open:

```txt
capacitor.config.ts
```

Set:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.franklin.myincrementalgame',
  appName: 'My Incremental Game',
  webDir: 'dist'
};

export default config;
```

The important part is:

```ts
webDir: 'dist'
```

That tells Capacitor to package the Vite build output.

---

## 9. Add Android support

Install Android package:

```bash
npm install @capacitor/android
npx cap add android
```

Capacitor’s Android docs describe it as a native Android runtime that lets the web app run inside an Android app shell. ([Capacitor][2])

Then each time you want to update the Android project from your web build:

```bash
npm run build
npx cap sync android
```

To open Android Studio:

```bash
npx cap open android
```

---

## 10. Add useful npm scripts

In `package.json`, add scripts like:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "android:sync": "npm run build && npx cap sync android",
    "android:open": "npx cap open android"
  }
}
```

Then your normal workflow becomes:

```bash
npm run dev
```

For browser development.

```bash
npm run android:sync
npm run android:open
```

For Android packaging/testing.

---

## 11. Test on a real Android device through browser first

Before using Capacitor, test the game in Android Chrome.

Run Vite exposed to your local network:

```bash
npm run dev -- --host 0.0.0.0
```

Vite supports setting the host so the dev server can listen beyond localhost. ([vitejs][6])

Then open the shown network URL on your phone, something like:

```txt
http://192.168.0.10:5173
```

This catches most mobile UI problems before you deal with Android builds.

---

## 12. Test Android with Capacitor

Once Android Studio opens:

```txt
Select device or emulator
Click Run
```

Then test:

```txt
Touch input
Screen scaling
Save/load
Pause/resume
Audio unlock behavior
Back button behavior
Performance
```

For incremental games, also test:

```txt
Close app
Reopen app
Lock screen
Unlock screen
Wait 5–10 minutes
Check offline progress
```

---

## 13. Add a basic PWA setup later

This is optional, but useful. A PWA lets the browser version behave more like an installable app.

Add later:

```txt
manifest.webmanifest
icons
service worker
offline cache
```

But I would not start here. First make the Phaser game work well in browser and Android through Capacitor.

---

## 14. Recommended development order

Use this order:

```txt
1. Create Phaser + TypeScript + Vite project.
2. Run browser dev server.
3. Create a simple clickable/tappable prototype.
4. Add responsive portrait layout.
5. Add game state model.
6. Add resource generation loop.
7. Add upgrades from JSON.
8. Add save/load.
9. Add offline progress.
10. Build with Vite.
11. Add Capacitor.
12. Add Android platform.
13. Test on Android device.
14. Add icons/splash screen.
15. Deploy browser version.
16. Package Android build.
```

## Final setup target

You want to end up with this:

```txt
One codebase
One Phaser game
Browser build through Vite
Android app through Capacitor
Game logic in TypeScript
Game content in JSON
Assets in normal folders
No heavy visual editor dependency
```

That is a very good setup for AI-assisted development because almost everything important is editable as plain code or data.

[1]: https://phaser.io/news/2024/01/phaser-vite-typescript-template?utm_source=chatgpt.com "Phaser + TypeScript + Vite Template"
[2]: https://capacitorjs.com/docs/android?utm_source=chatgpt.com "Capacitor Android Documentation"
[3]: https://phaser.io/tutorials/create-game-app?utm_source=chatgpt.com "Using the Create Phaser Game app"
[4]: https://vite.dev/guide/build?utm_source=chatgpt.com "Building for Production"
[5]: https://capacitorjs.com/docs/getting-started?utm_source=chatgpt.com "Installing Capacitor | Capacitor Documentation"
[6]: https://vite.dev/config/preview-options?utm_source=chatgpt.com "Preview Options"
