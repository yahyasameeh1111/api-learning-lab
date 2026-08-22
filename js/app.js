/**
 * Main Application Bootstrap & Router - Links API, UI, Explorer, and Learning modules.
 */

const App = (function () {
  let searchDebounceTimer = null;

  function init() {
    console.log('🚀 Initializing API Learning Lab application...');

    // Initialize sub-modules
    UIModule.init();
    ExplorerModule.init();
    LearningModule.init();

    bindNavigation();
    bindGlobalSearch();

    // Initial Data Fetch
    loadInitialData();
  }

  /* --------------------------------------------------------------------------
     Tab Navigation Swapper
     -------------------------------------------------------------------------- */
  function bindNavigation() {
    // Top Nav buttons & Mobile Nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });

    // Hero action buttons
    document.getElementById('start-crud-btn')?.addEventListener('click', () => {
      switchTab('crud');
    });

    document.getElementById('open-flow-btn')?.addEventListener('click', () => {
      switchTab('dashboard');
      const flow = document.getElementById('flow-container');
      flow?.scrollIntoView({ behavior: 'smooth' });
    });

    // Mobile Hamburger Menu Toggle
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      document.getElementById('mobile-nav')?.classList.toggle('open');
    });

    // Escape Key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop:not(.hide)').forEach(m => m.classList.add('hide'));
      }
    });
  }

  function switchTab(tabId) {
    // Update active nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    // Close mobile nav drawer if open
    document.getElementById('mobile-nav')?.classList.remove('open');

    // Switch View Panels
    document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));

    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    // Special case for API Explorer tab button: toggle Explorer panel on smaller screens
    if (tabId === 'explorer') {
      ExplorerModule.togglePanel();
    }
  }

  /* --------------------------------------------------------------------------
     Debounced Global Search Bar (300ms)
     -------------------------------------------------------------------------- */
  function bindGlobalSearch() {
    const searchInput = document.getElementById('global-search');
    const clearBtn = document.getElementById('clear-search');

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();

      if (query.length > 0) {
        clearBtn?.classList.remove('hide');
      } else {
        clearBtn?.classList.add('hide');
      }

      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        handleSearchExecution(query);
      }, 300);
    });
  }

  function handleSearchExecution(query) {
    const statusBar = document.getElementById('search-status-bar');
    const termText = document.getElementById('search-term-text');

    if (query) {
      if (statusBar && termText) {
        termText.textContent = query;
        statusBar.classList.remove('hide');
      }
      // Switch to CRUD tab if on dashboard
      switchTab('crud');
      loadCatalogData('all', query, 0);
    } else {
      statusBar?.classList.add('hide');
      loadCatalogData('all', '', 0);
    }
  }

  /* --------------------------------------------------------------------------
     Catalog Data Loader (Handles GET /products, Search, Categories, & Pagination)
     -------------------------------------------------------------------------- */
  async function loadCatalogData(category = 'all', query = '', skip = 0, isAppend = false) {
    if (!isAppend) {
      UIModule.renderSkeletonLoaders(6);
    }

    try {
      let res;
      if (query) {
        res = await ApiService.searchProducts(query);
      } else if (category !== 'all') {
        res = await ApiService.fetchProductsByCategory(category, 10, skip);
      } else {
        res = await ApiService.loadProducts(10, skip);
      }

      const products = res.products || [];
      const total = res.total || products.length;

      UIModule.setProducts(products, total, isAppend);
    } catch (err) {
      console.error('Failed to load products:', err);
      UIModule.showToast('API Fetch Error', 'Unable to retrieve products from DummyJSON API.', 'error');
    }
  }

  /* --------------------------------------------------------------------------
     Initial Data Load
     -------------------------------------------------------------------------- */
  async function loadInitialData() {
    // 1. Load initial 10 products
    await loadCatalogData('all', '', 0);

    // 2. Fetch categories for filter dropdown
    try {
      const catRes = await ApiService.fetchCategories();
      UIModule.setCategories(catRes || []);
    } catch (err) {
      console.warn('Could not load categories:', err);
    }
  }

  return {
    init,
    switchTab,
    loadCatalogData
  };
})();

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
