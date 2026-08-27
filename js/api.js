/**
 * API Module - Unified DataService Routing Layer
 * Supabase is configured as the primary default backend provider.
 */

const ApiService = (function () {
  const BASE_URL = 'https://dummyjson.com';

  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();
    const startTime = performance.now();

    const reqHeaders = {
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
      resData = await response.json();
    } catch (err) {
      errorMsg = err.message;
      statusCode = statusCode || 500;
      resData = { error: err.message || 'Network request failed' };
    }

    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    const logData = {
      id: 'req_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleTimeString(),
      method: method,
      url: url,
      endpoint: `[DummyJSON] ${endpoint}`,
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

    if (errorMsg) throw new Error(errorMsg);
    return resData;
  }

  return {
    loadProducts: (limit, skip) => request(`/products?limit=${limit}&skip=${skip}`),
    fetchCategories: () => request('/products/categories'),
    fetchProductsByCategory: (category, limit, skip) => request(`/products/category/${encodeURIComponent(category)}?limit=${limit}&skip=${skip}`),
    searchProducts: (query) => request(`/products/search?q=${encodeURIComponent(query)}`),
    fetchProductById: (id) => request(`/products/${id}`),
    addProduct: (data) => request('/products/add', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' })
  };
})();

/**
 * Unified DataService Router - Uses Supabase as primary backend by default.
 * Handles automatic fallback to LocalDB if Supabase table is not yet seeded.
 */
const DataService = (function () {
  let activeProvider = localStorage.getItem('api_provider') || 'supabase';

  function getProvider() {
    return activeProvider;
  }

  function setProvider(provider) {
    activeProvider = provider;
    localStorage.setItem('api_provider', provider);
    console.log(` Switched Data Provider to: ${provider}`);
  }

  function getActiveService() {
    if (activeProvider === 'localdb' && window.LocalDBService) {
      return window.LocalDBService;
    }
    if (activeProvider === 'dummyjson') {
      return ApiService;
    }
    // Default to Supabase
    return window.SupabaseService || window.LocalDBService || ApiService;
  }

  async function safeExecute(fnName, args) {
    try {
      return await getActiveService()[fnName](...args);
    } catch (err) {
      // If active provider is Supabase and table does not exist yet (relation "public.products" does not exist)
      if (activeProvider === 'supabase' && window.LocalDBService) {
        console.warn(`Supabase query failed (${err.message}). Falling back to LocalDB engine...`);
        if (window.UIModule) {
          window.UIModule.showToast(
            'Supabase Database Notice',
            'Table "products" not found in Supabase. Please copy the SQL Schema script from Docs & SQL tab into your Supabase Dashboard SQL Editor.',
            'info'
          );
        }
        return await window.LocalDBService[fnName](...args);
      }
      throw err;
    }
  }

  return {
    getProvider,
    setProvider,
    loadProducts: (...args) => safeExecute('loadProducts', args),
    fetchCategories: (...args) => safeExecute('fetchCategories', args),
    fetchProductsByCategory: (...args) => safeExecute('fetchProductsByCategory', args),
    searchProducts: (...args) => safeExecute('searchProducts', args),
    fetchProductById: (...args) => safeExecute('fetchProductById', args),
    addProduct: (...args) => safeExecute('addProduct', args),
    updateProduct: (...args) => safeExecute('updateProduct', args),
    deleteProduct: (...args) => safeExecute('deleteProduct', args)
  };
})();

window.ApiService = ApiService;
window.DataService = DataService;
