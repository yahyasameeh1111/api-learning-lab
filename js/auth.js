/**
 * Auth Module - Multi Authorized User Access Control & User Registration System
 * Supports persistent account creation and immediate login access.
 */

const AuthService = (function () {
  // Pre-configured authorized accounts
  const DEFAULT_USERS = [
    { username: 'yahya', password: '1234', id: 'usr_yahya_7781', role: 'administrator' },
    { username: 'abc',   password: 'abc@111', id: 'usr_abc_8829',   role: 'developer' }
  ];

  // Load custom registered users from localStorage
  let registeredUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
  let currentUser = JSON.parse(localStorage.getItem('auth_user') || 'null');

  function getAllUsers() {
    return [...DEFAULT_USERS, ...registeredUsers];
  }

  function getUser() {
    return currentUser;
  }

  function isAuthenticated() {
    return Boolean(currentUser && currentUser.token && currentUser.username);
  }

  function saveSession(userObj) {
    currentUser = userObj;
    localStorage.setItem('auth_user', JSON.stringify(userObj));
    updateUserWidget();
    if (window.UIModule) window.UIModule.renderAuthState();
    if (window.App) window.App.switchTab('dashboard');
  }

  function signOut() {
    currentUser = null;
    localStorage.removeItem('auth_user');
    updateUserWidget();
    if (window.UIModule) {
      window.UIModule.showToast('Signed Out', 'You have been signed out.', 'info');
      window.UIModule.renderAuthState();
    }
    if (window.App) window.App.switchTab('login');
  }

  /**
   * Authenticate User against active users list
   */
  async function signIn(username, password) {
    const cleanUsername = (username || '').trim();
    const cleanPassword = (password || '').trim();
    const startTime = performance.now();

    const allUsers = getAllUsers();
    const matchedUser = allUsers.find(
      u => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.password === cleanPassword
    );

    if (!matchedUser) {
      const latency = Math.round(performance.now() - startTime);

      if (window.ExplorerModule) {
        window.ExplorerModule.addLog({
          id: 'auth_fail_' + Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          method: 'POST',
          url: 'https://bnfexkfyrhpgvgehblhi.supabase.co/auth/v1/token?grant_type=password',
          endpoint: '[Auth] Login Attempt',
          statusCode: 401,
          latency: latency,
          requestHeaders: { 'Content-Type': 'application/json' },
          requestBody: { username: cleanUsername, password: '***' },
          responseHeaders: { 'content-type': 'application/json' },
          responseBody: { error: 'Unauthorized', message: 'Invalid username or password.' }
        });
      }

      throw new Error(`Invalid username or password. Please try again.`);
    }

    const latency = Math.round(performance.now() - startTime);
    const userObj = {
      username: matchedUser.username,
      id: matchedUser.id,
      token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${matchedUser.username}-session`,
      role: matchedUser.role || 'user'
    };

    if (window.ExplorerModule) {
      window.ExplorerModule.addLog({
        id: 'auth_success_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        method: 'POST',
        url: 'https://bnfexkfyrhpgvgehblhi.supabase.co/auth/v1/token?grant_type=password',
        endpoint: `[Auth] Session Started (${matchedUser.username})`,
        statusCode: 200,
        latency: latency,
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { username: matchedUser.username, password: '***' },
        responseHeaders: { 'content-type': 'application/json' },
        responseBody: { user: { username: matchedUser.username, id: matchedUser.id }, access_token: userObj.token }
      });
    }

    saveSession(userObj);
    return userObj;
  }

  /**
   * Register a new User Account and connect directly to sign-in session
   */
  async function signUp(username, password) {
    const cleanUsername = (username || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters long.');
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }

    const allUsers = getAllUsers();
    const existing = allUsers.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (existing) {
      throw new Error('Username already exists. Please choose a different username or Sign In.');
    }

    const newAccount = {
      username: cleanUsername,
      password: cleanPassword,
      id: 'usr_' + Date.now().toString(36),
      role: 'user'
    };

    registeredUsers.push(newAccount);
    localStorage.setItem('registered_users', JSON.stringify(registeredUsers));

    // Automatically sign in the newly registered user
    return await signIn(cleanUsername, cleanPassword);
  }

  function updateUserWidget() {
    const widget = document.getElementById('header-user-widget');
    if (!widget) return;

    if (isAuthenticated()) {
      widget.innerHTML = `
        <div class="user-badge-header">
          <span class="user-avatar-circle">👤</span>
          <span class="user-email-text" title="${currentUser.username}">${currentUser.username}</span>
          <button class="btn btn-sm btn-outline delete" id="header-signout-btn" title="Sign Out">Sign Out</button>
        </div>
      `;
      document.getElementById('header-signout-btn')?.addEventListener('click', signOut);
    } else {
      widget.innerHTML = `
        <button class="btn btn-sm btn-primary" id="header-signin-btn">
          🔒 Sign In
        </button>
      `;
      document.getElementById('header-signin-btn')?.addEventListener('click', () => {
        if (window.App) window.App.switchTab('login');
      });
    }
  }

  return {
    getUser,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    updateUserWidget
  };
})();

window.AuthService = AuthService;
