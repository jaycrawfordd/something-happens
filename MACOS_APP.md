# something happens macOS App Bundle

This app is already local-first: it is plain HTML, CSS, and JavaScript, and the data is stored in localStorage.

For a real `.app` bundle, use Tauri. It is lighter than Electron and wraps this exact local UI in a native macOS window.

## Recommended Tauri path

1. Install prerequisites:

```sh
brew install rust node
```

2. Create a Tauri shell in this folder:

```sh
npm create tauri-app@latest something-happens
```

3. Choose a vanilla frontend, then copy these files into the generated frontend folder:

```txt
index.html
styles.css
app.js
```

4. Build the macOS app:

```sh
npm install
npm run tauri build
```

The built `.app` will be under the generated project's `src-tauri/target/release/bundle/macos/` folder.

## Data note

The bundled app will keep data local to the Mac inside the app's WebView storage. No login, no server, no cloud.
