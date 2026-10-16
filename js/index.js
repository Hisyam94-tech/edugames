'use strict';
let subjects;
let subjectRequest;
async function loadSubjects() {
  if (subjects) return subjects;
  if (!subjectRequest) {
    subjectRequest = fetch('api/index.php', { headers: { Accept: 'application/json' } })
      .then(response => {
        if (!response.ok) throw new Error('Could not load subjects.');
        return response.json();
      })
      .then(data => { subjects = data; return data; })
      .finally(() => { subjectRequest = undefined; });
  }
  return subjectRequest;
}
const dialog = document.querySelector('#subject-dialog');
document.querySelectorAll('[data-subject]').forEach(button => {
  button.addEventListener('click', async () => {
    const status = document.querySelector('#subject-load-status');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    status.hidden = false;
    status.textContent = 'Loading subject details...';
    try {
      const catalogue = await loadSubjects();
      const subject = catalogue[button.dataset.subject];
      document.querySelector('#dialog-title').textContent = subject.name;
      document.querySelector('#dialog-status').textContent = subject.status;
      document.querySelector('.dialog-icon').textContent = subject.icon;
      document.querySelector('#dialog-description').textContent = subject.description;
      document.querySelector('#dialog-topics').replaceChildren(...subject.topics.map(topic => {
        const item = document.createElement('li');
        item.textContent = topic;
        return item;
      }));
      status.hidden = true;
      if (!dialog.open) dialog.showModal();
    } catch (error) {
      status.textContent = 'Subject details could not be loaded. Please try again.';
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });
});
document.querySelectorAll('.close-dialog, .close-action').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});
