'use strict';
async function loadMathematics() {
  const status = document.querySelector('#topics-status');
  try {
    const response = await fetch('api/mathematics.php', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Could not load mathematics.');
    const subject = await response.json();
    document.querySelector('#planned-topics').replaceChildren(...subject.topics.map(topic => {
      const item = document.createElement('li');
      item.textContent = topic;
      return item;
    }));
    status.hidden = true;
  } catch (error) {
    status.textContent = 'Planned topics could not be loaded. Please reload the page to try again.';
  }
}
loadMathematics();
