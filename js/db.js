/**
 * Local DB Module - Built-in Zero-Setup Persistent Database Engine (IndexedDB)
 * Provides 100% persistent local database storage and an in-browser SQL Query Execution Engine.
 */

const LocalDBService = (function () {
  const DB_NAME = 'ApiLearningLab_LocalDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'products';
  let dbInstance = null;

  // 12 Initial Seed Products
  const INITIAL_SEED = [
    { id: 1, title: 'Wireless Noise-Canceling Headphones', price: 199.99, category: 'electronics', description: 'High-fidelity audio with active noise cancellation and 30-hour battery life.', rating: 4.8, thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80' },
    { id: 2, title: 'Ergonomic Wooden Desk Lamp', price: 49.50, category: 'home-decoration', description: 'Minimalist warm LED desk lamp with touch controls.', rating: 4.6, thumbnail: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80' },
    { id: 3, title: 'Organic Hydrating Face Serum', price: 34.00, category: 'beauty', description: 'Nourishing facial botanical extract for glowing skin.', rating: 4.7, thumbnail: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80' },
    { id: 4, title: 'Mechanical Gaming Keyboard', price: 129.99, category: 'electronics', description: 'RGB backlit mechanical switches with custom macro keys.', rating: 4.9, thumbnail: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&q=80' },
    { id: 5, title: 'Stainless Steel Water Bottle', price: 24.95, category: 'groceries', description: 'Double-wall vacuum insulated flask keeping drinks cold 24h.', rating: 4.5, thumbnail: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80' },
    { id: 6, title: 'Ultra-Wide Curved Gaming Monitor', price: 449.00, category: 'electronics', description: '144Hz 34-inch QHD curved monitor for immersive productivity.', rating: 4.9, thumbnail: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&q=80' },
    { id: 7, title: 'Modern Ceramic Coffee Mug Set', price: 29.99, category: 'home-decoration', description: 'Set of 4 handcrafted matte glaze coffee cups.', rating: 4.4, thumbnail: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80' },
    { id: 8, title: 'Botanical Daily Face Wash', price: 18.50, category: 'beauty', description: 'Gentle cleansing gel with aloe vera and green tea.', rating: 4.6, thumbnail: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80' },
    { id: 9, title: 'Smart Fitness Tracker Watch', price: 79.99, category: 'electronics', description: 'Heart rate monitoring, sleep tracking, and GPS step counter.', rating: 4.3, thumbnail: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400&q=80' },
    { id: 10, title: 'Aromatic Lavender Soy Candle', price: 22.00, category: 'home-decoration', description: '100% natural soy wax candle infused with lavender oils.', rating: 4.8, thumbnail: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&q=80' },
    { id: 11, title: 'Premium Dark Chocolate Bar 85%', price: 6.99, category: 'groceries', description: 'Artisanal single-origin cocoa bean dark chocolate.', rating: 4.9, thumbnail: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&q=80' },
    { id: 12, title: 'Portable Bluetooth Speaker', price: 59.99, category: 'electronics', description: 'Waterproof IPX7 outdoor speaker with deep bass boost.', rating: 4.7, thumbnail: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400&q=80' }
  ];

  /**
   * Initializes IndexedDB database
   */
  function getDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('price', 'price', { unique: false });

          // Seed initial products
          INITIAL_SEED.forEach(prod => store.add(prod));
        }
      };

      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };

      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Reads all items from store
   */
  async function getAllRaw() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Writes all items into store (Reset/Overwrite)
   */
  async function saveAllRaw(items) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear().onsuccess = () => {
        items.forEach(item => store.add(item));
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // =========================================================================
  // LOCAL DB REST API MAPPINGS & SQL LOGGING INTERCEPTOR
  // =========================================================================

  async function loadProducts(limit = 10, skip = 0) {
    const startTime = performance.now();
    const all = await getAllRaw();
    const sorted = [...all].sort((a, b) => b.id - a.id);
    const sliced = sorted.slice(skip, skip + limit);
    const latency = Math.round(performance.now() - startTime);

    const generatedSQL = `SELECT * FROM products ORDER BY id DESC LIMIT ${limit} OFFSET ${skip};`;

    logDBRequest('GET', '/localdb/products', 200, latency, generatedSQL, null, { products: sliced, total: all.length });

    return {
      products: sliced,
      total: all.length,
      sql: generatedSQL
    };
  }

  async function fetchCategories() {
    const all = await getAllRaw();
    const unique = [...new Set(all.map(item => item.category).filter(Boolean))];
    return unique;
  }

  async function fetchProductsByCategory(category, limit = 10, skip = 0) {
    const startTime = performance.now();
    const all = await getAllRaw();
    const filtered = all.filter(item => item.category.toLowerCase() === category.toLowerCase()).sort((a, b) => b.id - a.id);
    const sliced = filtered.slice(skip, skip + limit);
    const latency = Math.round(performance.now() - startTime);

    const generatedSQL = `SELECT * FROM products WHERE category = '${category}' ORDER BY id DESC LIMIT ${limit} OFFSET ${skip};`;

    logDBRequest('GET', `/localdb/products/category/${category}`, 200, latency, generatedSQL, null, { products: sliced, total: filtered.length });

    return {
      products: sliced,
      total: filtered.length,
      sql: generatedSQL
    };
  }

  async function searchProducts(query) {
    const startTime = performance.now();
    const all = await getAllRaw();
    const q = query.toLowerCase();
    const filtered = all.filter(item =>
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
    const latency = Math.round(performance.now() - startTime);

    const generatedSQL = `SELECT * FROM products WHERE LOWER(title) LIKE '%${query}%' OR LOWER(description) LIKE '%${query}%';`;

    logDBRequest('GET', `/localdb/products/search?q=${query}`, 200, latency, generatedSQL, null, { products: filtered, total: filtered.length });

    return {
      products: filtered,
      total: filtered.length,
      sql: generatedSQL
    };
  }

  async function fetchProductById(id) {
    const all = await getAllRaw();
    const found = all.find(p => p.id == id);
    if (!found) throw new Error(`Product with ID #${id} not found in LocalDB`);
    return found;
  }

  async function addProduct(productData) {
    const startTime = performance.now();
    const db = await getDB();
    const all = await getAllRaw();

    const maxId = all.reduce((max, item) => item.id > max ? item.id : max, 0);
    const newItem = {
      ...productData,
      id: maxId + 1,
      created_at: new Date().toISOString()
    };
    delete newItem.isNew;

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(newItem);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const latency = Math.round(performance.now() - startTime);
    const generatedSQL = `INSERT INTO products (title, price, category, description, rating, thumbnail)\nVALUES ('${newItem.title.replace(/'/g, "''")}', ${newItem.price}, '${newItem.category}', '${(newItem.description || '').replace(/'/g, "''")}', ${newItem.rating || 5.0}, '${newItem.thumbnail}');`;

    logDBRequest('POST', '/localdb/products/add', 201, latency, generatedSQL, newItem, newItem);

    return newItem;
  }

  async function updateProduct(id, productData) {
    const startTime = performance.now();
    const db = await getDB();
    const all = await getAllRaw();
    const item = all.find(p => p.id == id);

    if (!item) throw new Error(`Cannot update: Product #${id} not found in LocalDB`);

    const updatedItem = { ...item, ...productData, id: Number(id) };

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(updatedItem);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const latency = Math.round(performance.now() - startTime);
    const generatedSQL = `UPDATE products\nSET title = '${updatedItem.title.replace(/'/g, "''")}', price = ${updatedItem.price}, description = '${(updatedItem.description || '').replace(/'/g, "''")}'\nWHERE id = ${id};`;

    logDBRequest('PUT', `/localdb/products/${id}`, 200, latency, generatedSQL, productData, updatedItem);

    return updatedItem;
  }

  async function deleteProduct(id) {
    const startTime = performance.now();
    const db = await getDB();
    const all = await getAllRaw();
    const item = all.find(p => p.id == id);

    if (!item) throw new Error(`Cannot delete: Product #${id} not found in LocalDB`);

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(Number(id));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const latency = Math.round(performance.now() - startTime);
    const generatedSQL = `DELETE FROM products WHERE id = ${id};`;

    const resObj = { isDeleted: true, id: Number(id), deletedItem: item };
    logDBRequest('DELETE', `/localdb/products/${id}`, 200, latency, generatedSQL, null, resObj);

    return resObj;
  }

  function resetToDefaults() {
    return saveAllRaw(INITIAL_SEED);
  }

  // Helper logger for API Explorer
  function logDBRequest(method, endpoint, statusCode, latency, sqlStr, reqBody, resBody) {
    const logData = {
      id: 'db_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleTimeString(),
      method: method,
      url: `[LocalDB] ${endpoint}`,
      endpoint: endpoint,
      statusCode: statusCode,
      latency: latency,
      requestHeaders: { 'Engine': 'IndexedDB (Local Engine)', 'SQL-Query': sqlStr },
      requestBody: reqBody || { sql: sqlStr },
      responseHeaders: { 'content-type': 'application/json; charset=utf-8' },
      responseBody: resBody
    };

    if (window.ExplorerModule) window.ExplorerModule.addLog(logData);
    if (window.LearningModule && window.LearningModule.isLearningModeActive()) {
      window.LearningModule.animateFlow(method, statusCode, logData);
    }
  }

  // =========================================================================
  // INTERACTIVE IN-BROWSER SQL QUERY PARSER & PROCESSOR
  // =========================================================================

  async function executeSQL(sqlText) {
    const startTime = performance.now();
    const sql = sqlText.trim().replace(/;$/, '');
    const upperSQL = sql.toUpperCase();
    const all = await getAllRaw();

    let columns = [];
    let rows = [];
    let affectedRows = 0;
    let message = 'Query executed successfully';

    if (upperSQL.startsWith('SELECT')) {
      let filtered = [...all];

      // Handle WHERE clause filtering
      if (upperSQL.includes('WHERE')) {
        const whereClause = sql.substring(upperSQL.indexOf('WHERE') + 5, upperSQL.includes('ORDER BY') ? upperSQL.indexOf('ORDER BY') : upperSQL.includes('LIMIT') ? upperSQL.indexOf('LIMIT') : sql.length).trim();

        if (whereClause.toLowerCase().includes('category')) {
          const match = whereClause.match(/category\s*=\s*'([^']+)'/i);
          if (match) filtered = filtered.filter(p => p.category.toLowerCase() === match[1].toLowerCase());
        }
        if (whereClause.toLowerCase().includes('price')) {
          const matchGt = whereClause.match(/price\s*>\s*([\d.]+)/i);
          const matchLt = whereClause.match(/price\s*<\s*([\d.]+)/i);
          if (matchGt) filtered = filtered.filter(p => p.price > parseFloat(matchGt[1]));
          if (matchLt) filtered = filtered.filter(p => p.price < parseFloat(matchLt[1]));
        }
        if (whereClause.toLowerCase().includes('like')) {
          const matchLike = whereClause.match(/like\s*'%([^%']+)%'/i);
          if (matchLike) {
            const q = matchLike[1].toLowerCase();
            filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
          }
        }
      }

      // Handle ORDER BY
      if (upperSQL.includes('ORDER BY')) {
        if (upperSQL.includes('PRICE DESC')) filtered.sort((a, b) => b.price - a.price);
        else if (upperSQL.includes('PRICE ASC')) filtered.sort((a, b) => a.price - b.price);
        else if (upperSQL.includes('RATING DESC')) filtered.sort((a, b) => b.rating - a.rating);
        else if (upperSQL.includes('ID DESC')) filtered.sort((a, b) => b.id - a.id);
      }

      // Handle LIMIT
      if (upperSQL.includes('LIMIT')) {
        const matchLimit = upperSQL.match(/LIMIT\s+(\d+)/);
        if (matchLimit) filtered = filtered.slice(0, parseInt(matchLimit[1]));
      }

      // Columns
      if (filtered.length > 0) {
        columns = ['id', 'title', 'price', 'category', 'rating', 'description'];
        rows = filtered.map(p => ({
          id: p.id,
          title: p.title,
          price: `$${Number(p.price).toFixed(2)}`,
          category: p.category,
          rating: `★ ${p.rating}`,
          description: p.description
        }));
      }
      affectedRows = rows.length;
      message = `Returned ${rows.length} row(s)`;

    } else if (upperSQL.startsWith('INSERT')) {
      const matchVal = sql.match(/VALUES\s*\(\s*'([^']+)'\s*,\s*([\d.]+)\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/i);
      let newTitle = 'Custom SQL Product', newPrice = 49.99, newCat = 'electronics', newDesc = 'Added via SQL Studio Terminal';

      if (matchVal) {
        newTitle = matchVal[1];
        newPrice = parseFloat(matchVal[2]);
        newCat = matchVal[3];
        newDesc = matchVal[4];
      }

      const created = await addProduct({ title: newTitle, price: newPrice, category: newCat, description: newDesc });
      columns = ['id', 'title', 'price', 'category', 'status'];
      rows = [{ id: created.id, title: created.title, price: `$${created.price}`, category: created.category, status: 'INSERTED' }];
      affectedRows = 1;
      message = `Inserted 1 new row (ID #${created.id})`;

    } else if (upperSQL.startsWith('UPDATE')) {
      const matchId = sql.match(/WHERE\s+id\s*=\s*(\d+)/i);
      if (!matchId) throw new Error('UPDATE query requires a WHERE id = {id} clause');
      const targetId = parseInt(matchId[1]);

      const matchPrice = sql.match(/price\s*=\s*([\d.]+)/i);
      const matchTitle = sql.match(/title\s*=\s*'([^']+)'/i);

      const payload = {};
      if (matchPrice) payload.price = parseFloat(matchPrice[1]);
      if (matchTitle) payload.title = matchTitle[1];

      const updated = await updateProduct(targetId, payload);
      columns = ['id', 'title', 'price', 'status'];
      rows = [{ id: updated.id, title: updated.title, price: `$${updated.price}`, status: 'UPDATED' }];
      affectedRows = 1;
      message = `Updated row ID #${targetId}`;

    } else if (upperSQL.startsWith('DELETE')) {
      const matchId = sql.match(/WHERE\s+id\s*=\s*(\d+)/i);
      if (!matchId) throw new Error('DELETE query requires a WHERE id = {id} clause');
      const targetId = parseInt(matchId[1]);

      await deleteProduct(targetId);
      columns = ['id', 'status'];
      rows = [{ id: targetId, status: 'DELETED' }];
      affectedRows = 1;
      message = `Deleted 1 row (ID #${targetId})`;
    }

    const latency = Math.round(performance.now() - startTime);

    return {
      sql: sqlText,
      columns,
      rows,
      affectedRows,
      latency,
      message
    };
  }

  return {
    getDB,
    getAllRaw,
    saveAllRaw,
    loadProducts,
    fetchCategories,
    fetchProductsByCategory,
    searchProducts,
    fetchProductById,
    addProduct,
    updateProduct,
    deleteProduct,
    resetToDefaults,
    executeSQL
  };
})();

window.LocalDBService = LocalDBService;
