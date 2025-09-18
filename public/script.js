// TOAST FUNCTION
function showToast(message, type = "success") {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  // Remove any previous type classes & 'show'
  toast.className = 'toast';
  // Add the new type class & 'show'
  toast.classList.add(`toast-${type}`, 'show');
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// SIGNUP VALIDATION
function validateSignUpForm(email, password) {
  if (!email || !password) {
    showToast("Please enter your email and password!", "error");
    return false;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    showToast("Invalid email format!", "error");
    return false;
  }
  const strongPasswordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\{}\[\]|\\:;"'<>,.?/]).{8,}$/;
  if (!strongPasswordPattern.test(password)) {
    showToast(
      "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character!",
      "error"
    );
    return false;
  }
  return true;
}

// LOGIN VALIDATION
function validateLoginForm(email, password) {
  if (!email || !password) {
    showToast("Please enter your email and password!", "error");
    return false;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    showToast("Invalid email format!", "error");
    return false;
  }
  return true;
}

// LOGIN FORM HANDLER
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!validateLoginForm(email, password)) return;
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      showToast(data.message, data.type || (res.ok ? 'success' : 'error'));
      if (res.ok && data.message === 'Login successful!') {
        setTimeout(() => window.location.href = "/home", 2000);
      }
    } catch (err) {
      showToast('An error occurred. Please try again.', 'error');
      console.error('Login Error:', err);
    }
  });
}

// SIGNUP FORM HANDLER
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!validateSignUpForm(email, password)) return;
    try {
      const res = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      showToast(data.message, data.type || (res.ok ? 'success' : 'error'));
      if (res.ok && data.message === 'User successfully added. Please log in.') {
        setTimeout(() => {
          window.location.href = `/?message=${encodeURIComponent(data.message)}`;
        }, 2000);
      }
    } catch (err) {
      showToast('An error occurred. Please try again.', 'error');
      console.error('Signup Error:', err);
    }
  });
}

// GOOGLE ONE TAP CALLBACK (no validation)
function handleCredentialResponse(response) {
  fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: response.credential })
  })
  .then(async res => {
    const data = await res.json();
    showToast(data.message, data.type || (res.ok ? 'success' : 'error'));
    if (res.ok && data.message === 'Login successful!') {
      setTimeout(() => window.location.href = "/home", 2000);
    }
  })
  .catch(error => {
    showToast(error.message || 'Google sign-in failed.', 'error');
    console.error('Login failed:', error);
  });
}