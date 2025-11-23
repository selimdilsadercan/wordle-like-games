#!/usr/bin/env node
// Simple script to extract word frequencies from a CSV file.
// Usage: node scripts/extract_texts.js <path/to/texts.csv> [--col name] [--out public/contexto/words.json]

const fs = require('fs');
const path = require('path');

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function usage() {
  console.log('Usage: node scripts/extract_texts.js <csv-path> [--col name] [--out output.json]');
}

async function main() {
  const argv = process.argv.slice(2);
  if (!argv[0]) return usage();
  const csvPath = argv[0];
  let colName = null;
  let outPath = 'public/contexto/words.json';

  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--col') {
      colName = argv[i + 1];
      i++;
    } else if (argv[i] === '--out') {
      outPath = argv[i + 1];
      i++;
    }
  }

  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }

  const csv = fs.readFileSync(csvPath, 'utf8');
  const lines = csv.split(/\r?\n/).filter(Boolean);
  let headers = null;
  let start = 0;
  if (lines[0].includes(',')) {
    headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    start = 1;
  }

  const counts = Object.create(null);

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    // naive CSV split
    const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
    let text = parts.join(' ');
    if (colName && headers) {
      const idx = headers.indexOf(colName);
      if (idx >= 0 && parts[idx]) text = parts[idx];
    }

    const tokens = tokenize(text);
    for (const t of tokens) {
      if (t.length < 2) continue;
      counts[t] = (counts[t] || 0) + 1;
    }
  }

  const arr = Object.keys(counts).map(w => ({ word: w, count: counts[w] }));
  arr.sort((a, b) => b.count - a.count);

  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(arr, null, 2), 'utf8');
  console.log('Wrote', outPath, 'entries:', arr.length);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
