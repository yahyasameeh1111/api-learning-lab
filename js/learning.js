/**
 * Learning Module - Interactive Educational Coach, Visual Request Flow Diagram Animator,
 * HTTP Status Simulator, and fetch() Code Breakdown Overlay.
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

    // Interactive flow trigger buttons in Dashboard
    document.querySelectorAll('.flow-triggers button').forEach(btn => {
      btn.addEventListener('click', () => {
        const method = btn.dataset.flow;
        simulateFlow(method);
      });
    });

    // Dismiss learning banner button
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
      // Clear previous active states
      nodes.forEach(n => document.getElementById(n)?.classList.remove('active-node'));
      beams.forEach(b => document.getElementById(b)?.classList.remove('active-beam'));

      if (step < nodes.length) {
        // Highlight active node
        document.getElementById(nodes[step])?.classList.add('active-node');

        // Trigger beam animation to next node
        if (step < beams.length) {
          document.getElementById(beams[step])?.classList.add('active-beam');
        }

        // Update step console text
        if (consoleText) {
          const stepMessages = [
            `1. USER ACTION: Triggered ${method} request for ${logData ? logData.endpoint : 'endpoint'}`,
            `2. CLIENT APP: Executing native JavaScript fetch('${logData ? logData.url : '...' }', { method: '${method}' })`,
            `3. NETWORK: Sending HTTPS headers and request body payload over internet`,
            `4. DUMMYJSON SERVER: Processed logic and responded with HTTP ${statusCode || 200}`,
            `5. RESPONSE: Client app parsed JSON data and rendered updates in UI!`
          ];
          consoleText.textContent = stepMessages[step];
        }

        step++;
        setTimeout(runStep, 700);
      }
    }

    runStep();
  }

  /**
   * Manually simulates a flow animation from the dashboard trigger buttons
   */
  function simulateFlow(method) {
    const dummyUrls = {
      GET: '/products/1',
      POST: '/products/add',
      PUT: '/products/1',
      DELETE: '/products/1'
    };

    const dummyLog = {
      endpoint: dummyUrls[method] || '/products',
      url: `https://dummyjson.com${dummyUrls[method]}`
    };

    animateFlow(method, method === 'POST' ? 201 : 200, dummyLog);
  }

  /**
   * Simulates an HTTP Status Code test for the interactive Status Code Reference Guide
   */
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

    methodBadge.textContent = method;
    methodBadge.className = `method-badge-lg method-chip ${method.toLowerCase()}`;
    urlLabel.textContent = url;

    let codeSnippet = '';
    let explanationNotes = '';

    if (method === 'GET') {
      codeSnippet = `// Step 1: Call fetch with URL (Default HTTP method is GET)\nfetch("${url}")\n  .then(response => {\n    // Step 2: Check HTTP status code\n    if (!response.ok) throw new Error("HTTP error " + response.status);\n    return response.json(); // Parse JSON body\n  })\n  .then(data => {\n    // Step 3: Render products data in UI\n    console.log("Products received:", data);\n  })\n  .catch(error => console.error("Fetch failed:", error));`;

      explanationNotes = `<ul>
        <li><strong>GET Request:</strong> Used purely to retrieve data without modifying anything on the server.</li>
        <li><strong>No Request Body:</strong> GET requests do not send a payload in the HTTP body.</li>
        <li><strong>Idempotent:</strong> You can call GET multiple times safely without changing server state.</li>
      </ul>`;
    } else if (method === 'POST') {
      codeSnippet = `// Step 1: Specify POST method, Content-Type header, and JSON stringified body\nfetch("${url}", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify(${JSON.stringify(reqBody || { title: "New Item", price: 29.99 }, null, 4).replace(/\n/g, '\n  ')})\n})\n  .then(res => res.json())\n  .then(newItem => {\n    // Step 2: DummyJSON returns created object with newly generated ID\n    console.log("Product created:", newItem);\n  });`;

      explanationNotes = `<ul>
        <li><strong>POST Request:</strong> Used to create a brand new resource on the server.</li>
        <li><strong>Content-Type Header:</strong> Informs the server that the request body is formatted as JSON.</li>
        <li><strong>JSON.stringify():</strong> Converts JavaScript objects into a standard JSON text string to transmit over HTTP.</li>
        <li><strong>HTTP 201 Created:</strong> Standard successful status code returned for POST.</li>
      </ul>`;
    } else if (method === 'PUT') {
      codeSnippet = `// Step 1: Send updated fields with PUT method\nfetch("${url}", {\n  method: "PUT",\n  headers: {\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify(${JSON.stringify(reqBody || { title: "Updated Title", price: 49.99 }, null, 4).replace(/\n/g, '\n  ')})\n})\n  .then(res => res.json())\n  .then(updatedItem => {\n    console.log("Product updated:", updatedItem);\n  });`;

      explanationNotes = `<ul>
        <li><strong>PUT Request:</strong> Modifies/replaces an existing resource by target ID.</li>
        <li><strong>Payload:</strong> Carries only the fields being updated.</li>
      </ul>`;
    } else if (method === 'DELETE') {
      codeSnippet = `// Step 1: Call DELETE method on target product endpoint URL\nfetch("${url}", {\n  method: "DELETE"\n})\n  .then(res => res.json())\n  .then(deletedResponse => {\n    // Returns confirmation object with isDeleted: true\n    console.log("Delete confirmation:", deletedResponse);\n  });`;

      explanationNotes = `<ul>
        <li><strong>DELETE Request:</strong> Instructs the server to remove the specified resource.</li>
        <li><strong>Confirmation Response:</strong> Servers usually respond with 200 OK or 204 No Content.</li>
      </ul>`;
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
