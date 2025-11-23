Extract words from your CSV and produce JSON for Contexto

Usage

- Run the extractor with Node (requires Node.js installed):

  node scripts/extract_texts.js "C:\\Users\\You\\Downloads\\texts.csv" --out public/contexto/words.json

- Optionally provide `--col ColumnName` if your CSV has headers and you only want to extract from a specific column.

Output

- Writes `public/contexto/words.json` (creates directories if needed). The file is an array of objects sorted by frequency: [{"word":"cold","count":5967}, ...].

Notes

- The tokenizer is simple: lowercases, removes punctuation, splits on whitespace. Adjust `scripts/extract_texts.js` for language-specific rules or stopword removal.
