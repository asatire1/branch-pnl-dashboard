/**
 * Authentication - Simple shared password gate
 * Password hash stored in Firestore config/auth document.
 */
const Auth = (() => {
  const SESSION_KEY = 'pnl_authenticated';

  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function isAuthenticated() {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  }

  function setAuthenticated() {
    sessionStorage.setItem(SESSION_KEY, 'true');
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Check your internet connection.')), ms)
      )
    ]);
  }

  async function login(password) {
    const inputHash = await hashPassword(password);

    try {
      // Check Firebase is loaded
      if (typeof firebase === 'undefined' || typeof db === 'undefined') {
        return { success: false, error: 'Firebase not loaded. Refresh and try again.' };
      }

      console.log('[Auth] Attempting Firestore read...');
      const doc = await withTimeout(configRef.doc('auth').get(), 15000);
      console.log('[Auth] Firestore response received. Doc exists:', doc.exists);

      if (!doc.exists) {
        // If no auth doc exists, first login sets the password
        console.log('[Auth] No auth doc found. Setting password...');
        await withTimeout(configRef.doc('auth').set({ passwordHash: inputHash }), 15000);
        setAuthenticated();
        return { success: true };
      }

      const storedHash = doc.data().passwordHash;
      if (inputHash === storedHash) {
        setAuthenticated();
        return { success: true };
      } else {
        return { success: false, error: 'Incorrect password' };
      }
    } catch (err) {
      console.error('[Auth] Error:', err);
      return { success: false, error: err.message || 'Connection error. Check Firebase config.' };
    }
  }

  function init() {
    const loginScreen = document.getElementById('loginScreen');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');

    if (isAuthenticated()) {
      loginScreen.style.display = 'none';
      dashboard.style.display = 'block';
      return true;
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pwd = passwordInput.value.trim();
      if (!pwd) {
        loginError.textContent = 'Please enter a password';
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in...';
      loginError.textContent = '';

      const result = await login(pwd);
      if (result.success) {
        loginScreen.style.display = 'none';
        dashboard.style.display = 'block';
        App.init();
      } else {
        loginError.textContent = result.error;
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
        passwordInput.value = '';
        passwordInput.focus();
      }
    });

    return false;
  }

  return { init, isAuthenticated, hashPassword };
})();
