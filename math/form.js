// "#key" in the URL shows answers (used by the PDF answer-key render); the button toggles on screen.
const btn = document.getElementById('toggle');
function set(on) {
  document.body.classList.toggle('show', on);
  if (btn) { btn.textContent = on ? 'Hide answers' : 'Show answers'; btn.setAttribute('aria-pressed', on); }
}
set(location.hash === '#key');
btn?.addEventListener('click', () => set(!document.body.classList.contains('show')));
