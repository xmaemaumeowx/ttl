// ===== TOAST FUNCTION =====
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast";
  toast.classList.add(`toast-${type}`, "show");
  setTimeout(() => (toast.className = "toast"), 3000);
}

// ===== DOM READY =====
document.addEventListener("DOMContentLoaded", () => {
  const showSignup = document.getElementById("show-signup");
  const signupModal = document.getElementById("signup-modal");
  const closeSignup = document.getElementById("close-signup");

  // Open modal
  showSignup?.addEventListener("click", (e) => {
    e.preventDefault();
    signupModal.style.display = "flex";
  });

  // Close modal
  closeSignup?.addEventListener("click", () => {
    signupModal.style.display = "none";
  });

  // Close when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === signupModal) {
      signupModal.style.display = "none";
    }
  });

  // ===== Signup Form =====
  const signupForm = document.getElementById("signupForm");
  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const full_name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();

    if (!full_name || !email || !password) {
      showToast("All fields are required", "error");
      return;
    }

    try {
      const res = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email, password }),
      });
      const data = await res.json();
      showToast(data.message, data.success ? "success" : "error");

      if (data.success) {
        signupModal.style.display = "none";
        signupForm.reset();
        setTimeout(() => window.location.href = "/login", 1500);
      }
    } catch (err) {
      console.error(err);
      showToast("Signup failed", "error");
    }
  });

  // ===== Login Form =====
  const loginForm = document.getElementById("loginForm");
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      showToast("All fields are required", "error");
      return;
    }

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      showToast(data.message, res.ok ? "success" : "error");
      if (res.ok && data.success) setTimeout(() => window.location.href = "/dashboard", 1500);
    } catch (err) {
      console.error(err);
      showToast("Login failed", "error");
    }
  });
});

// ===== Google One Tap =====
function handleCredentialResponse(response) {
  fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: response.credential }),
  })
    .then(async res => {
      const data = await res.json();
      showToast(data.message, res.ok ? "success" : "error");
      if (res.ok) setTimeout(() => window.location.href = "/dashboard", 1500);
    })
    .catch(err => {
      console.error(err);
      showToast("Google login failed", "error");
    });
}

// --- CAROUSEL (optional) ---
document.addEventListener("DOMContentLoaded", () => {
  // ...all your previous DOMContentLoaded code...
  // AND place the carousel code inside DOMContentLoaded
  const cards = document.querySelectorAll(".carousel-card");
  if (cards.length > 0) {
    let activeIndex = 0;
    const totalCards = cards.length;
    const INTERVAL = 3000;
    function setActiveCard(index) {
      cards.forEach((card, i) => card.classList.toggle("active", i === index));
    }
    function nextCard() {
      activeIndex = (activeIndex + 1) % totalCards;
      setActiveCard(activeIndex);
    }
    setActiveCard(activeIndex);
    setInterval(nextCard, INTERVAL);
  }
});