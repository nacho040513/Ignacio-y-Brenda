const heartCount = 12;

if (!document.querySelector('.ambient-hearts')) {
  const layer = document.createElement('div');
  layer.className = 'ambient-hearts';
  layer.setAttribute('aria-hidden', 'true');
  const hearts = document.createDocumentFragment();
  for (let index = 0; index < heartCount; index += 1) {
    const heart = document.createElement('span');
    heart.textContent = '♥';
    hearts.append(heart);
  }
  layer.append(hearts);
  document.body.prepend(layer);
}
