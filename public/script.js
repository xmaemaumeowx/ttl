// === TOAST FUNCTION ===
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast";
  toast.classList.add(`toast-${type}`, "show");
  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  // ===== Signup Modal Logic =====
  const showSignup = document.getElementById("show-signup");
  const signupModal = document.getElementById("signup-modal");
  const closeSignup = document.getElementById("close-signup");

  showSignup?.addEventListener("click", (e) => {
    e.preventDefault();
    signupModal && (signupModal.style.display = "flex");
  });

  closeSignup?.addEventListener("click", () => {
    signupModal && (signupModal.style.display = "none");
  });

  window.addEventListener("click", (e) => {
    if (signupModal && e.target === signupModal) signupModal.style.display = "none";
  });

  // ===== Signup Form Handler =====
  const signupForm = document.getElementById("signupForm");
  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const full_name = document.getElementById("signup-name")?.value.trim();
    const email = document.getElementById("signup-email")?.value.trim();
    const password = document.getElementById("signup-password")?.value.trim();

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
      showToast(data.message, res.ok && data.redirect ? "success" : "error");
      if (res.ok && data.redirect) {
        signupModal.style.display = "none";
        signupForm.reset();
        setTimeout(() => (window.location.href = "/login"), 1200);
      }
    } catch (err) {
      console.error(err);
      showToast("Signup failed", "error");
    }
  });

  // ===== Login Form Handler =====
  const loginForm = document.getElementById("loginForm");
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

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
      showToast(data.message || data.error, res.ok && data.redirect ? "success" : "error");
      if (res.ok && data.redirect) setTimeout(() => (window.location.href = data.redirect), 1200);
    } catch (err) {
      console.error(err);
      showToast("Login failed", "error");
    }
  });

  // ===== GOOGLE ONE TAP / SIGN-IN =====
  window.handleCredentialResponse = async function (response) {
    if (!response.credential) {
      showToast("Google login failed. No credential received.", "error");
      return;
    }

    try {
      const res = await fetch("/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message || "Google sign-in successful!", "success");
        const redirectUrl = data.redirect || "/dashboard";
        setTimeout(() => (window.location.href = redirectUrl), 1200);
      } else {
        console.error("Google login error:", data.error);
        showToast(data.error || "Google sign-in failed.", "error");
      }
    } catch (err) {
      console.error("Google login error:", err);
      showToast("Google login failed. Try again.", "error");
    }
  };

  // ===== CAROUSEL AUTOPLAY =====
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

  // ===== PROJECT MODULES TOGGLE + ARIA =====
  document.querySelectorAll(".expand-modules").forEach((el) => {
    el.addEventListener("click", () => {
      const id = "modules-" + el.dataset.courseId;
      const list = document.getElementById(id);
      if (!list) return;
      const isOpen = list.style.display === "block";
      list.style.display = isOpen ? "none" : "block";
      el.setAttribute("aria-expanded", String(!isOpen));
      list.setAttribute("aria-hidden", String(isOpen));
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") el.click();
    });
  });

  // ===== YEAR IN FOOTER =====
  const yearElem = document.getElementById("year");
  if (yearElem) yearElem.textContent = new Date().getFullYear();
});
