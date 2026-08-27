/**
 * Supabase Service Module - Primary Backend Client
 * Connects directly to Supabase REST API via PostgREST endpoints using environment variables:
 * - SUPABASE_URL: https://bnfexkfyrhpgvgehblhi.supabase.co
 * - SUPABASE_ANON_KEY: sb_publishable_v2JCkKSoNJmJJKEz1NgzLg_ltJuiqRK
 */

const SupabaseService = (function () {
  function getEnvCredentials() {
    const env = window.ENV || {};
    const url = localStorage.getItem('supabase_url') || env.SUPABASE_URL || 'https://bnfexkfyrhpgvgehblhi.supabase.co';
    const key = localStorage.getItem('supabase_key') || env.SUPABASE_ANON_KEY || 'sb_publishable_v2JCkKSoNJmJJKEz1NgzLg_ltJuiqRK';

    return {
      url: url.trim().replace(/\/$/, ''),
      key: key.trim(),
      isConfigured: true
    };
  }

  function getConfig() {
    return getEnvCredentials();
  }

  function saveConfig(url, key) {
    localStorage.setItem('supabase_url', url.trim().replace(/\/$/, ''));
    localStorage.setItem('supabase_key', key.trim());
  }

  function clearConfig() {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');
  }

  /**
   * Core Supabase Fetch Wrapper
   */
  async function request(endpoint, options = {}) {
    const creds = getEnvCredentials();
    const url = `${creds.url}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();
    const startTime = performance.now();

    const reqHeaders = {
      'apikey': creds.key,
      'Authorization': `Bearer ${creds.key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    let reqBody = null;
    if (options.body) {
      try {
        reqBody = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      } catch (e) {
        reqBody = options.body;
      }
    }

    let response;
    let resData = null;
    let statusCode = 0;
    let resHeaders = {};
    let errorMsg = null;

    try {
      response = await fetch(url, {
        method: method,
        headers: reqHeaders,
        body: options.body || null
      });

      statusCode = response.status;
      response.headers.forEach((value, key) => { resHeaders[key] = value; });

      if (statusCode !== 204) {
        const text = await response.text();
        resData = text ? JSON.parse(text) : {};
      } else {
        resData = { message: '204 No Content - Operation Succeeded' };
      }
    } catch (err) {
      errorMsg = err.message;
      statusCode = statusCode || 500;
      resData = { error: err.message || 'Supabase Network request failed' };
    }

    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    // Network log for API Explorer
    const logData = {
      id: 'supa_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleTimeString(),
      method: method,
      url: url,
      endpoint: `[Supabase] ${endpoint}`,
      statusCode: statusCode,
      latency: latency,
      requestHeaders: reqHeaders,
      requestBody: reqBody,
      responseHeaders: resHeaders,
      responseBody: resData,
      error: errorMsg
    };

    if (window.ExplorerModule) window.ExplorerModule.addLog(logData);
    if (window.LearningModule && window.LearningModule.isLearningModeActive()) {
      window.LearningModule.animateFlow(method, statusCode, logData);
    }

    if (!response || !response.ok) {
      const errMsg = (resData && (resData.message || resData.error || resData.hint)) || `HTTP ${statusCode} Error`;
      throw new Error(errMsg);
    }

    return resData;
  }

  async function testConnection(testUrl, testKey) {
    const cleanUrl = testUrl.trim().replace(/\/$/, '');
    const cleanKey = testKey.trim();

    const response = await fetch(`${cleanUrl}/rest/v1/products?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': cleanKey,
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Connection failed with status ${response.status}`);
    }

    return true;
  }

  // =========================================================================
  // SUPABASE FULL CRUD ENDPOINTS (PostgREST API)
  // =========================================================================

  /**
   * READ (GET): Select products from Supabase
   * Endpoint: GET /rest/v1/products?select=*&order=id.desc&limit={limit}&offset={skip}
   */
  async function loadProducts(limit = 10, skip = 0) {
    const res = await request(`/rest/v1/products?select=*&order=id.desc&limit=${limit}&offset=${skip}`, {
      headers: { 'Prefer': 'count=exact' }
    });
    return {
      products: Array.isArray(res) ? res : [],
      total: Array.isArray(res) ? res.length + skip : 0
    };
  }

  /**
   * READ (GET): Fetch distinct categories from Supabase products table
   */
  async function fetchCategories() {
    const res = await request(`/rest/v1/products?select=category`);
    if (Array.isArray(res)) {
      const unique = [...new Set(res.map(item => item.category).filter(Boolean))];
      return unique;
    }
    return ['electronics', 'beauty', 'groceries', 'home-decoration'];
  }

  /**
   * READ (GET): Filter by category
   * Endpoint: GET /rest/v1/products?select=*&category=eq.{category}&order=id.desc&limit={limit}&offset={skip}
   */
  async function fetchProductsByCategory(category, limit = 10, skip = 0) {
    const res = await request(`/rest/v1/products?select=*&category=eq.${encodeURIComponent(category)}&order=id.desc&limit=${limit}&offset=${skip}`);
    return {
      products: Array.isArray(res) ? res : [],
      total: Array.isArray(res) ? res.length : 0
    };
  }

  /**
   * SEARCH (GET): Filter title using ilike substring match
   * Endpoint: GET /rest/v1/products?select=*&title=ilike.*{query}*
   */
  async function searchProducts(query) {
    const res = await request(`/rest/v1/products?select=*&title=ilike.*${encodeURIComponent(query)}*`);
    return {
      products: Array.isArray(res) ? res : [],
      total: Array.isArray(res) ? res.length : 0
    };
  }

  /**
   * READ (GET): Single product by ID
   */
  async function fetchProductById(id) {
    const res = await request(`/rest/v1/products?id=eq.${id}&select=*`);
    return Array.isArray(res) ? res[0] : res;
  }

  /**
   * CREATE (POST): Insert new product row into Supabase PostgreSQL table
   * Endpoint: POST /rest/v1/products
   */
  async function addProduct(productData) {
    const payload = { ...productData };
    delete payload.isNew;

    const res = await request('/rest/v1/products', {
      method: 'POST',
      headers: {
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    return Array.isArray(res) ? res[0] : res;
  }

  /**
   * UPDATE (PATCH): Update product row in Supabase PostgreSQL table
   * Endpoint: PATCH /rest/v1/products?id=eq.{id}
   */
  async function updateProduct(id, productData) {
    const res = await request(`/rest/v1/products?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(productData)
    });

    return Array.isArray(res) ? res[0] : res;
  }

  /**
   * DELETE (DELETE): Delete product row from Supabase PostgreSQL table
   * Endpoint: DELETE /rest/v1/products?id=eq.{id}
   */
  async function deleteProduct(id) {
    return await request(`/rest/v1/products?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'Prefer': 'return=representation'
      }
    });
  }

  return {
    getConfig,
    saveConfig,
    clearConfig,
    testConnection,
    loadProducts,
    fetchCategories,
    fetchProductsByCategory,
    searchProducts,
    fetchProductById,
    addProduct,
    updateProduct,
    deleteProduct
  };
})();

window.SupabaseService = SupabaseService;
