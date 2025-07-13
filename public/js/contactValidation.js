document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    const name = form.querySelector('input[name="name"]');
    const email = form.querySelector('input[name="email"]');
    const message = form.querySelector('textarea[name="message"]');

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let errors = [];

    if (!name.value.trim()) errors.push('Name is required.');
    if (!emailPattern.test(email.value)) errors.push('Valid email is required.');
    if (!message.value.trim()) errors.push('Message cannot be empty.');

    if (errors.length > 0) {
      e.preventDefault();
      alert(errors.join('\n'));
    }
  });
});
