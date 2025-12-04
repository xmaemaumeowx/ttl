function showToast(message, type = "success") {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast';
  toast.classList.add('toast-' + type, 'show');
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// Auto show toast if message injected by server
if (window.toastMessage) {
  showToast(window.toastMessage, window.toastType || "success");
}