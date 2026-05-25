### QRef

Qref is a PWA or progressive web app which is essentially a standard website build with webtechnologies that acts and feels like a native mobile or desktop app.

- **`manifest.json` (The App Identity):** This is a simple configuration file that tells the iPad (or any device) how your app should appear when "installed." It defines the app's name, the icon you see on your home screen, and tells the device to open it in a "standalone" window without the standard Safari browser search bar and buttons.
- **`service-worker.js` (The Offline Engine):** This is the secret sauce. A service worker is a script that your browser runs in the background, separate from the web page. It acts as a proxy between your app and the network. When you have the internet, it downloads and caches your app's assets and data. When you lose the internet, the service worker intercepts the network requests and serves the files directly from the cache, allowing the app to keep running.
- **`index.html`, `app.js`, and `style.css` (The Core App):** These are the standard web files that build the structure, logic, and look of your app, just like any normal website.

This app started out as being hosted on **`GitHub Pages`** it registered the service worker, read the manifest , and effectively "installed" the website as a offline-capable app.

### New Install

Open safari and navigate to github pages url "https://leaker311.github.io/QRef" **NOT** "https://github.com/leaker311/QRef"
you will end up at your apps main page basically your app should show, IF you are in the main github repository page you are at the wrong spot
Then in Safari (not github) tap the share button
then tap "view more"
then tap "add to Home Screen"
make sure "open as web app" is on, the name should correctly populate if it is not you downloded the wrong page

### Complete Uninstall

Progressive Web Apps aggressively cache data deep in Safari's engine, simply deleting the icon from your home screen is not enough.
You have to nuke the underlying website data as well.

    - Goto homescreen, find your app Icon, long press and delete/remove

GOTO settings: - Left toolbar APPS - Find Safari - Scroll all the way down to ADVANCED - WEBSITE DATA - find github.io it is most likely 0 bytes but regardless do - swipe left DELETE
