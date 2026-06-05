import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, initializeFirestore, persistentLocalCache, doc, setDoc, updateDoc, onSnapshot, deleteDoc, getDoc, serverTimestamp, deleteField, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Generate Device ID
const myDeviceId = localStorage.getItem('quickpad_device_id') || (Date.now().toString() + Math.random().toString(36).substring(2));
localStorage.setItem('quickpad_device_id', myDeviceId);

// iOS Keyboard Dismiss Fix
window.addEventListener('focusout', () => window.scrollTo(0, 0));

const firebaseConfig = {
  apiKey: "AIzaSyD1TZ6sqpssStpPYVh5jW5uSG8yinIisug",
  authDomain: "quick-note-4133c.firebaseapp.com",
  databaseURL: "https://quick-note-4133c-default-rtdb.firebaseio.com",
  projectId: "quick-note-4133c",
  storageBucket: "quick-note-4133c.firebasestorage.app",
  messagingSenderId: "318442277",
  appId: "1:318442277:web:db1cc3d82f0cb90b2ea8cc",
  measurementId: "G-J4FWXDL1MF"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { localCache: persistentLocalCache() });

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const loader = document.getElementById('loader');
const mdToggleBtn = document.getElementById('md-toggle-btn');
const copyBtn = document.getElementById('copy-btn');
const burnBtn = document.getElementById('burn-btn');
const newBtn = document.getElementById('new-btn');
const timerBtn = document.getElementById('timer-btn');
const qrBtn = document.getElementById('qr-btn');
const nameBtn = document.getElementById('name-btn');
const infoBtn = document.getElementById('info-btn');
const rewindBtn = document.getElementById('rewind-btn');
const qrModal = document.getElementById('qr-modal');
const infoModal = document.getElementById('info-modal');
const closeQr = document.getElementById('close-qr');
const closeInfo = document.getElementById('close-info');

// New Features: Zen Mode & Share
const zenBtn = document.getElementById('zen-btn');
const zenExitBtn = document.getElementById('zen-exit-btn');
const shareBtn = document.getElementById('share-btn');
const shareModal = document.getElementById('share-modal');
const closeShare = document.getElementById('close-share');
const shareEditLink = document.getElementById('share-edit-link');
const shareViewLink = document.getElementById('share-view-link');
const copyEditLink = document.getElementById('copy-edit-link');
const copyViewLink = document.getElementById('copy-view-link');

// Merge Modal Elements
const mergeModal = document.getElementById('merge-modal');
const mergeServerText = document.getElementById('merge-server-text');
const mergeLocalText = document.getElementById('merge-local-text');
const mergeFinalText = document.getElementById('merge-final-text');
const btnMergeApprove = document.getElementById('btn-merge-approve');
let activeMergeTabId = null;

const qrCodeImg = document.getElementById('qr-code-img');
const ssLabel = document.getElementById('ss-label');
const ssMenuBtns = document.querySelectorAll('.ss-btn');
const matrixCanvas = document.getElementById('matrix-canvas');
const dmWindow = document.getElementById('dm-window');
const dmTitle = document.getElementById('dm-title');
const closeDm = document.getElementById('close-dm');
const dmMessages = document.getElementById('dm-messages');
const dmInput = document.getElementById('dm-input');
const dmSend = document.getElementById('dm-send');

const tabsBar = document.getElementById('tabs-bar');
const tabsContainer = document.getElementById('tabs-container');
const addTabBtn = document.getElementById('add-tab-btn');
const liveHud = document.getElementById('live-hud');
const hudChars = document.getElementById('hud-chars');
const hudWords = document.getElementById('hud-words');
const hudRead = document.getElementById('hud-read');
const editorMirror = document.getElementById('editor-mirror');
const cursorsContainer = document.getElementById('cursors-container');
const themeBtns = document.querySelectorAll('.theme-btn');

const splashScreen = document.getElementById('splash-screen');
const splashBg = document.getElementById('splash-bg');

function createFlyingNotes() {
    const codeSnippets = ["console.log('init');", "function setup() {}", "await fetch()", "QuickPad::start()", "{ user: 'hatty' }", "01001010", "localStorage.getItem()", "class Note {}", "while(true)"];
    for (let i = 0; i < 30; i++) {
        const note = document.createElement('div');
        note.className = 'flying-note';
        note.innerText = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
        note.style.left = `${Math.random() * 100}%`; note.style.top = `${Math.random() * 100}%`;
        note.style.animationDuration = `${3 + Math.random() * 5}s`; note.style.animationDelay = `${Math.random() * 5}s`;
        splashBg.appendChild(note);
    }
}

let isBurnMode = false;
if (splashScreen) {
    createFlyingNotes();
    setTimeout(() => {
        splashScreen.style.opacity = '0';
        setTimeout(() => { splashScreen.style.display = 'none'; if (!isBurnMode) editor.focus(); }, 800);
    }, 4500);
}

let currentToken = '';
let urlKey = null;
let isReadOnly = false;
let isMarkdown = false;
let debounceTimeout = null;
let unsubscribeWorkspace = null;
let myUsername = localStorage.getItem('quickpad_username') || 'Anon';

let vaultPassword = null; // Global workspace password

let timerMinutes = null;
let isTyping = false;
let peerCursorsData = {}; // cid -> { pos, name, pubKey }

let myPrivateKey = null;
let myPublicKeyJwk = null;
let activeChatId = null;
let unreadMessages = {};
let decryptedCache = {};
let globalDms = {};
let lastSavedTabsJSON = "";

let storedTime = localStorage.getItem('quickpad_screensaver_time');
let screensaverTimeoutMins = storedTime !== null && !isNaN(parseInt(storedTime)) ? parseInt(storedTime) : 2;
if (storedTime === "0") screensaverTimeoutMins = 0;

let tabsData = { 'main': { name: 'main.txt', content: '', is_encrypted: false } };
let lastSyncedServerTabs = {};
let activeTabId = 'main';

const savedTheme = localStorage.getItem('quickpad_theme');
if (savedTheme) document.body.className = savedTheme;
themeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const theme = btn.getAttribute('data-theme');
        document.body.className = theme;
        localStorage.setItem('quickpad_theme', theme);
        document.getElementById('theme-menu').style.display = 'none';
        setTimeout(() => document.getElementById('theme-menu').style.display = '', 100);
    });
});

marked.setOptions({
  breaks: true,
  highlight: function(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
});

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const burnToken = urlParams.get('burn');
    if (burnToken) {
        isBurnMode = true;
        mdToggleBtn.style.display = 'none'; burnBtn.style.display = 'none'; tabsBar.style.display = 'none'; liveHud.style.display = 'none';
        editor.readOnly = true;
        await fetchBurnNote(burnToken);
    } else {
        let rawToken = '';
        let viewParam = urlParams.get('view');
        let padParam = urlParams.get('pad');

        if (viewParam) {
            isReadOnly = true;
            rawToken = viewParam;
            editor.readOnly = true;
            editor.placeholder = "This document is read-only.";
            if (newBtn) newBtn.style.display = 'none';
            if (timerBtn) timerBtn.style.display = 'none';
            if (burnBtn) burnBtn.style.display = 'none';
        } else if (padParam) {
            rawToken = padParam;
            window.history.replaceState({}, '', `#${rawToken}`); // Upgrade to ZK hash
        } else if (window.location.hash) {
            rawToken = window.location.hash.substring(1);
        } else {
            rawToken = generateToken();
            window.history.replaceState({}, '', `#${rawToken}`);
        }

        if (rawToken.includes('_')) {
            let parts = rawToken.split('_');
            currentToken = parts[0];
            urlKey = parts[1];
            vaultPassword = urlKey; // Automatically encrypt everything!
        } else {
            currentToken = rawToken;
            urlKey = null;
        }

        await initCrypto();
        tabsBar.classList.remove('hidden'); liveHud.classList.remove('hidden');
        renderTabs(); setupRealtimeSync(currentToken);
    }
}

function generateToken() { 
    return Math.random().toString(36).substring(2, 15) + '_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); 
}
function updateWorkspaceURL(token) { window.history.replaceState({ path: `?workspace=${token}` }, '', `?workspace=${token}`); }


function setupRealtimeSync(token) {
    if (unsubscribeWorkspace) unsubscribeWorkspace();
    unsubscribeWorkspace = onSnapshot(doc(db, "workspaces", token), (docSnap) => {
        try {
            if (docSnap.exists()) {
                const data = docSnap.data();
            
            if (data.burned || (data.expires_at && Date.now() > data.expires_at)) {
                if (data.expires_at && Date.now() > data.expires_at && !data.burned) setDoc(doc(db, "workspaces", token), { burned: true }, { merge: true });
                document.body.innerHTML = `<div style='height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;'><h1 class='glitch-text' data-text='BURNED' style='color:#ef4444;text-shadow:0 0 20px red;'>BURNED</h1><button onclick="window.location.href=window.location.origin+window.location.pathname" class="glowing-btn" style="border-color:var(--primary-color);box-shadow:0 0 15px var(--primary-shadow);font-size:1rem;padding:15px 30px;cursor:pointer;">START NEW PAD</button></div>`;
                return;
            }
            
            // Legacy support: If the note was locked using the old manual system, prompt for the password.
            if (data.is_encrypted && !vaultPassword) {
                vaultPassword = prompt("🔒 This legacy workspace is locked! Enter the Vault Password to unlock:");
                if (!vaultPassword) { window.location.href = window.location.origin + window.location.pathname; return; }
            }

            let serverTabs = data.tabs || {};
            if (data.content && !data.tabs) serverTabs = { 'main': { name: 'main.txt', content: data.content, is_encrypted: data.is_encrypted } };
            
            let tabsUpdated = false;
            for (let tid in serverTabs) {
                let sTab = serverTabs[tid];
                let content = sTab.content || '';
                
                if (data.is_encrypted && content.startsWith("U2FsdGVkX1")) {
                    if (vaultPassword) {
                        try {
                            const bytes = CryptoJS.AES.decrypt(content, vaultPassword);
                            const dec = bytes.toString(CryptoJS.enc.Utf8);
                            if (!(dec === "" && bytes.sigBytes < 0)) content = dec; // Success!
                        } catch(e) {}
                    }
                }
                
                if (!tabsData[tid]) { 
                    tabsData[tid] = { name: sTab.name, content: content, is_encrypted: sTab.is_encrypted || false }; 
                    tabsUpdated = true; 
                } else {
                    if (tabsData[tid].name !== sTab.name) { tabsData[tid].name = sTab.name; tabsUpdated = true; }
                    let localContent = tabsData[tid].content;
                    let baseContent = lastSyncedServerTabs[tid] ? lastSyncedServerTabs[tid].content : '';
                    let normLocal = (localContent || '').replace(/\r\n/g, '\n').trimEnd();
                    let normServer = (content || '').replace(/\r\n/g, '\n').trimEnd();
                    let normBase = (baseContent || '').replace(/\r\n/g, '\n').trimEnd();
                    
                    let localChanged = normLocal !== normBase;
                    let serverChanged = normServer !== normBase;

                    if (localChanged && serverChanged && normLocal !== normServer) {
                        // Conflict!
                        if (!document.getElementById('merge-modal').classList.contains('hidden')) return; // Already resolving a conflict
                        showMergeModal(tid, content, localContent);
                    } else if (localChanged && !serverChanged) {
                        // Local changes pending, push to server
                        setTimeout(saveWorkspace, 100);
                    } else if (serverChanged && !localChanged) {
                        // Safe to overwrite local
                        tabsData[tid].content = content; 
                        if (tid === activeTabId && !isTyping) {
                            let cursor = editor.selectionStart;
                            editor.value = content;
                            editor.readOnly = isReadOnly;
                            editor.setSelectionRange(cursor, cursor);
                            updatePreview(); updateHUD(); 
                        }
                    }
                }
                lastSyncedServerTabs[tid] = { content: content };
            }
            
            // Delete removed tabs
            for (let tid in tabsData) {
                if (!serverTabs[tid]) {
                    delete tabsData[tid]; tabsUpdated = true;
                    if (tid === activeTabId) {
                        activeTabId = Object.keys(tabsData)[0] || null;
                        if (!activeTabId) { activeTabId = generateToken(); tabsData[activeTabId] = { name: 'main.txt', content: '', is_encrypted: false }; }
                        switchTab(activeTabId);
                    }
                }
            }
            
            if (!tabsData[activeTabId]) {
                let firstTab = Object.keys(tabsData)[0];
                if (firstTab) {
                    activeTabId = firstTab;
                    editor.value = tabsData[firstTab].content;
                    editor.readOnly = isReadOnly;
                }
            }
            
            lastSavedTabsJSON = JSON.stringify(tabsData); // Prevent heartbeat from re-uploading synced data
            
            if (tabsUpdated) renderTabs();
            if (data.dms) {
                globalDms = data.dms;
                calculateUnread(globalDms);
                renderChat();
            }

            if (data.cursors) {
                let activeUsers = new Map();
                activeUsers.set(myDeviceId, myUsername);
                
                for (let cid in data.cursors) {
                    if (cid === myDeviceId) continue;
                    let c = data.cursors[cid];
                    if (c.timestamp && (Date.now() - c.timestamp > 15000)) { removePeerCursor(cid); delete peerCursorsData[cid]; continue; }
                    peerCursorsData[cid] = { pos: c.pos, name: c.name, pubKey: c.pubKey, tabId: c.tabId };
                    if (c.name) activeUsers.set(cid, c.name);
                    
                    if (c.tabId === activeTabId) renderPeerCursor(cid, c.pos, c.name);
                    else removePeerCursor(cid);
                }
                
                const presenceList = document.getElementById('presence-list');
                const livePresence = document.getElementById('live-presence');
                if (presenceList && livePresence) {
                    livePresence.classList.remove('hidden');
                    let html = '';
                    activeUsers.forEach((name, cid) => {
                        if (cid === myDeviceId) return;
                        let unread = unreadMessages[cid] ? `<div class="glowing-dot"></div> <b style="color:red">(NEW!)</b>` : '';
                        html += `<span class="presence-badge" onclick="openChat('${cid}', '${escapeHtml(name).replace(/'/g,"\\'")}')">${escapeHtml(name)}${unread}</span>`;
                    });
                    html += `<span class="presence-badge" style="cursor:default;opacity:0.6;">${escapeHtml(myUsername)} (You)</span>`;
                    presenceList.innerHTML = html;
                }
                }
            } else saveWorkspace();
        } catch (err) {
            console.error("Critical error inside onSnapshot. Recovering...", err);
        }
    });
}

function renderTabs() {
    tabsContainer.innerHTML = '';
    for (let tid in tabsData) {
        let t = document.createElement('div');
        t.className = 'tab' + (tid === activeTabId ? ' active' : ''); 
        t.innerText = tabsData[tid].name;
        
        let delBtn = document.createElement('span'); delBtn.className = 'tab-close'; delBtn.innerText = '✕';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if(confirm('Delete tab?')) {
                delete tabsData[tid];
                if (tid === activeTabId) {
                    activeTabId = Object.keys(tabsData)[0] || null;
                    if (!activeTabId) { activeTabId = generateToken(); tabsData[activeTabId] = { name: 'main.txt', content: '', is_encrypted: false }; }
                    switchTab(activeTabId);
                }
                renderTabs(); deleteTabFromDB(tid);
            }
        };
        t.ondblclick = () => { let newName = prompt("Rename tab:", tabsData[tid].name); if (newName) { tabsData[tid].name = newName; renderTabs(); saveWorkspace(); } };
        t.onclick = () => switchTab(tid);
        t.appendChild(delBtn); tabsContainer.appendChild(t);
    }
}

function switchTab(tid) {
    if (activeTabId !== tid && activeTabId && tabsData[activeTabId]) {
        tabsData[activeTabId].content = editor.value;
    }
    
    activeTabId = tid; 
    editor.value = tabsData[tid].content; 
    editor.readOnly = isReadOnly;
    renderTabs(); updatePreview(); isTyping = false; updateHUD(); editor.focus(); saveWorkspace();
}

// Heartbeat to keep connection alive when chatting or reading
setInterval(() => {
    if (!document.hidden && !isBurnMode) {
        saveWorkspace();
    }
}, 10000);

addTabBtn.onclick = () => { let name = prompt("New tab name:"); if (name) { let tid = generateToken(); tabsData[tid] = { name: name, content: '', is_encrypted: false }; switchTab(tid); } };

async function deleteTabFromDB(tid) {
    if (isBurnMode) return;
    try { const payload = {}; payload[`tabs.${tid}`] = deleteField(); await updateDoc(doc(db, "workspaces", currentToken), payload); } catch(e) {}
}

async function saveWorkspace() {
    if (isReadOnly || isBurnMode) return;
    if (!currentToken || !activeTabId || !tabsData[activeTabId]) return;
    try {
        tabsData[activeTabId].content = editor.value;
        
        const payload = {
            is_encrypted: !!vaultPassword,
            cursors: {
                [myDeviceId]: {
                    pos: editor.selectionStart,
                    name: myUsername,
                    tabId: activeTabId,
                    timestamp: Date.now(),
                    pubKey: myPublicKeyJwk
                }
            }
        };
        
        let currentTabsJSON = JSON.stringify(tabsData);
        if (currentTabsJSON !== lastSavedTabsJSON || isTyping) {
            payload.tabs = {};
            for (let tid in tabsData) {
                let contentToSave = tabsData[tid].content;
                if (vaultPassword && contentToSave && !contentToSave.startsWith("U2FsdGVkX1")) {
                    contentToSave = CryptoJS.AES.encrypt(contentToSave, vaultPassword).toString();
                }
                payload.tabs[tid] = { name: tabsData[tid].name, content: contentToSave };
                // CRITICAL: Update base cache immediately so local writes don't trigger self-conflicts
                lastSyncedServerTabs[tid] = { content: tabsData[tid].content };
            }
            lastSavedTabsJSON = currentTabsJSON;
        }
        
        if (timerMinutes) { payload.expires_at = Date.now() + (timerMinutes * 60 * 1000); timerMinutes = null; }
        
        setDoc(doc(db, "workspaces", currentToken), payload, { merge: true }).catch(e => console.error(e));
    } catch (e) { console.error("Error saving", e); }
    
    isTyping = false; updateHUD();
}

function getCaretCoordinates(pos) {
    const text = editor.value.substring(0, pos);
    const span = document.createElement('span');
    span.textContent = editor.value.substring(pos) || '.';
    editorMirror.textContent = text;
    editorMirror.appendChild(span);
    const mirrorRect = editorMirror.getBoundingClientRect();
    return { 
        top: mirrorRect.top + span.offsetTop - editor.scrollTop, 
        left: mirrorRect.left + span.offsetLeft 
    };
}

function renderPeerCursor(peerId, pos, peerName = "Anon") {
    let cursor = document.getElementById('cursor-' + peerId);
    if (!cursor) {
        cursor = document.createElement('div'); cursor.id = 'cursor-' + peerId; cursor.className = 'peer-cursor';
        cursorsContainer.appendChild(cursor);
    }
    cursor.setAttribute('data-name', peerName);
    const coords = getCaretCoordinates(pos);
    cursor.style.top = coords.top + 'px'; cursor.style.left = coords.left + 'px';
}
function removePeerCursor(peerId) { const cursor = document.getElementById('cursor-' + peerId); if (cursor) cursor.remove(); }

function updateHUD() {
    const text = editor.value;
    hudChars.innerText = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    hudWords.innerText = words;
    hudRead.innerText = Math.max(1, Math.ceil(words / 200));
}

window.addEventListener('offline', () => { loader.textContent = "Offline (Saving locally...)"; loader.classList.add('offline', 'visible'); });
window.addEventListener('online', () => { loader.textContent = "Back Online! Syncing..."; loader.classList.remove('offline'); saveWorkspace(); setTimeout(() => { loader.classList.remove('visible'); setTimeout(() => { loader.textContent = "Syncing..."; }, 500); }, 2000); });

editor.addEventListener('scroll', () => {
    for (let cid in peerCursorsData) {
        if (peerCursorsData[cid] && peerCursorsData[cid].tabId === activeTabId) {
            renderPeerCursor(cid, peerCursorsData[cid].pos, peerCursorsData[cid].name);
        }
    }
});

editor.addEventListener('input', () => {
    if (isBurnMode) return;
    tabsData[activeTabId].content = editor.value;
    isTyping = true; updateHUD(); if (isMarkdown) updatePreview();
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(saveWorkspace, 500);
});

editor.addEventListener('keyup', (e) => {
    if (isBurnMode) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(saveWorkspace, 500);
    }
});

editor.addEventListener('click', () => {
    if (isBurnMode) return;
    saveWorkspace();
});

mdToggleBtn.addEventListener('click', () => {
    isMarkdown = !isMarkdown;
    if (isMarkdown) { updatePreview(); editor.classList.add('hidden'); preview.classList.remove('hidden'); mdToggleBtn.innerHTML = '✏️ Edit'; } 
    else { editor.classList.remove('hidden'); preview.classList.add('hidden'); mdToggleBtn.innerHTML = '👁️ Markdown'; editor.focus(); }
});
copyBtn.addEventListener('click', async () => { await navigator.clipboard.writeText(editor.value); const ot = copyBtn.innerHTML; copyBtn.innerHTML = '✅ Copied!'; setTimeout(() => { copyBtn.innerHTML = ot; }, 2000); });

burnBtn.addEventListener('click', async () => {
    const start = editor.selectionStart; const end = editor.selectionEnd; const selection = editor.value.substring(start, end);
    let content = selection || editor.value;
    if (!content.trim()) { alert("Nothing to burn!"); return; }
    try {
        const token = generateToken();
        const burnKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        content = CryptoJS.AES.encrypt(content, burnKey).toString();
        await setDoc(doc(db, "burn_notes", token), { content: content, created_at: serverTimestamp() });
        const burnUrl = `${window.location.origin}${window.location.pathname}?burn=${token}_${burnKey}`;
        await navigator.clipboard.writeText(burnUrl);
        if (!selection) { alert(`🔥 Workspace Burned!\n\n${burnUrl}`); await setDoc(doc(db, "workspaces", currentToken), { burned: true }); } 
        else { editor.value = editor.value.substring(0, start) + editor.value.substring(end); saveWorkspace(); alert(`🔥 Snippet Burned!\n\n${burnUrl}`); }
    } catch (e) { alert("Failed to create burn link."); }
});

async function fetchBurnNote(tokenKey) {
    try {
        let token = tokenKey;
        let key = null;
        if (tokenKey.includes('_')) {
            let parts = tokenKey.split('_');
            token = parts[0];
            key = parts[1];
        }
        
        const docRef = doc(db, "burn_notes", token); const docSnap = await getDoc(docRef);
        if (docSnap.exists()) { 
            let content = docSnap.data().content;
            if (key && content.startsWith("U2FsdGVkX1")) {
                try {
                    const bytes = CryptoJS.AES.decrypt(content, key);
                    const dec = bytes.toString(CryptoJS.enc.Utf8);
                    if (dec) content = dec;
                } catch(e) {}
            }
            editor.value = content; 
            alert("Burn read warning! This note has been permanently deleted from the server and will not be accessible again."); 
            await deleteDoc(docRef); 
        } 
        else { editor.value = "Message not found or already burned."; editor.style.color = "#f87171"; }
        updatePreview();
    } catch (e) {}
}

if (newBtn) newBtn.addEventListener('click', () => { window.location.href = window.location.origin + window.location.pathname; });
if (timerBtn) timerBtn.addEventListener('click', () => { const mins = prompt("Enter Auto-Destruct Timer (in minutes):"); if (mins === null) return; timerMinutes = parseInt(mins) || null; if (timerMinutes) { timerBtn.innerHTML = `⏳ ${timerMinutes}m`; saveWorkspace(); } else { setDoc(doc(db, "workspaces", currentToken), { expires_at: null }, { merge: true }); timerBtn.innerHTML = '⏳ Timer'; } });
if (qrBtn) qrBtn.addEventListener('click', () => { qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.href)}&color=00fff9&bgcolor=000000`; qrModal.classList.remove('hidden'); });
if (closeQr) closeQr.addEventListener('click', () => qrModal.classList.add('hidden'));

if (infoBtn) infoBtn.addEventListener('click', () => infoModal.classList.remove('hidden'));
if (closeInfo) closeInfo.addEventListener('click', () => infoModal.classList.add('hidden'));

// Zen Mode
if (zenBtn) zenBtn.addEventListener('click', () => document.body.classList.add('zen-mode'));
if (zenExitBtn) zenExitBtn.addEventListener('click', () => document.body.classList.remove('zen-mode'));

// Share Modal
if (shareBtn) shareBtn.addEventListener('click', () => {
    let baseToken = currentToken;
    if (urlKey) baseToken += '_' + urlKey;
    shareEditLink.value = window.location.origin + window.location.pathname + '#' + baseToken;
    shareViewLink.value = window.location.origin + window.location.pathname + '?view=' + baseToken;
    shareModal.classList.remove('hidden');
});
if (closeShare) closeShare.addEventListener('click', () => shareModal.classList.add('hidden'));
if (copyEditLink) copyEditLink.addEventListener('click', () => { navigator.clipboard.writeText(shareEditLink.value); alert('Editor Link Copied!'); });
if (copyViewLink) copyViewLink.addEventListener('click', () => { navigator.clipboard.writeText(shareViewLink.value); alert('Read-Only Link Copied!'); });

const closeMerge = document.getElementById('close-merge');
if (closeMerge) closeMerge.addEventListener('click', () => {
    document.getElementById('merge-modal').classList.add('hidden');
    activeMergeTabId = null;
});

function showMergeModal(tid, serverText, localText) {
    activeMergeTabId = tid;
    mergeServerText.value = serverText;
    mergeLocalText.value = localText;
    mergeFinalText.value = localText; // Default to local
    mergeModal.classList.remove('hidden');
}

if (btnMergeApprove) {
    btnMergeApprove.addEventListener('click', () => {
        if (!activeMergeTabId) return;
        const mergedContent = mergeFinalText.value;
        tabsData[activeMergeTabId].content = mergedContent;
        lastSyncedServerTabs[activeMergeTabId].content = mergedContent; // Prevent re-triggering
        
        if (activeMergeTabId === activeTabId) {
            editor.value = mergedContent;
            if (isMarkdown) updatePreview();
            updateHUD();
        }
        
        saveWorkspace();
        mergeModal.classList.add('hidden');
        activeMergeTabId = null;
    });
}

// --- Crypto & DM Engine ---
function escapeHtml(unsafe) { return (unsafe || '').toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function arrayBufferToBase64(buffer) { let binary = ''; const bytes = new Uint8Array(buffer); for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]); return window.btoa(binary); }
function base64ToArrayBuffer(base64) { const binary_string = window.atob(base64); const len = binary_string.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) bytes[i] = binary_string.charCodeAt(i); return bytes.buffer; }

async function initCrypto() {
    let savedPriv = localStorage.getItem('quickpad_priv_' + currentToken);
    let savedPub = localStorage.getItem('quickpad_pub_' + currentToken);
    if (savedPriv && savedPub) {
        try {
            myPrivateKey = await window.crypto.subtle.importKey("jwk", JSON.parse(savedPriv), { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"]);
            myPublicKeyJwk = JSON.parse(savedPub);
        } catch(e) { console.error("Crypto init error", e); savedPriv = null; }
    }
    if (!savedPriv) {
        const keyPair = await window.crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
        myPrivateKey = keyPair.privateKey;
        myPublicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
        const privJwk = await window.crypto.subtle.exportKey("jwk", myPrivateKey);
        localStorage.setItem('quickpad_priv_' + currentToken, JSON.stringify(privJwk));
        localStorage.setItem('quickpad_pub_' + currentToken, JSON.stringify(myPublicKeyJwk));
    }
}

async function encryptDM(text, receiverPubJwk) {
    if (!receiverPubJwk) throw new Error("Receiver has no public key");
    const randomPass = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
    const textCipher = CryptoJS.AES.encrypt(text, randomPass).toString();
    const passBuffer = new TextEncoder().encode(randomPass);
    const receiverPubKey = await window.crypto.subtle.importKey("jwk", receiverPubJwk, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
    const encPassReceiverBuf = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, receiverPubKey, passBuffer);
    const senderPubKey = await window.crypto.subtle.importKey("jwk", myPublicKeyJwk, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
    const encPassSenderBuf = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, senderPubKey, passBuffer);
    return { textCipher, encPassReceiver: arrayBufferToBase64(encPassReceiverBuf), encPassSender: arrayBufferToBase64(encPassSenderBuf) };
}

async function decryptDM(dmObj, isSender) {
    try {
        const encPassBase64 = isSender ? dmObj.encPassSender : dmObj.encPassReceiver;
        const passBuffer = base64ToArrayBuffer(encPassBase64);
        const decPassBuf = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, myPrivateKey, passBuffer);
        const randomPass = new TextDecoder().decode(decPassBuf);
        return CryptoJS.AES.decrypt(dmObj.textCipher, randomPass).toString(CryptoJS.enc.Utf8);
    } catch (e) { return "[Decryption Failed]"; }
}

window.openChat = function(cid, name) {
    activeChatId = cid; dmTitle.innerText = name; dmWindow.classList.remove('hidden');
    renderChat();
    // Re-render presence to clear unread ping
    const presenceList = document.getElementById('presence-list');
    if (presenceList) presenceList.innerHTML = presenceList.innerHTML; // Hack to trigger re-render in next snapshot
}
if (closeDm) closeDm.addEventListener('click', () => { dmWindow.classList.add('hidden'); activeChatId = null; });

async function sendDM() {
    if (!activeChatId || !dmInput.value.trim()) return;
    const text = dmInput.value.trim(); dmInput.value = '';
    let receiverPubKey = peerCursorsData[activeChatId]?.pubKey;
    if (!receiverPubKey) { alert("User hasn't initialized secure chat yet."); return; }
    
    try {
        const encData = await encryptDM(text, receiverPubKey);
        const chatKey = [myDeviceId, activeChatId].sort().join('_');
        const dmObj = { id: Date.now().toString() + Math.random().toString(36).slice(2), sender: myDeviceId, timestamp: Date.now(), ...encData };
        await setDoc(doc(db, "workspaces", currentToken), { dms: { [chatKey]: arrayUnion(dmObj) } }, { merge: true });
    } catch (e) { console.error("Send DM Error", e); alert("Failed to encrypt message."); }
}
if (dmSend) dmSend.addEventListener('click', sendDM);
if (dmInput) dmInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') sendDM(); });

function calculateUnread(dmsObj) {
    for (let key in dmsObj) {
        if (key.includes(myDeviceId)) {
            const otherCid = key.replace(myDeviceId, '').replace('_', '');
            const msgs = dmsObj[key];
            if (activeChatId === otherCid) {
                if (msgs.length > 0) localStorage.setItem('quickpad_read_' + key, msgs[msgs.length - 1].timestamp);
                unreadMessages[otherCid] = 0;
            } else {
                const lastRead = parseInt(localStorage.getItem('quickpad_read_' + key)) || 0;
                unreadMessages[otherCid] = msgs.filter(m => m.timestamp > lastRead && m.sender !== myDeviceId).length;
            }
        }
    }
}

async function renderChat() {
    if (!activeChatId) return;
    const chatKey = [myDeviceId, activeChatId].sort().join('_');
    const msgs = globalDms[chatKey] || [];
    if (msgs.length > 0) localStorage.setItem('quickpad_read_' + chatKey, msgs[msgs.length - 1].timestamp);
    
    let html = '';
    for (let msg of msgs) {
        if (!decryptedCache[msg.id]) {
            const isSender = msg.sender === myDeviceId;
            decryptedCache[msg.id] = await decryptDM(msg, isSender);
        }
        const cls = msg.sender === myDeviceId ? 'sent' : 'received';
        html += `<div class="dm-msg ${cls}">${escapeHtml(decryptedCache[msg.id])}</div>`;
    }
    if (dmMessages.innerHTML !== html) {
        dmMessages.innerHTML = html;
        dmMessages.scrollTop = dmMessages.scrollHeight;
    }
}

// --- Matrix Screensaver Logic ---
let matrixCtx = matrixCanvas ? matrixCanvas.getContext('2d') : null;
let matrixIntervalId;
let isScreensaverActive = false;
let idleTimer;
let matrixDrops = [];

if (ssLabel) ssLabel.innerText = screensaverTimeoutMins === 0 ? "Off" : screensaverTimeoutMins + "m";
ssMenuBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        screensaverTimeoutMins = parseInt(e.target.dataset.time);
        localStorage.setItem('quickpad_screensaver_time', screensaverTimeoutMins);
        ssLabel.innerText = screensaverTimeoutMins === 0 ? "Off" : screensaverTimeoutMins + "m";
        resetIdleTimer();
    });
});

function startScreensaver() {
    if (screensaverTimeoutMins === 0 || !matrixCanvas) return;
    isScreensaverActive = true;
    matrixCanvas.width = window.innerWidth; matrixCanvas.height = window.innerHeight;
    matrixCanvas.style.opacity = 1;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*'.split('');
    const fontSize = 16; const columns = matrixCanvas.width / fontSize;
    matrixDrops = []; for(let x = 0; x < columns; x++) matrixDrops[x] = 1;
    let color = getComputedStyle(document.body).getPropertyValue('--primary-color').trim() || '#00fff9';
    
    if (matrixIntervalId) clearInterval(matrixIntervalId);
    matrixIntervalId = setInterval(() => {
        matrixCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
        matrixCtx.fillStyle = color; matrixCtx.font = fontSize + 'px monospace';
        for(let i = 0; i < matrixDrops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            matrixCtx.fillText(text, i * fontSize, matrixDrops[i] * fontSize);
            if(matrixDrops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) matrixDrops[i] = 0;
            matrixDrops[i]++;
        }
    }, 33);
}

function stopScreensaver() {
    isScreensaverActive = false;
    if (matrixCanvas) matrixCanvas.style.opacity = 0;
    if (matrixIntervalId) { setTimeout(() => { clearInterval(matrixIntervalId); matrixIntervalId = null; }, 2000); }
}

function resetIdleTimer() {
    if (isScreensaverActive) stopScreensaver();
    clearTimeout(idleTimer);
    if (screensaverTimeoutMins > 0) idleTimer = setTimeout(startScreensaver, screensaverTimeoutMins * 60000);
}

['mousemove', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evt => window.addEventListener(evt, resetIdleTimer));
resetIdleTimer();


if (nameBtn) {
    nameBtn.innerHTML = `👤 ${myUsername}`;
    nameBtn.addEventListener('click', async () => {
        if (myUsername === "Anon") {
            myUsername = prompt("Enter your username:") || "Anon";
            localStorage.setItem('quickpad_username', myUsername);
            nameBtn.innerText = '👤 ' + myUsername;
            await initCrypto();
            saveWorkspace();
        } else {
            const newName = prompt("Enter your display name:", myUsername);
            if (newName) {
                myUsername = newName.substring(0, 15);
                localStorage.setItem('quickpad_username', myUsername);
                nameBtn.innerHTML = `👤 ${myUsername}`;
                saveWorkspace();
            }
        }
    });
}

function showLoader() { loader.classList.add('visible'); }
function hideLoader() { loader.classList.remove('visible'); }
function updatePreview() { if (isMarkdown) preview.innerHTML = DOMPurify.sanitize(marked.parse(editor.value)); }



init();
