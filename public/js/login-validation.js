document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.login-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    const email = form.username.value.trim();
    const password = form.password.value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      e.preventDefault();
      return;
    }

    if (password.length < 8) {
      alert('Password must be at least 8 characters long.');
      e.preventDefault();
      return;
    }
  });
});
