const fs = require('fs');

// Read the source map
const map = JSON.parse(fs.readFileSync('dist/assets/kds-CCqUaOq3.js.map', 'utf8'));
const genCode = fs.readFileSync('dist/assets/kds-CCqUaOq3.js', 'utf8');
const genLines = genCode.split('\n');

// The error is at generated line 47 (0-based: 46), column 27187
// In the source map, VLQ-encoded mappings tell us which original source + position this maps to

// Let's use the decoded mappings
// Actually, let's just search the generated code for "Da" functions  
// In Terser/Rolldown minification, the function name Da might appear as "function Da" or "Da:function" or "Da="

// Search for function definitions near line 47 area
console.log('=== Searching for function Da in generated code ===');

// Look for patterns like "Da=function", "Da(){", "function Da"
const daMatches = [];
const regexes = [/[^a-zA-Z0-9_$]Da[=\(]/g, /function\s+Da/g, /Da[:]\s*function/g, /=>\s*{/g];

// Show a wider view of lines 40-70
for (let i = Math.max(0, 36); i < Math.min(genLines.length, 80); i++) {
  const line = genLines[i];
  if (line && line.length > 10) {
    // Look for function-like patterns
    if (line.includes('function') || line.includes('=>') || line.includes('=(')) {
      // Show first 200 chars
      console.log(`Line ${i+1}: ${line.substring(0, 200)}`);
    }
  }
}

console.log('\n=== Looking at what is around line 47 column 27187 ===');
// The source map VLQ is complex to decode manually, let's just look at line 47 content
const genLine47 = genLines[46];
if (genLine47) {
  // Show the content around column 27187
  const start = Math.max(0, 27187 - 100);
  const end = Math.min(genLine47.length, 27187 + 100);
  console.log(`Line 47 length: ${genLine47.length}`);
  if (start < end) {
    console.log(`Content around col 27187:`);
    console.log(genLine47.substring(start, end));
  }
  // Also show short content
  console.log(`\nLine 47 (full first 1000 chars):`);
  console.log(genLine47.substring(0, 1000));
}

// Let's also search for where KDSTicket is defined
console.log('\n=== Search for KDSTicket in generated code ===');
const kdsTicketIdx = map.sources.findIndex(s => s.includes('KDSTicket'));
console.log(`KDSTicket source index: ${kdsTicketIdx}`);

// Check what sources are around index 45 and 46 (paymentMethods.js and KDSTicket.jsx)
console.log(`\nSource at index 45: ${map.sources[45]?.substring(map.sources[45].lastIndexOf('\\')+1)}`);
console.log(`Source at index 46: ${map.sources[46]?.substring(map.sources[46].lastIndexOf('\\')+1)}`);
