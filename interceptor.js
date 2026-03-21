(function () {
  "use strict";

  if (window.__ytTrackerInstalled) return;
  window.__ytTrackerInstalled = true;

  var PLAYER_FRAGMENT = "/youtubei/v1/player";

  function tryParseJSON(text) {
    try { return JSON.parse(text); } catch (_) { return null; }
  }

  function emit(videoId) {
    window.postMessage({ source: "YT_TRACKER_INTERCEPTOR", videoId: videoId }, "*");
  }

  function isPlayerURL(url) {
    try { return String(url).indexOf(PLAYER_FRAGMENT) !== -1; } catch (_) { return false; }
  }

  // ── Patch fetch ────────────────────────────────────────────────────────────
  var _fetch = window.fetch;
  window.fetch = function (input, init) {
    var url = (input && typeof input === "object" && input.url) ? input.url : input;
    if (isPlayerURL(url)) {
      var body = (init && init.body) ? init.body : null;
      if (typeof body === "string") {
        var parsed = tryParseJSON(body);
        if (parsed && parsed.videoId) emit(parsed.videoId);
      }
    }
    return _fetch.apply(this, arguments);
  };

  // ── Patch XMLHttpRequest ───────────────────────────────────────────────────
  var _open = XMLHttpRequest.prototype.open;
  var _send = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._ytTrackerURL = url;
    return _open.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (this._ytTrackerURL && isPlayerURL(this._ytTrackerURL) && typeof body === "string") {
      var parsed = tryParseJSON(body);
      if (parsed && parsed.videoId) emit(parsed.videoId);
    }
    return _send.apply(this, arguments);
  };

})();
