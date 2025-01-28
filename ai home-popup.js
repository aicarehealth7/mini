// Select the elements
const openPopup = document.getElementById('open-popup');
const closePopup = document.getElementById('close-popup');
const featuresPopup = document.getElementById('features-popup');

// Open the pop-up
openPopup.addEventListener('click', () => {
  featuresPopup.style.display = 'flex';
});

// Close the pop-up
closePopup.addEventListener('click', () => {
  featuresPopup.style.display = 'none';
});

// Close the pop-up when clicking outside the content
window.addEventListener('click', (e) => {
  if (e.target === featuresPopup) {
    featuresPopup.style.display = 'none';
  }
});
