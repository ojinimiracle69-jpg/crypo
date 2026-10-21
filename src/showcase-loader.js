// Load the standalone showcase interactions when showcase.html is opened directly.
if (location.protocol === 'file:' || location.search.includes('showcase')) {
  const script = document.createElement('script');
  script.src = './src/showcase.js';
  document.body.appendChild(script);
}