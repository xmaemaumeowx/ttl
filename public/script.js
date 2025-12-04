// === TOAST FUNCTION ===
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "toast";
  toast.classList.add(`toast-${type}`, "show");
  setTimeout(() => { toast.className = "toast"; }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  // ===== Signup Modal Logic =====
  const showSignup = document.getElementById("show-signup");
  const signupModal = document.getElementById("signup-modal");
  const closeSignup = document.getElementById("close-signup");
  showSignup?.addEventListener("click", (e) => {
    e.preventDefault();
    if (signupModal) signupModal.style.display = "flex";
  });
  closeSignup?.addEventListener("click", () => {
    if (signupModal) signupModal.style.display = "none";
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
        if (signupModal) signupModal.style.display = "none";
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
      if (res.ok && data.redirect) {
        setTimeout(() => (window.location.href = data.redirect), 1200);
      }
    } catch (err) {
      console.error(err);
      showToast("Login failed", "error");
    }
  });

  // ===== GOOGLE ONE TAP SIGN-IN =====
  window.handleCredentialResponse = function(response) {
    fetch("/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          showToast(data.message || "Google sign-in successful!", "success");
          const redirectUrl = data.redirect || "/dashboard";
          setTimeout(() => (window.location.href = redirectUrl), 1200);
        } else {
          showToast(data.error || "Google sign-in failed.", "error");
        }
      })
      .catch((err) => {
        console.error("Google login error:", err);
        showToast("Google login failed. Try again.", "error");
      });
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
  document.querySelectorAll('.expand-modules').forEach(function (el) {
    el.addEventListener('click', function () {
      const id = 'modules-' + this.dataset.courseId;
      const list = document.getElementById(id);
      if (!list) return;
      if (list.style.display === 'block') {
        list.style.display = 'none';
        this.setAttribute('aria-expanded', 'false');
        list.setAttribute('aria-hidden', 'true');
      } else {
        list.style.display = 'block';
        this.setAttribute('aria-expanded', 'true');
        list.setAttribute('aria-hidden', 'false');
      }
    });
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') el.click();
    });
  });

  // ===== CALENDAR MODAL (IF PRESENT) =====
  const calendarEl = document.getElementById('calendar');
  const addEventModal = document.getElementById('addEventModal');
  const ttlModalClose = document.getElementById('ttlModalClose');
  const ttlModalCancel = document.getElementById('ttlModalCancel');
  const eventTitleInput = document.getElementById('eventTitle');
  const eventDateInput = document.getElementById('eventDate');
  const addEventForm = document.getElementById('addEventForm');
  let selectedDate = null;

  function openModal(dateStr) {
    if (eventDateInput && eventTitleInput && addEventModal) {
      eventDateInput.value = dateStr;
      eventTitleInput.value = '';
      addEventModal.style.display = "block";
      eventTitleInput.focus();
    }
  }
  function closeModal() {
    if (addEventModal) addEventModal.style.display = "none";
  }
  ttlModalClose?.addEventListener('click', closeModal);
  ttlModalCancel?.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
  window.onclick = function(event) {
    if (event.target == addEventModal) { closeModal(); }
  };
  if (calendarEl && typeof FullCalendar !== "undefined") {
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      selectable: true,
      themeSystem: 'standard',
      height: 650,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek'
      },
      select: function(info) {
        selectedDate = info.startStr;
        openModal(selectedDate);
      }
    });
    if (addEventForm && eventTitleInput) {
      addEventForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const title = eventTitleInput.value.trim();
        if (title && selectedDate) {
          calendar.addEvent({
            title: title,
            start: selectedDate,
            allDay: true,
          });
          closeModal();
        }
      });
    }
    calendar.render();
  }

  // ===== BUBBLE CHAT PANEL =====
  const bubble = document.getElementById('chat-bubble');
  const panel = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('chat-close');
  if (bubble && panel) {
    bubble.addEventListener('click', () => {
      bubble.classList.add('popping');
      setTimeout(() => {
        bubble.classList.remove('popping');
        panel.style.display = 'flex';
        panel.setAttribute('aria-hidden', 'false');
      }, 360);
    });
  }
  if (closeBtn && panel) {
    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
      panel.setAttribute('aria-hidden', 'true');
    });
  }

  // ===== YEAR IN FOOTER =====
  const yearElem = document.getElementById("year");
  if (yearElem) {
    yearElem.textContent = new Date().getFullYear();
  }

  // ===== OPTIONAL: Date validation used in some forms =====
  window.validateDates = function () {
    const startDate = document.getElementById('start_date')?.value;
    const endDate = document.getElementById('end_date')?.value;
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      alert('End Date cannot be before Start Date.');
      return false;
    }
    return true;
  };
});