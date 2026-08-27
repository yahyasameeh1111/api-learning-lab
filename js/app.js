/**
 * Main Application Bootstrap & Router - Links API, LocalDB, Supabase, Auth, UI, Explorer, and Learning modules.
 * Implements Authentication Guard: Only authenticated users can access app features.
 */

const App = (function () {
  let searchDebounceTimer = null;

  function init() {
    console.log('🚀 Initializing API Learning Lab with Supabase & Auth Gate...');

    UIModule.init();
    ExplorerModule.init();
    LearningModule.init();

    bindNavigation();
    bindGlobalSearch();

    // Authentication Guard Check
    if (window.AuthService && !window.AuthService.isAuthenticated()) {
      switchTab('login');
      UIModule.showToast('Authentication Required', 'Please sign in to access the app.', 'info');
    } else {
      loadInitialData();
    }
  }

  /* --------------------------------------------------------------------------
     Tab Navigation Swapper with Auth Guard
     -------------------------------------------------------------------------- */
  function bindNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });

    document.getElementById('start-crud-btn')?.addEventListener('click', () => {
      switchTab('crud');
    });

    document.getElementById('open-flow-btn')?.addEventListener('click', () => {
      switchTab('dashboard');
      const flow = document.getElementById('flow-container');
      flow?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      document.getElementById('mobile-nav')?.classList.toggle('open');
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop:not(.hide)').forEach(m => m.classList.add('hide'));
      }
    });
  }

  function switchTab(tabId) {
    const authenticated = window.AuthService && window.AuthService.isAuthenticated();

    // Protected Route Guard
    if (!authenticated && tabId !== 'login') {
      UIModule.showToast('Access Restricted', 'Please sign in first to access the dashboard and product catalog.', 'error');
      tabId = 'login';
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    document.getElementById('mobile-nav')?.classList.remove('open');
    document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));

    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    if (tabId === 'explorer') {
      ExplorerModule.togglePanel();
    }

    // Load initial data if just authenticated and data not loaded
    if (authenticated && tabId !== 'login') {
      loadInitialData();
    }
  }

  /* --------------------------------------------------------------------------
     Debounced Synchronized Product Search Bars (Header & Catalog Hero)
     -------------------------------------------------------------------------- */
  function bindGlobalSearch() {
    const headerInput = document.getElementById('global-search');
    const catalogInput = document.getElementById('catalog-search-input');
    const headerClearBtn = document.getElementById('clear-search');
    const catalogClearBtn = document.getElementById('clear-catalog-search');

    function handleInputSync(val, sourceInput) {
      if (sourceInput !== headerInput && headerInput) headerInput.value = val;
      if (sourceInput !== catalogInput && catalogInput) catalogInput.value = val;

      if (val.length > 0) {
        headerClearBtn?.classList.remove('hide');
        catalogClearBtn?.classList.remove('hide');
      } else {
        headerClearBtn?.classList.add('hide');
        catalogClearBtn?.classList.add('hide');
      }

      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        handleSearchExecution(val);
      }, 300);
    }

    headerInput?.addEventListener('input', (e) => handleInputSync(e.target.value.trim(), headerInput));
    catalogInput?.addEventListener('input', (e) => handleInputSync(e.target.value.trim(), catalogInput));
  }

  function handleSearchExecution(query) {
    if (window.AuthService && !window.AuthService.isAuthenticated()) {
      switchTab('login');
      return;
    }

    const statusBar = document.getElementById('search-status-bar');
    const termText = document.getElementById('search-term-text');

    if (query) {
      if (statusBar && termText) {
        termText.textContent = query;
        statusBar.classList.remove('hide');
      }
      switchTab('crud');
      loadCatalogData('all', query, 0);
    } else {
      statusBar?.classList.add('hide');
      loadCatalogData('all', '', 0);
    }
  }

  /* --------------------------------------------------------------------------
     Catalog Data Loader (Delegates to DataService for Supabase, LocalDB, or DummyJSON)
     -------------------------------------------------------------------------- */
  async function loadCatalogData(category = 'all', query = '', skip = 0, isAppend = false) {
    if (!isAppend) {
      UIModule.renderSkeletonLoaders(6);
    }

    try {
      let res;
      if (query) {
        res = await window.DataService.searchProducts(query);
      } else if (category !== 'all') {
        res = await window.DataService.fetchProductsByCategory(category, 10, skip);
      } else {
        res = await window.DataService.loadProducts(10, skip);
      }

      const products = res.products || [];
      const total = res.total || products.length;

      UIModule.setProducts(products, total, isAppend);
    } catch (err) {
      console.error('Failed to load products:', err);
      const provider = window.DataService.getProvider();
      UIModule.showToast(
        'Fetch Error',
        provider === 'supabase' ? 'Could not reach Supabase. Check credentials.' : 'Unable to retrieve products.',
        'error'
      );
    }
  }

  /* --------------------------------------------------------------------------
     Initial Data Load
     -------------------------------------------------------------------------- */
  async function loadInitialData() {
    await loadCatalogData('all', '', 0);

    try {
      const catRes = await window.DataService.fetchCategories();
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

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

window.App = App;
