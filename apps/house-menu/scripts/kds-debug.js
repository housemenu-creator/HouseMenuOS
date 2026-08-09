const fs = require('fs');
const map = JSON.parse(fs.readFileSync('dist/assets/kds-CCqUaOq3.js.map', 'utf8'));
const genLines = fs.readFileSync('dist/assets/kds-CCqUaOq3.js', 'utf8').split('\n');

console.log('=== SOURCES IN KDS CHUNK ===');
map.sources.forEach((src, i) => {
  const clean = src.replace(/^.*[\\\/]src[\\\/]/, 'src/').replace(/^.*[\\\/]house-menu[\\\/]/, '');
  console.log(`${i}: ${clean}`);
});

console.log('\n=== LINE 47 (first 500 chars) ===');
if (genLines.length >= 47) {
  console.log(genLines[46].substring(0, 500));
}

console.log('\n=== SEARCH Da function definition ===');
// Try to find function Da
for (let i = 44; i < 50; i++) {
  if (genLines[i-1]) {
    const trimmed = genLines[i-1].substring(0, 300);
    console.log(`Line ${i}: ${trimmed}`);
  }
}
