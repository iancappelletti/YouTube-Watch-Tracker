const STORAGE_KEY = "yt_watch_history";

const recentlySeen = new Map();
const DEDUP_WINDOW_MS = 50000;

async function getHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [STORAGE_KEY]: [] }, (result) => {
      resolve(result[STORAGE_KEY]);
    });
  });
}

async function saveHistory(history) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: history }, resolve);
  });
}

async function recordVideo(videoId, title, handle, channelUrl) {
  const now = Date.now();

  // Dedup within window
  if (recentlySeen.has(videoId)) {
    const last = recentlySeen.get(videoId);
    if (now - last < DEDUP_WINDOW_MS) {
      return; // suppress duplicate
    }
  }
  recentlySeen.set(videoId, now);

  const history = await getHistory();

  const entry = {
    videoId,
    title: title || `youtube.com/watch?v=${videoId}`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    handle: handle || null,
    channelUrl: channelUrl || null,
    timestamp: new Date().toISOString(),
  };

  history.push(entry);
  await saveHistory(history);
  console.log("[YT Tracker] Recorded:", entry);
}

async function clearHistory() {
  recentlySeen.clear();
  await saveHistory([]);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "YT_VIDEO_PLAYED") {
    recordVideo(
      message.originvideoId,
      message.title,
      message.handle,
      message.channelUrl
    ).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === "GET_HISTORY") {
    getHistory().then((history) => sendResponse({ history }));
    return true;
  }
  if (message.type === "CLEAR_HISTORY") {
    clearHistory().then(() => sendResponse({ ok: true }));
    return true;
  }
});
