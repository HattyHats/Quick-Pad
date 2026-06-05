# QuickPad 🥷

QuickPad is a hyper-fast, serverless, real-time scratchpad built for absolute privacy. It was designed to eliminate the friction of modern note-taking: **no logins, no paywalls, and no data harvesting**. You just open the link, type, and share.

Because QuickPad uses **Zero-Knowledge Architecture**, your data is encrypted locally on your device before it ever reaches the server. Even the database administrator cannot read your notes.

### 🌐 Live Demo: https://hatsquickpad.netlify.app/
---

## ✨ Features

- 🔒 **Zero-Knowledge URLs:** The AES-256 decryption keys are built directly into the URL hash (`#`). They are never sent to the server. The database only stores scrambled ciphertext.
- ⚡ **Instant Real-Time Sync:** Share your unique URL to collaborate and watch cursors move in real-time.
- 🔗 **Read-Only Links:** Share a special `?view=` link that allows friends to watch you type live but physically disables their ability to edit.
- 💬 **Secure DMs:** True peer-to-peer RSA-encrypted direct messaging. Click an active user's name to chat privately.
- 🔥 **Burn Notes:** Create self-destructing links that erase themselves from the database forever the moment they are opened.
- 🧘 **Zen Mode:** Hide all distractions, toolbars, and menus for a 100% full-screen immersive writing environment.
- 🌧️ **Matrix Screensaver:** A highly customizable idle animation engine.
- 📴 **True Offline Mode:** Keep typing on an airplane or without Wi-Fi. QuickPad intelligently buffers your keystrokes and syncs perfectly the millisecond you reconnect.

---

## 🛡️ Security Architecture & Privacy

QuickPad is engineered for **total anonymity**. It uses a serverless architecture acting purely as a relay.

*   **IP Masking:** Your IP address is never routed to other users, meaning you can safely share links with strangers on the internet.
*   **Military-Grade Cryptography:** Direct messages are encrypted using RSA-OAEP 2048-bit cryptography before leaving your device. It is mathematically impossible for anyone without your private key to read them.
*   **Honor System:** Everything is built to leave no trace. Once a tab or a burn note is deleted, it is wiped from the database. 
*   **Architectural Trade-off (Read-Only):** Because there are no user accounts, the database cannot distinguish between an owner and a viewer. Read-Only (`?view=`) links are enforced entirely on the client-side UI. They act as a polite guardrail against accidental edits, but they are not an impenetrable cryptographic lock. If you share a view link, a skilled user could theoretically bypass the UI and write to the database.

### Firestore Security Rules
To prevent web scrapers from mass-downloading ciphertext, the database explicitly bans listing documents. A user can only access a workspace if they know the exact cryptographically random Token ID.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /workspaces/{workspaceId} {
      allow get, create, update, delete: if true;
      allow list: if false; // CRITICAL: Blocks scraping
    }
    match /burn_notes/{burnId} {
      allow get, create, update, delete: if true;
      allow list: if false; 
    }
  }
}
```

---

## 🛠️ How to Host It Yourself

QuickPad is a static PWA (Progressive Web App). There is no Node.js backend required!

1. Clone this repository.
2. Create a [Firebase](https://firebase.google.com/) account and initialize a Firestore Database.
3. Replace the `firebaseConfig` object in `app.js` with your own Firebase project credentials.
4. Apply the Firestore Security Rules shown above in your Firebase Console.
5. Deploy the folder to any static hosting provider (e.g., Netlify, Vercel, GitHub Pages, Firebase Hosting).

## 🤝 Contributing
Information should be free. Build things that help people. Pull requests are always welcome!
