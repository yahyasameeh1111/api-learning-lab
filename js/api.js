/**
 * API Module - Handles communication with DummyJSON REST API (https://dummyjson.com)
 * Intercepts all outgoing requests and logs telemetry to the API Explorer Network Inspector.
 */

const ApiService = (function () {
  const BASE_URL = 'https://dummyjson.com';

  /**
   * Helper wrapper around native fetch() that tracks latency, status, headers, and logs to API Explorer
   */
  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const method = (options.method || 'GET').toUpperCase();
    const startTime = performance.now();

    // Prepare default request headers
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

      // Extract response headers
      response.headers.forEach((value, key) => {
        resHeaders[key] = value;
      });

      // Parse JSON response body
      resData = await response.json();
    } catch (err) {
      errorMsg = err.message;
      statusCode = statusCode || 500;
      resData = { error: err.message || 'Network request failed' };
    }

    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    // Build standardized request log object
    const logData = {
      id: 'req_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleTimeString(),
      method: method,
      url: url,
      endpoint: endpoint,
      statusCode: statusCode,
      latency: latency,
      requestHeaders: reqHeaders,
      requestBody: reqBody,
      responseHeaders: resHeaders,
      responseBody: resData,
      error: errorMsg
    };

    // Log automatically to API Explorer
    if (window.ExplorerModule) {
      window.ExplorerModule.addLog(logData);
    }

    // Trigger Visual Request Flow diagram animation in Dashboard if Learning module available
    if (window.LearningModule && window.LearningModule.isLearningModeActive()) {
      window.LearningModule.animateFlow(method, statusCode, logData);
    }

    if (errorMsg) {
      throw new Error(errorMsg);
    }

    return resData;
  }

  // =========================================================================
  // PUBLIC API ENDPOINTS
  // =========================================================================

  /**
   * READ (GET): Fetch products with limit and skip pagination
   * Endpoint: GET /products?limit={limit}&skip={skip}
   */
  async function loadProducts(limit = 10, skip = 0) {
    return await request(`/products?limit=${limit}&skip=${skip}`);
  }

  /**
   * READ (GET): Fetch categories list
   * Endpoint: GET /products/categories
   */
  async function fetchCategories() {
    return await request('/products/categories');
  }

  /**
   * READ (GET): Fetch products by category
   * Endpoint: GET /products/category/{category}?limit={limit}&skip={skip}
   */
  async function fetchProductsByCategory(category, limit = 10, skip = 0) {
    return await request(`/products/category/${encodeURIComponent(category)}?limit=${limit}&skip=${skip}`);
  }

  /**
   * SEARCH (GET): Search products by query string
   * Endpoint: GET /products/search?q={query}
   */
  async function searchProducts(query) {
    return await request(`/products/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * READ (GET): Fetch single product details by ID
   * Endpoint: GET /products/{id}
   */
  async function fetchProductById(id) {
    return await request(`/products/${id}`);
  }

  /**
   * CREATE (POST): Add a new product
   * Endpoint: POST /products/add
   */
  async function addProduct(productData) {
    return await request('/products/add', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  }

  /**
   * UPDATE (PUT): Edit an existing product
   * Endpoint: PUT /products/{id}
   */
  async function updateProduct(id, productData) {
    return await request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  }

  /**
   * DELETE (DELETE): Remove a product by ID
   * Endpoint: DELETE /products/{id}
   */
  async function deleteProduct(id) {
    return await request(`/products/${id}`, {
      method: 'DELETE'
    });
  }

  return {
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
