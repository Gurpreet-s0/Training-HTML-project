document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#contactForm'), status = document.querySelector('#formStatus');
  if (!form) return;
  form.addEventListener('submit', event => { event.preventDefault(); const name = form.elements.name.value.trim(), email = form.elements.email.value.trim(), message = form.elements.message.value.trim(), valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); if (!name || !email || !message) { status.textContent = 'Please complete every required field.'; status.style.color = '#bb3d35'; return; } if (!valid) { status.textContent = 'Please enter a valid email address.'; status.style.color = '#bb3d35'; return; } status.textContent = 'Thanks, ' + name + '! Your demo message has been received.'; status.style.color = '#5d8d00'; form.reset(); });
});
