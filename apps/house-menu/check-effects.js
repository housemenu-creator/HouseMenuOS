const fs = require('fs');
const content = fs.readFileSync('src/kds/components/KioskMode.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('useEffect') && !line.includes('import')) {
    console.log('Line ' + (i+1) + ': ' + line.trim());
    for(let j = 1; j < 20; j++) {
      if (lines[i+j]) console.log('  ' + lines[i+j].trim());
    }
    console.log('---');
  }
});