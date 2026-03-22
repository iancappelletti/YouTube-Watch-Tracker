(function () {
  "use strict";

  var _lastoriginvideoId = null;
  var _lastReportTime = 0;
  var DEDUP_MS = 50000; // ignore same originvideoId within 50 s

  function extractoriginvideoId(url) {
    try {
      var m = (url || window.location.href).match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      return m ? m[1] : null;
    } catch (_) { return null; }
  }

  // Returns the best available page title, stripping YouTube's " - YouTube" suffix.
  function getPageTitle() {
    var t = document.title || "";
    return t.replace(/\s*-\s*YouTube\s*$/i, "").trim() || t;
  }

  // Extracts the creator handle and absolute channel URL from the
  // <link itemprop="url" href="http://www.youtube.com/@handle"> element
  // that YouTube injects into the page source of every watch page.
  // This element is present in the initial HTML and is replaced on SPA
  // navigations, making it reliable for both hard loads and client-side nav.
  //
  // Returns { handle, channelUrl } or { handle: null, channelUrl: null }.
  function getCreatorInfo() {
    try {
      var linkEl = document.querySelector('link[itemprop="url"][href*="/@"]');
      if (!linkEl) return { handle: null, channelUrl: null };

      var href = linkEl.getAttribute('href');  // e.g. "http://www.youtube.com/@jeffiot"
      var match = href.match(/\/@([^/?#]+)/);
      if (!match) return { handle: null, channelUrl: null };

      var atName     = "@" + match[1];                              // e.g. "@jeffiot"
      var channelUrl = "https://www.youtube.com/@" + match[1];     // absolute URL

      return { handle: atName, channelUrl: channelUrl };
    } catch (_) {
      return { handle: null, channelUrl: null };
    }
  }

  // Polls getCreatorInfo() up to maxAttempts times with intervalMs between
  // each try, resolving as soon as a non-null result is found.
  // This is necessary on hard page loads where the extension content script
  // runs before YouTube has injected the <link itemprop="url"> element.
  function waitForCreatorInfo(maxAttempts, intervalMs, callback) {
    var attempts = 0;
    function attempt() {
      attempts++;
      var creator = getCreatorInfo();
      if (creator.handle !== null || attempts >= maxAttempts) {
        callback(creator);
      } else {
        setTimeout(attempt, intervalMs);
      }
    }
    attempt();
  }

  function report(originvideoId) {
    if (!originvideoId) return;
    var now = Date.now();
    if (originvideoId === _lastoriginvideoId && (now - _lastReportTime) < DEDUP_MS) return;
    _lastoriginvideoId = originvideoId;
    _lastReportTime = now;

    // YouTube updates ytInitialPlayerResponse asynchronously after SPA
    // navigation — the object still reflects the previous video immediately
    // after yt-navigate-finish. A 3 000 ms delay gives the player API response
    // time to land and overwrite it before we read the handle.
    //
    // On hard page loads the <link itemprop="url"> element may not yet be in
    // the DOM when the content script first executes, so we poll for it with
    // up to 20 attempts at 200 ms intervals (4 s total budget) before giving
    // up. This prevents the first entry from being recorded with null values.
    waitForCreatorInfo(20, 200, function (creator) {
      chrome.runtime.sendMessage({
        type: "YT_VIDEO_PLAYED",
        originvideoId: originvideoId,
        title: getPageTitle(),
        handle: creator.handle,
        channelUrl: creator.channelUrl,
      });
    });
  }

  function checkURL(url) {
    report(extractoriginvideoId(url || window.location.href));
  }

  // ── 1. Hard page load ─────────────────────────────────────────────────────
  checkURL();

  // ── 2. SPA navigations via yt-navigate-finish ─────────────────────────────
  document.addEventListener("yt-navigate-finish", function () {
    checkURL();
  });

  // ── 3. /v1/player fetch intercept (external file, no inline script) ───────
  var script = document.createElement("script");
  script.src = chrome.runtime.getURL("interceptor.js");
  script.addEventListener("load", function () { script.remove(); });
  script.addEventListener("error", function () { script.remove(); });
  (document.head || document.documentElement).appendChild(script);

  // Relay messages from the page-world interceptor.
  // interceptor.js posts { source: "YT_TRACKER_INTERCEPTOR", videoId: "..." }.
  // The field is named "videoId" (not "originvideoId") — read it correctly here.
  window.addEventListener("message", function (event) {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== "YT_TRACKER_INTERCEPTOR") return;
    if (event.data.videoId) report(event.data.videoId);
  });

})();
