/**
 * Learning Module - Interactive Educational Coach, Visual Request Flow Diagram Animator,
 * HTTP & Database Status Simulator, and fetch() Code Breakdown Overlay.
 */

const LearningModule = (function () {
  let learningModeActive = true;

  function init() {
    bindEvents();
    checkLearningToggle();
  }

  function bindEvents() {
    const toggle = document.getElementById('learning-mode-toggle');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        learningModeActive = e.target.checked;
        toggleLearningBanners(learningModeActive);
        if (window.UIModule) {
          window.UIModule.showToast(
            'Learning Mode ' + (learningModeActive ? 'Enabled 💡' : 'Disabled'),
            learningModeActive ? 'Tooltips and API explanations active.' : 'Standard dashboard mode.',
            'info'
          );
        }
      });
    }

    document.querySelectorAll('.flow-triggers button').forEach(btn => {
      btn.addEventListener('click', () => {
        const method = btn.dataset.flow;
        simulateFlow(method);
      });
    });

    document.getElementById('dismiss-banner')?.addEventListener('click', () => {
      document.getElementById('learning-banner-crud')?.classList.add('hide');
    });
  }

  function checkLearningToggle() {
    const toggle = document.getElementById('learning-mode-toggle');
    if (toggle) learningModeActive = toggle.checked;
    toggleLearningBanners(learningModeActive);
  }

  function isLearningModeActive() {
    return learningModeActive;
  }

  function toggleLearningBanners(show) {
    const banner = document.getElementById('learning-banner-crud');
    if (banner) {
      if (show) banner.classList.remove('hide');
      else banner.classList.add('hide');
    }
  }

  /**
   * Animates the Visual Request Flow Diagram nodes in the Dashboard
   */
  function animateFlow(method, statusCode, logData) {
    const consoleLabel = document.getElementById('flow-method-label');
    const consoleText = document.getElementById('flow-status-text');

    if (consoleLabel) {
      consoleLabel.textContent = `${method} (${statusCode || '200 OK'})`;
      consoleLabel.className = `console-method ${method.toLowerCase()}`;
    }

    const nodes = ['node-user', 'node-app', 'node-network', 'node-server', 'node-response'];
    const beams = ['beam-1', 'beam-2', 'beam-3', 'beam-4'];

    let step = 0;

    function runStep() {
      nodes.forEach(n => document.getElementById(n)?.classList.remove('active-node'));
      beams.forEach(b => document.getElementById(b)?.classList.remove('active-beam'));

      if (step < nodes.length) {
        document.getElementById(nodes[step])?.classList.add('active-node');

        if (step < beams.length) {
          document.getElementById(beams[step])?.classList.add('active-beam');
        }

        if (consoleText) {
          const provider = window.DataService ? window.DataService.getProvider() : 'dummyjson';
          const stepMessages = [
            `1. USER ACTION: Triggered ${method} request for ${logData ? logData.endpoint : 'endpoint'}`,
            `2. CLIENT APP: Executing native JavaScript fetch('${logData ? logData.url : '...' }', { method: '${method}' })`,
            `3. NETWORK: Transmitting HTTPS headers (${provider === 'supabase' ? 'apikey, Bearer Auth' : 'Content-Type'})`,
            `4. BACKEND: Processed by ${provider === 'supabase' ? 'Supabase PostgreSQL & PostgREST engine' : 'DummyJSON Server'} &rarr; HTTP ${statusCode || 200}`,
            `5. RESPONSE: Client app parsed JSON data and updated the UI grid!`
          ];
          consoleText.textContent = stepMessages[step];
        }

        step++;
        setTimeout(runStep, 700);
      }
    }

    runStep();
  }

  function simulateFlow(method) {
    const provider = window.DataService ? window.DataService.getProvider() : 'dummyjson';
    const isSupa = provider === 'supabase';

    const dummyUrls = {
      GET: isSupa ? '/rest/v1/products?select=*&limit=10' : '/products/1',
      POST: isSupa ? '/rest/v1/products' : '/products/add',
      PUT: isSupa ? '/rest/v1/products?id=eq.1' : '/products/1',
      DELETE: isSupa ? '/rest/v1/products?id=eq.1' : '/products/1'
    };

    const dummyLog = {
      endpoint: dummyUrls[method] || '/products',
      url: isSupa ? `https://your-project.supabase.co${dummyUrls[method]}` : `https://dummyjson.com${dummyUrls[method]}`
    };

    animateFlow(method, method === 'POST' ? 201 : 200, dummyLog);
  }

  function simulateStatus(code) {
    const statusMap = {
      200: { method: 'GET', url: 'https://dummyjson.com/products/1', statusText: '200 OK', body: { id: 1, title: 'Essence Mascara Lash Princess', price: 9.99, category: 'beauty' } },
      201: { method: 'POST', url: 'https://dummyjson.com/products/add', statusText: '201 Created', body: { id: 195, title: 'New Wireless Headphones', price: 99.99, created: true } },
      400: { method: 'POST', url: 'https://dummyjson.com/products/add', statusText: '400 Bad Request', body: { message: 'Validation Error: Title is required and price must be positive number' } },
      401: { method: 'GET', url: 'https://dummyjson.com/auth/me', statusText: '401 Unauthorized', body: { message: 'Authentication Token Missing or Invalid JWT Bearer header' } },
      403: { method: 'DELETE', url: 'https://dummyjson.com/admin/users/1', statusText: '403 Forbidden', body: { message: 'Access Denied: Admin permissions required for resource deletion' } },
      404: { method: 'GET', url: 'https://dummyjson.com/products/999999', statusText: '404 Not Found', body: { message: "Product with id '999999' not found" } },
      500: { method: 'POST', url: 'https://dummyjson.com/internal-crash', statusText: '500 Internal Server Error', body: { message: 'Database Connection Timeout: Server experienced an uncaught crash' } }
    };

    const sim = statusMap[code] || statusMap[200];

    const logData = {
      id: 'sim_' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      method: sim.method,
      url: sim.url,
      endpoint: sim.url.replace('https://dummyjson.com', ''),
      statusCode: code,
      latency: Math.floor(Math.random() * 80) + 40,
      requestHeaders: { 'Content-Type': 'application/json' },
      requestBody: (sim.method === 'POST' || sim.method === 'PUT') ? { samplePayload: 'data' } : null,
      responseHeaders: { 'content-type': 'application/json; charset=utf-8' },
      responseBody: sim.body
    };

    if (window.ExplorerModule) {
      window.ExplorerModule.addLog(logData);
      window.ExplorerModule.inspectLog(logData.id);
      window.ExplorerModule.togglePanel();
    }

    if (window.UIModule) {
      window.UIModule.showToast(`Simulated HTTP ${code}`, `Captured response payload in API Explorer`, code < 400 ? 'success' : 'error');
    }
  }

  /**
   * Opens the JS fetch() code breakdown explanation modal
   */
  function showFetchExplanation(method, url, reqBody = null) {
    const modal = document.getElementById('fetch-code-modal');
    const methodBadge = document.getElementById('explain-method');
    const urlLabel = document.getElementById('explain-url');
    const codeBox = document.getElementById('explain-code-content');
    const notesBox = document.getElementById('explain-notes');

    if (!modal || !codeBox) return;

    const provider = window.DataService ? window.DataService.getProvider() : 'dummyjson';
    const isSupa = provider === 'supabase';

    methodBadge.textContent = method;
    methodBadge.className = `method-badge-lg method-chip ${method.toLowerCase()}`;
    urlLabel.textContent = url;

    let codeSnippet = '';
    let explanationNotes = '';

    if (isSupa) {
      // Supabase PostgREST Explanations
      if (method === 'GET') {
        codeSnippet = `// Supabase PostgREST GET Request\nfetch("${url}", {\n  method: "GET",\n  headers: {\n    "apikey": "YOUR_SUPABASE_ANON_KEY",\n    "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",\n    "Content-Type": "application/json"\n  }\n})\n  .then(res => res.json())\n  .then(data => console.log("Supabase rows:", data));`;

        explanationNotes = `<ul>
          <li><strong>PostgREST Endpoint:</strong> Queries PostgreSQL table directly over HTTP.</li>
          <li><strong>apikey & Bearer Headers:</strong> Authenticates the request against Row Level Security (RLS) policies.</li>
          <li><strong>Query Operators:</strong> Filter rows using URL params like <code>category=eq.electronics</code> or <code>title=ilike.*phone*</code>.</li>
        </ul>`;
      } else if (method === 'POST') {
        codeSnippet = `// Supabase PostgREST POST (Insert Row)\nfetch("${url}", {\n  method: "POST",\n  headers: {\n    "apikey": "YOUR_SUPABASE_ANON_KEY",\n    "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",\n    "Content-Type": "application/json",\n    "Prefer": "return=representation" // Returns inserted PostgreSQL row\n  },\n  body: JSON.stringify(${JSON.stringify(reqBody || { title: "New Item", price: 29.99 }, null, 4).replace(/\n/g, '\n  ')})\n})\n  .then(res => res.json())\n  .then(newRow => console.log("Inserted row:", newRow));`;

        explanationNotes = `<ul>
          <li><strong>Prefer: return=representation Header:</strong> Directs Supabase to return the newly created row with auto-generated <code>id</code>.</li>
          <li><strong>PostgreSQL Persistence:</strong> Data is permanently saved in your Supabase database table.</li>
        </ul>`;
      } else if (method === 'PATCH' || method === 'PUT') {
        codeSnippet = `// Supabase PostgREST PATCH (Update Row)\nfetch("${url}", {\n  method: "PATCH",\n  headers: {\n    "apikey": "YOUR_SUPABASE_ANON_KEY",\n    "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",\n    "Content-Type": "application/json",\n    "Prefer": "return=representation"\n  },\n  body: JSON.stringify(${JSON.stringify(reqBody || { title: "Updated Title" }, null, 4).replace(/\n/g, '\n  ')})\n})\n  .then(res => res.json())\n  .then(updatedRow => console.log("Updated row:", updatedRow));`;

        explanationNotes = `<ul>
          <li><strong>PATCH Method:</strong> PostgREST uses PATCH to update specific columns of matching row IDs (e.g. <code>?id=eq.5</code>).</li>
        </ul>`;
      } else if (method === 'DELETE') {
        codeSnippet = `// Supabase PostgREST DELETE (Delete Row)\nfetch("${url}", {\n  method: "DELETE",\n  headers: {\n    "apikey": "YOUR_SUPABASE_ANON_KEY",\n    "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY"\n  }\n})\n  .then(res => res.json())\n  .then(deletedRow => console.log("Deleted row confirmation:", deletedRow));`;

        explanationNotes = `<ul>
          <li><strong>DELETE Filter:</strong> Deletes target row in PostgreSQL table matching filter parameter <code>?id=eq.X</code>.</li>
        </ul>`;
      }
    } else {
      // Standard DummyJSON Explanations
      if (method === 'GET') {
        codeSnippet = `// Step 1: Call fetch with URL (Default HTTP method is GET)\nfetch("${url}")\n  .then(response => {\n    if (!response.ok) throw new Error("HTTP error " + response.status);\n    return response.json();\n  })\n  .then(data => console.log("Products received:", data))\n  .catch(error => console.error("Fetch failed:", error));`;

        explanationNotes = `<ul>
          <li><strong>GET Request:</strong> Used purely to retrieve data without modifying anything on the server.</li>
          <li><strong>No Request Body:</strong> GET requests do not send a payload in the HTTP body.</li>
        </ul>`;
      } else if (method === 'POST') {
        codeSnippet = `fetch("${url}", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify(${JSON.stringify(reqBody || { title: "New Item", price: 29.99 }, null, 4).replace(/\n/g, '\n  ')})\n})\n  .then(res => res.json())\n  .then(newItem => console.log("Product created:", newItem));`;

        explanationNotes = `<ul>
          <li><strong>POST Request:</strong> Creates a new resource on the server.</li>
          <li><strong>Content-Type Header:</strong> Informs the server that the payload is JSON text.</li>
        </ul>`;
      } else if (method === 'PUT') {
        codeSnippet = `fetch("${url}", {\n  method: "PUT",\n  headers: {\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify(${JSON.stringify(reqBody || { title: "Updated Title" }, null, 4).replace(/\n/g, '\n  ')})\n})\n  .then(res => res.json())\n  .then(updatedItem => console.log("Product updated:", updatedItem));`;

        explanationNotes = `<ul>
          <li><strong>PUT Request:</strong> Modifies/replaces an existing resource by target ID.</li>
        </ul>`;
      } else if (method === 'DELETE') {
        codeSnippet = `fetch("${url}", {\n  method: "DELETE"\n})\n  .then(res => res.json())\n  .then(deletedResponse => console.log("Delete confirmation:", deletedResponse));`;

        explanationNotes = `<ul>
          <li><strong>DELETE Request:</strong> Instructs the server to remove the specified resource.</li>
        </ul>`;
      }
    }

    codeBox.textContent = codeSnippet;
    notesBox.innerHTML = explanationNotes;
    modal.classList.remove('hide');
  }

  return {
    init,
    isLearningModeActive,
    animateFlow,
    simulateStatus,
    showFetchExplanation
  };
})();

window.LearningModule = LearningModule;
