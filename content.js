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
    setTimeout(function () {
      var creator = getCreatorInfo();
      chrome.runtime.sendMessage({
        type: "YT_VIDEO_PLAYED",
        originvideoId: originvideoId,
        title: getPageTitle(),
        handle: creator.handle,
        channelUrl: creator.channelUrl,
      });
    }, 3000);
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
