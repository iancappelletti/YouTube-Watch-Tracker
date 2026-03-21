(function () {
  "use strict";

  const listEl      = document.getElementById("history-list");
  const emptyEl     = document.getElementById("empty-state");
  const badgeEl     = document.getElementById("count-badge");
  const btnClear    = document.getElementById("btn-clear");
  const btnCopy     = document.getElementById("btn-copy");

  // ── Toast helper ──────────────────────────────────────────────────────────
  let toastEl = null;

  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.classList.remove("show"), 2000);
  }

  // ── Format timestamp ──────────────────────────────────────────────────────
  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return iso;
    }
  }

  // ── HTML-escape helper ────────────────────────────────────────────────────
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ── Render history ────────────────────────────────────────────────────────
  function render(history) {
    badgeEl.textContent = history.length;
    listEl.innerHTML = "";

    if (!history.length) {
      emptyEl.classList.remove("hidden");
      listEl.classList.add("hidden");
      return;
    }

    emptyEl.classList.add("hidden");
    listEl.classList.remove("hidden");

    // Render newest first
    const reversed = [...history].reverse();

    reversed.forEach((entry, idx) => {
      const li = document.createElement("li");
      li.className = "history-item";

      const displayIndex = history.length - idx;

      // Video title — fall back to URL for entries recorded before this update.
      const label = entry.title || entry.url;

      // Creator handle section — only rendered when the handle was captured.
      let creatorHtml = "";
      if (entry.handle) {
        const handleText = esc(entry.handle);
        const channelHref = esc(entry.channelUrl || ("https://www.youtube.com" + entry.handle));
        creatorHtml = `<a class="item-creator" href="${channelHref}" target="_blank" title="Open channel">${handleText}</a>`;
      }

      li.innerHTML = `
        <span class="item-index">${displayIndex}</span>
        <div class="item-body">
          <a class="item-link" href="${esc(entry.url)}" target="_blank" title="${esc(entry.url)}">
            ${esc(label)}
          </a>
          <div class="item-meta">
            ${creatorHtml}
            ${creatorHtml ? '<span class="item-meta-sep">&nbsp;·&nbsp;</span>' : ""}
            <span>${formatDate(entry.timestamp)}</span>
            <span class="item-meta-sep">&nbsp;·&nbsp;</span>
            <button class="item-copy-url" data-url="${esc(entry.url)}" title="Copy video URL">Copy Video URL</button>
          </div>
        </div>
      `;

      listEl.appendChild(li);
    });

    // ── Per-entry "Copy video URL" buttons ────────────────────────────────
    // Attached via event delegation after all items are in the DOM.
    listEl.querySelectorAll(".item-copy-url").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const url = btn.dataset.url;
        navigator.clipboard.writeText(url).then(() => {
          showToast("URL copied");
        }).catch(() => {
          showToast("Copy failed");
        });
      });
    });
  }

  // ── Load history from background ──────────────────────────────────────────
  function loadHistory() {
    chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("[YT Tracker Popup]", chrome.runtime.lastError.message);
        return;
      }
      render(response.history || []);
    });
  }

  // ── Clear button ──────────────────────────────────────────────────────────
  btnClear.addEventListener("click", () => {
    if (!confirm("Clear all watch history?")) return;
    chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" }, () => {
      loadHistory();
      showToast("History cleared");
    });
  });

  // ── Copy JSON button ──────────────────────────────────────────────────────
  btnCopy.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (response) => {
      const json = JSON.stringify(response.history || [], null, 2);
      navigator.clipboard.writeText(json).then(() => {
        showToast("Copied to clipboard");
      }).catch(() => {
        showToast("Copy failed");
      });
    });
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  loadHistory();
})();
