document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const email = document.getElementById('username');
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirmPassword');
  const errorMsg = document.getElementById('errorMsg');

  form.addEventListener('submit', function (e) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+]{8,}$/;

    if (!emailRegex.test(email.value.trim())) {
      e.preventDefault();
      errorMsg.textContent = "Please enter a valid email address.";
    } else if (!passwordRegex.test(password.value)) {
      e.preventDefault();
      errorMsg.textContent = "Password must be at least 8 characters and contain a letter and a number.";
    } else if (password.value !== confirm.value) {
      e.preventDefault();
      errorMsg.textContent = "Passwords do not match.";
    }
  });
});
