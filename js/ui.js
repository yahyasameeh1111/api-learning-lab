/**
 * UI Module - Handles DOM Manipulation, Card Rendering, Skeleton Loaders,
 * Modals, Toasts, Form Validation, Search, and Theme Switcher.
 */

const UIModule = (function () {
  let products = [];
  let categories = [];
  let currentSkip = 0;
  const limit = 10;
  let totalProducts = 0;
  let activeSearchQuery = '';
  let activeCategory = 'all';
  let activeSort = 'default';
  let deleteTargetId = null;

  // DOM Containers
  let productGrid, countLabel, paginationInfo, categorySelect, sortSelect, loadMoreBtn, emptyState;

  function init() {
    productGrid = document.getElementById('product-grid');
    countLabel = document.getElementById('product-count');
    paginationInfo = document.getElementById('pagination-info');
    categorySelect = document.getElementById('category-filter');
    sortSelect = document.getElementById('sort-filter');
    loadMoreBtn = document.getElementById('load-more-btn');
    emptyState = document.getElementById('empty-state');

    bindEvents();
    initTheme();
  }

  function bindEvents() {
    // Category dropdown filter
    categorySelect?.addEventListener('change', (e) => {
      activeCategory = e.target.value;
      resetAndFetch();
    });

    // Sort dropdown
    sortSelect?.addEventListener('change', (e) => {
      activeSort = e.target.value;
      renderProductGrid();
    });

    // Load More pagination
    loadMoreBtn?.addEventListener('click', () => {
      loadMoreProducts();
    });

    // Open Add Product Modal
    document.getElementById('open-add-modal-btn')?.addEventListener('click', () => {
      openModal('create-product-modal');
    });

    // Close Modals
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        closeModal(modalId);
      });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.add('hide');
        }
      });
    });

    // Forms
    document.getElementById('create-product-form')?.addEventListener('submit', handleCreateSubmit);
    document.getElementById('edit-product-form')?.addEventListener('submit', handleEditSubmit);
    document.getElementById('confirm-delete-btn')?.addEventListener('click', handleDeleteConfirm);

    // Live preview generator for Create Form payload
    ['create-title', 'create-price', 'create-category', 'create-description'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateCreatePayloadPreview);
    });

    // Search reset buttons
    document.getElementById('clear-search')?.addEventListener('click', clearSearch);
    document.getElementById('reset-search-btn')?.addEventListener('click', clearSearch);
    document.getElementById('empty-reset-btn')?.addEventListener('click', () => {
      clearSearch();
      categorySelect.value = 'all';
      activeCategory = 'all';
      resetAndFetch();
    });
  }

  /* --------------------------------------------------------------------------
     Theme Switcher
     -------------------------------------------------------------------------- */
  function initTheme() {
    const savedTheme = localStorage.getItem('api_lab_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('api_lab_theme', next);
      showToast('Theme Changed', `Switched to ${next} mode.`, 'info');
    });
  }

  /* --------------------------------------------------------------------------
     Skeleton Loader & Product Grid Rendering
     -------------------------------------------------------------------------- */
  function renderSkeletonLoaders(count = 6) {
    if (!productGrid) return;
    productGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'product-card glass skeleton-card';
      card.innerHTML = `
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-btn"></div>
      `;
      productGrid.appendChild(card);
    }
  }

  function setProducts(items, total = 0, isAppend = false) {
    if (isAppend) {
      products = [...products, ...items];
    } else {
      products = items;
    }
    totalProducts = total || products.length;
    renderProductGrid();
  }

  function renderProductGrid() {
    if (!productGrid) return;

    let displayList = [...products];

    // Apply Sorting
    if (activeSort === 'price-asc') {
      displayList.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'price-desc') {
      displayList.sort((a, b) => b.price - a.price);
    } else if (activeSort === 'rating-desc') {
      displayList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    if (displayList.length === 0) {
      productGrid.innerHTML = '';
      emptyState?.classList.remove('hide');
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      if (countLabel) countLabel.textContent = '0 items';
      if (paginationInfo) paginationInfo.textContent = 'Showing 0 of 0';
      return;
    }

    emptyState?.classList.add('hide');
    productGrid.innerHTML = '';

    displayList.forEach(prod => {
      const card = createProductCardElement(prod);
      productGrid.appendChild(card);
    });

    if (countLabel) countLabel.textContent = `${displayList.length} items loaded`;
    if (paginationInfo) paginationInfo.textContent = `Showing ${displayList.length} of ${totalProducts}`;

    if (loadMoreBtn) {
      if (displayList.length >= totalProducts || activeSearchQuery) {
        loadMoreBtn.style.display = 'none';
      } else {
        loadMoreBtn.style.display = 'inline-flex';
      }
    }
  }

  function createProductCardElement(prod) {
    const card = document.createElement('div');
    card.className = `product-card glass ${prod.isNew ? 'created-highlight' : ''}`;
    card.dataset.id = prod.id;

    const imgUrl = prod.thumbnail || (prod.images && prod.images[0]) || 'https://via.placeholder.com/300x200?text=No+Image';

    card.innerHTML = `
      <div class="card-top">
        <span class="id-badge">ID: #${prod.id}</span>
        ${prod.isNew ? '<span class="new-badge">NEW</span>' : ''}
        <img class="product-img" src="${imgUrl}" alt="${escapeHtml(prod.title)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=Product+Image'">
      </div>

      <div class="card-info">
        <span class="category-tag">${escapeHtml(prod.category || 'General')}</span>
        <h4 class="product-title" title="${escapeHtml(prod.title)}">${escapeHtml(prod.title)}</h4>
        <div class="rating-price-row">
          <span class="product-price">$${Number(prod.price).toFixed(2)}</span>
          <span class="rating-badge">★ ${prod.rating ? prod.rating.toFixed(1) : '4.5'}</span>
        </div>
      </div>

      <div class="card-actions">
        <button class="btn btn-sm btn-outline put edit-btn" data-id="${prod.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          Edit (PUT)
        </button>
        <button class="btn btn-sm btn-outline delete delete-btn" data-id="${prod.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          Delete
        </button>
      </div>
    `;

    // Card click opens details modal
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-actions')) return; // Ignore edit/delete clicks
      showProductDetailsModal(prod);
    });

    // Edit button click
    card.querySelector('.edit-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(prod);
    });

    // Delete button click
    card.querySelector('.delete-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteConfirmModal(prod);
    });

    return card;
  }

  /* --------------------------------------------------------------------------
     Categories Populator
     -------------------------------------------------------------------------- */
  function setCategories(catList) {
    categories = catList;
    if (!categorySelect) return;

    // Keep "All Categories" option
    categorySelect.innerHTML = '<option value="all">All Categories</option>';
    const createCatSelect = document.getElementById('create-category');
    if (createCatSelect) createCatSelect.innerHTML = '<option value="">Select Category</option>';

    categories.forEach(cat => {
      const name = typeof cat === 'string' ? cat : (cat.name || cat.slug);
      const val = typeof cat === 'string' ? cat : (cat.slug || cat.name);

      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = capitalize(name);
      categorySelect.appendChild(opt);

      if (createCatSelect) {
        const opt2 = document.createElement('option');
        opt2.value = val;
        opt2.textContent = capitalize(name);
        createCatSelect.appendChild(opt2);
      }
    });
  }

  /* --------------------------------------------------------------------------
     Product Details Modal View
     -------------------------------------------------------------------------- */
  function showProductDetailsModal(prod) {
    const content = document.getElementById('product-details-content');
    if (!content) return;

    const imgUrl = prod.thumbnail || (prod.images && prod.images[0]) || 'https://via.placeholder.com/400x300';

    content.innerHTML = `
      <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px;">
          <img src="${imgUrl}" alt="${escapeHtml(prod.title)}" style="width:100%; border-radius:12px; object-fit:cover; max-height:260px;">
        </div>
        <div style="flex: 1.2; min-width: 220px; display:flex; flex-direction:column; gap:0.5rem;">
          <span class="method-chip get">GET /products/${prod.id}</span>
          <span class="category-tag">${escapeHtml(prod.category || 'General')}</span>
          <h2>${escapeHtml(prod.title)}</h2>
          <h3 style="color:var(--text-main); font-size:1.6rem; font-weight:800;">$${Number(prod.price).toFixed(2)}</h3>
          <p style="color:var(--text-muted); font-size:0.9rem;">${escapeHtml(prod.description || 'No description available.')}</p>
          <div style="margin-top:0.5rem; font-size:0.85rem; color:var(--text-subtle);">
            <div>Rating: <strong>★ ${prod.rating || '4.5'} / 5.0</strong></div>
            <div>Brand: <strong>${escapeHtml(prod.brand || 'Generic')}</strong></div>
            <div>Stock Status: <strong>${prod.stock || 25} in stock</strong></div>
          </div>
          <div style="margin-top:1rem;">
            <button class="btn btn-sm btn-outline get" onclick="LearningModule.showFetchExplanation('GET', 'https://dummyjson.com/products/${prod.id}')">
              💡 View JS fetch() Code
            </button>
          </div>
        </div>
      </div>
    `;

    openModal('product-details-modal');
  }

  /* --------------------------------------------------------------------------
     CREATE (POST) Handler
     -------------------------------------------------------------------------- */
  function updateCreatePayloadPreview() {
    const preview = document.getElementById('create-payload-preview');
    if (!preview) return;

    const data = {
      title: document.getElementById('create-title').value.trim() || '...',
      price: parseFloat(document.getElementById('create-price').value) || 0,
      category: document.getElementById('create-category').value || '...',
      description: document.getElementById('create-description').value.trim() || '...'
    };

    preview.textContent = JSON.stringify(data, null, 2);
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();

    const titleInput = document.getElementById('create-title');
    const priceInput = document.getElementById('create-price');
    const catInput = document.getElementById('create-category');
    const descInput = document.getElementById('create-description');

    let isValid = true;

    if (!titleInput.value.trim() || titleInput.value.trim().length < 3) {
      document.getElementById('err-create-title').classList.remove('hide');
      isValid = false;
    } else {
      document.getElementById('err-create-title').classList.add('hide');
    }

    if (!priceInput.value || parseFloat(priceInput.value) <= 0) {
      document.getElementById('err-create-price').classList.remove('hide');
      isValid = false;
    } else {
      document.getElementById('err-create-price').classList.add('hide');
    }

    if (!catInput.value) {
      document.getElementById('err-create-category').classList.remove('hide');
      isValid = false;
    } else {
      document.getElementById('err-create-category').classList.add('hide');
    }

    if (!descInput.value.trim()) {
      document.getElementById('err-create-description').classList.remove('hide');
      isValid = false;
    } else {
      document.getElementById('err-create-description').classList.add('hide');
    }

    if (!isValid) return;

    const submitBtn = document.getElementById('submit-create-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending POST Request...';

    const payload = {
      title: titleInput.value.trim(),
      price: parseFloat(priceInput.value),
      category: catInput.value,
      description: descInput.value.trim(),
      rating: 5.0,
      thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
      isNew: true
    };

    try {
      const res = await ApiService.addProduct(payload);

      // DummyJSON returns new item with assigned ID
      const newProduct = {
        ...payload,
        id: res.id || Math.floor(Math.random() * 800) + 200
      };

      // Prepend to UI product list
      products.unshift(newProduct);
      totalProducts++;
      renderProductGrid();

      closeModal('create-product-modal');
      e.target.reset();
      updateCreatePayloadPreview();

      showToast('POST Request Succeeded (201 Created)', `Created "${newProduct.title}" with ID #${newProduct.id}`, 'success');

      if (window.LearningModule && window.LearningModule.isLearningModeActive()) {
        window.LearningModule.showFetchExplanation('POST', 'https://dummyjson.com/products/add', payload);
      }
    } catch (err) {
      showToast('POST Request Failed', err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send POST Request';
    }
  }

  /* --------------------------------------------------------------------------
     UPDATE (PUT) Handler
     -------------------------------------------------------------------------- */
  function openEditModal(prod) {
    document.getElementById('edit-id').value = prod.id;
    document.getElementById('edit-product-id-label').textContent = prod.id;
    document.getElementById('edit-title').value = prod.title;
    document.getElementById('edit-price').value = prod.price;
    document.getElementById('edit-category').value = prod.category || 'general';
    document.getElementById('edit-description').value = prod.description || '';

    openModal('edit-product-modal');
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const title = document.getElementById('edit-title').value.trim();
    const price = parseFloat(document.getElementById('edit-price').value);
    const description = document.getElementById('edit-description').value.trim();

    if (!title || isNaN(price) || price <= 0 || !description) {
      showToast('Validation Error', 'Please fill in all required fields properly.', 'error');
      return;
    }

    const submitBtn = document.getElementById('submit-edit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending PUT Request...';

    const payload = { title, price, description };

    try {
      await ApiService.updateProduct(id, payload);

      // Update in local state
      const idx = products.findIndex(p => p.id == id);
      if (idx !== -1) {
        products[idx].title = title;
        products[idx].price = price;
        products[idx].description = description;
      }

      renderProductGrid();

      // Highlight updated card
      const cardEl = document.querySelector(`.product-card[data-id="${id}"]`);
      cardEl?.classList.add('updated-highlight');
      setTimeout(() => cardEl?.classList.remove('updated-highlight'), 2000);

      closeModal('edit-product-modal');
      showToast('PUT Request Succeeded (200 OK)', `Updated Product #${id} fields successfully.`, 'success');

      if (window.LearningModule && window.LearningModule.isLearningModeActive()) {
        window.LearningModule.showFetchExplanation('PUT', `https://dummyjson.com/products/${id}`, payload);
      }
    } catch (err) {
      showToast('PUT Request Failed', err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send PUT Request';
    }
  }

  /* --------------------------------------------------------------------------
     DELETE Handler
     -------------------------------------------------------------------------- */
  function openDeleteConfirmModal(prod) {
    deleteTargetId = prod.id;
    document.getElementById('delete-target-id').textContent = prod.id;
    document.getElementById('delete-target-title').textContent = prod.title;
    openModal('delete-confirm-modal');
  }

  async function handleDeleteConfirm() {
    if (!deleteTargetId) return;

    const btn = document.getElementById('confirm-delete-btn');
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
      await ApiService.deleteProduct(deleteTargetId);

      // Animate card removal in UI
      const cardEl = document.querySelector(`.product-card[data-id="${deleteTargetId}"]`);
      if (cardEl) {
        cardEl.classList.add('deleting-anim');
        setTimeout(() => {
          products = products.filter(p => p.id != deleteTargetId);
          totalProducts--;
          renderProductGrid();
        }, 400);
      } else {
        products = products.filter(p => p.id != deleteTargetId);
        renderProductGrid();
      }

      closeModal('delete-confirm-modal');
      showToast('DELETE Request Succeeded (200 OK)', `Product #${deleteTargetId} deleted.`, 'success');

      if (window.LearningModule && window.LearningModule.isLearningModeActive()) {
        window.LearningModule.showFetchExplanation('DELETE', `https://dummyjson.com/products/${deleteTargetId}`);
      }
    } catch (err) {
      showToast('DELETE Request Failed', err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Yes, Send DELETE Request';
      deleteTargetId = null;
    }
  }

  /* --------------------------------------------------------------------------
     Toast System
     -------------------------------------------------------------------------- */
  function showToast(title, desc, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      info: '💡'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || '💡'}</div>
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-desc">${escapeHtml(desc)}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /* --------------------------------------------------------------------------
     Search & Pagination Helpers
     -------------------------------------------------------------------------- */
  function clearSearch() {
    const input = document.getElementById('global-search');
    const clearBtn = document.getElementById('clear-search');
    const statusBar = document.getElementById('search-status-bar');

    if (input) input.value = '';
    clearBtn?.classList.add('hide');
    statusBar?.classList.add('hide');
    activeSearchQuery = '';
    resetAndFetch();
  }

  function resetAndFetch() {
    currentSkip = 0;
    if (window.App) window.App.loadCatalogData(activeCategory, activeSearchQuery, currentSkip);
  }

  function loadMoreProducts() {
    currentSkip += limit;
    if (window.App) window.App.loadCatalogData(activeCategory, activeSearchQuery, currentSkip, true);
  }

  /* --------------------------------------------------------------------------
     Modal Utilities
     -------------------------------------------------------------------------- */
  function openModal(id) {
    document.getElementById(id)?.classList.remove('hide');
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.add('hide');
  }

  // General Utilities
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
  }

  return {
    init,
    renderSkeletonLoaders,
    setProducts,
    setCategories,
    showToast,
    openModal,
    closeModal,
    clearSearch,
    resetAndFetch
  };
})();

window.UIModule = UIModule;
