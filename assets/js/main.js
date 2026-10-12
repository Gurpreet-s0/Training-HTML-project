document.addEventListener('DOMContentLoaded', () => {
  const menu = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  if (menu && links) menu.addEventListener('click', () => { const open = links.classList.toggle('open'); menu.setAttribute('aria-expanded', open); });
  document.querySelectorAll('.nav-links a').forEach(link => { if (link.href === window.location.href) link.classList.add('active'); });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .15 });
  document.querySelectorAll('.reveal').forEach(card => observer.observe(card));
  const search = document.querySelector('#command-search'), filters = document.querySelectorAll('.filter'), items = document.querySelectorAll('.command-item'); let category = 'all';
  const update = () => { const term = search?.value.toLowerCase() || ''; items.forEach(item => item.hidden = !(item.textContent.toLowerCase().includes(term) && (category === 'all' || item.dataset.category === category))); };
  search?.addEventListener('input', update);
  filters.forEach(button => button.addEventListener('click', () => { filters.forEach(item => item.classList.remove('active')); button.classList.add('active'); category = button.dataset.filter; update(); }));
  const answer = document.querySelector('#challenge-answer');
  document.querySelector('#show-answer')?.addEventListener('click', event => { answer.hidden = !answer.hidden; event.currentTarget.innerHTML = answer.hidden ? 'Show solution <span>↓</span>' : 'Hide solution <span>↑</span>'; });
  document.querySelector('#subscribe-form')?.addEventListener('submit', event => { event.preventDefault(); document.querySelector('#subscribe-status').textContent = 'Thanks - you are on the list!'; event.currentTarget.reset(); });
});
