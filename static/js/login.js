/* ===================================================================
   CAMPUS SAFETY INCIDENT LOGGER - Admin Authentication Script
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  setupLoginForm();
});

function setupLoginForm() {
  const form = document.getElementById('adminLoginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      showToast('Please enter both username and password.', 'warning');
      return;
    }

    const originalHTML = loginBtn.innerHTML;
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (result.success) {
        showToast('Authentication successful! Redirecting to Dashboard...', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 800);
      } else {
        showToast(result.message || 'Invalid credentials.', 'danger');
      }

    } catch (err) {
      console.error('Login error:', err);
      showToast('Network error during authentication.', 'danger');
    } finally {
      loginBtn.disabled = false;
      loginBtn.innerHTML = originalHTML;
    }
  });
}

function fillDemoCredentials() {
  const u = document.getElementById('username');
  const p = document.getElementById('password');
  if (u && p) {
    u.value = 'admin';
    p.value = 'admin123';
    showToast('Demo admin credentials populated!', 'info');
  }
}

async function logoutAdmin() {
  try {
    const res = await fetch('/api/logout', { method: 'POST' });
    const result = await res.json();
    if (result.success) {
      showToast('Logged out successfully.', 'info');
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    }
  } catch (err) {
    window.location.href = '/login';
  }
}
