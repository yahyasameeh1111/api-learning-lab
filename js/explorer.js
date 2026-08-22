/**
 * Explorer Module - Manages the DevTools Network Inspector Simulator & JSON Syntax Viewer
 */

const ExplorerModule = (function () {
  let logs = [];
  let currentFilter = 'ALL';
  let activeLogId = null;

  // DOM Elements
  let logsContainer, emptyState, countBadge, mobileBadge, inspectorDrawer,
      methodUrlLabel, jsonViewerResp, jsonViewerReq, headersContent;

  function init() {
    logsContainer = document.getElementById('explorer-logs');
    emptyState = document.getElementById('explorer-empty');
    countBadge = document.getElementById('explorer-count');
    mobileBadge = document.getElementById('mobile-explorer-badge');
    inspectorDrawer = document.getElementById('log-inspector');
    methodUrlLabel = document.getElementById('inspector-method-url');
    jsonViewerResp = document.getElementById('json-viewer-resp');
    jsonViewerReq = document.getElementById('json-viewer-req');
    headersContent = document.getElementById('headers-content');

    bindEvents();
  }

  function bindEvents() {
    // Clear logs button
    document.getElementById('clear-explorer-btn')?.addEventListener('click', clearLogs);

    // Toggle explorer panel on mobile / desktop
    document.getElementById('toggle-explorer-panel-btn')?.addEventListener('click', togglePanel);
    document.getElementById('mobile-explorer-toggle')?.addEventListener('click', openMobilePanel);

    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderLogs();
      });
    });

    // Back button in inspector
    document.getElementById('back-to-logs-btn')?.addEventListener('click', closeInspector);

    // Inspector tabs
    document.querySelectorAll('.inspector-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.inspector-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.inspector-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`pane-${tab.dataset.tab}`)?.classList.add('active');
      });
    });

    // Copy JSON button
    document.getElementById('copy-json-btn')?.addEventListener('click', copyJsonResponse);
  }

  /**
   * Adds a new network log entry captured by ApiService
   */
  function addLog(logData) {
    logs.unshift(logData); // Add newest at top
    updateCount();
    renderLogs();
  }

  function updateCount() {
    const total = logs.length;
    if (countBadge) countBadge.textContent = total;
    if (mobileBadge) mobileBadge.textContent = total;
  }

  function clearLogs() {
    logs = [];
    updateCount();
    closeInspector();
    renderLogs();
  }

  function togglePanel() {
    const panel = document.getElementById('api-explorer-panel');
    const container = document.querySelector('.layout-container');
    panel?.classList.toggle('open-mobile');
    container?.classList.toggle('panel-collapsed');
  }

  function openMobilePanel() {
    const panel = document.getElementById('api-explorer-panel');
    panel?.classList.add('open-mobile');
  }

  /**
   * Renders log feed based on current filter
   */
  function renderLogs() {
    if (!logsContainer) return;

    const filteredLogs = currentFilter === 'ALL'
      ? logs
      : logs.filter(l => l.method === currentFilter);

    if (filteredLogs.length === 0) {
      logsContainer.innerHTML = '';
      logsContainer.appendChild(emptyState);
      emptyState.classList.remove('hide');
      return;
    }

    emptyState?.classList.add('hide');
    logsContainer.innerHTML = '';

    filteredLogs.forEach(log => {
      const item = document.createElement('div');
      item.className = 'log-item';
      item.dataset.id = log.id;

      const statusClass = log.statusCode >= 200 && log.statusCode < 300 ? 'status-2xx' : 'status-4xx';

      item.innerHTML = `
        <div class="log-row-top">
          <span class="method-chip ${log.method.toLowerCase()}">${log.method}</span>
          <span class="log-url" title="${log.url}">${log.endpoint}</span>
          <span class="status-pill ${statusClass}">${log.statusCode || 200}</span>
        </div>
        <div class="log-meta">
          <span>⏱️ ${log.latency} ms</span>
          <span>🕒 ${log.timestamp}</span>
        </div>
      `;

      item.addEventListener('click', () => inspectLog(log.id));
      logsContainer.appendChild(item);
    });
  }

  /**
   * Inspects detailed request and response telemetry in the drawer
   */
  function inspectLog(id) {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    activeLogId = id;

    if (methodUrlLabel) {
      methodUrlLabel.textContent = `${log.method} ${log.endpoint}`;
    }

    // Render Response JSON
    if (jsonViewerResp) {
      jsonViewerResp.innerHTML = highlightSyntax(log.responseBody);
    }

    // Render Request JSON
    if (jsonViewerReq) {
      if (log.requestBody) {
        jsonViewerReq.innerHTML = highlightSyntax(log.requestBody);
      } else {
        jsonViewerReq.textContent = '(No Request Body - GET/DELETE requests do not carry a body payload)';
      }
    }

    // Render Headers
    if (headersContent) {
      headersContent.innerHTML = `
        <div class="header-item"><span class="header-key">Request Method</span><span class="header-val">${log.method}</span></div>
        <div class="header-item"><span class="header-key">Full URL</span><span class="header-val">${log.url}</span></div>
        <div class="header-item"><span class="header-key">Status Code</span><span class="header-val">${log.statusCode}</span></div>
        <div class="header-item"><span class="header-key">Response Latency</span><span class="header-val">${log.latency} ms</span></div>
        <div class="header-item"><span class="header-key">Timestamp</span><span class="header-val">${log.timestamp}</span></div>
        <br>
        <strong>Request Headers:</strong>
        ${Object.entries(log.requestHeaders || {}).map(([k, v]) => `
          <div class="header-item"><span class="header-key">${k}</span><span class="header-val">${v}</span></div>
        `).join('')}
      `;
    }

    inspectorDrawer?.classList.remove('hide');
  }

  function closeInspector() {
    inspectorDrawer?.classList.add('hide');
    activeLogId = null;
  }

  /**
   * Pretty prints and color syntax highlights JSON objects
   */
  function highlightSyntax(jsonObj) {
    if (jsonObj === null || jsonObj === undefined) return '<span class="json-null">null</span>';
    
    let jsonStr = typeof jsonObj === 'string' ? jsonObj : JSON.stringify(jsonObj, null, 2);

    // Escape HTML special characters
    jsonStr = jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Syntax highlight regex replacements
    return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    });
  }

  /**
   * Copies the active log response JSON to clipboard
   */
  function copyJsonResponse() {
    const log = logs.find(l => l.id === activeLogId);
    if (!log || !log.responseBody) return;

    const str = JSON.stringify(log.responseBody, null, 2);
    navigator.clipboard.writeText(str).then(() => {
      const btn = document.getElementById('copy-json-btn');
      if (btn) {
        const origText = btn.innerHTML;
        btn.innerHTML = `✓ Copied!`;
        setTimeout(() => { btn.innerHTML = origText; }, 2000);
      }
      if (window.UIModule) window.UIModule.showToast('Copied!', 'JSON payload copied to clipboard.', 'success');
    }).catch(err => {
      console.error('Copy failed', err);
    });
  }

  return {
    init,
    addLog,
    togglePanel,
    inspectLog,
    clearLogs
  };
})();

// Attach to global window
window.ExplorerModule = ExplorerModule;
