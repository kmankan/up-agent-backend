// Create src/lib/check-embeddings.ts
import { db } from './db';

async function checkEmbeddings() {
  const result = await db.query('SELECT COUNT(*) FROM documents');
  console.log(`Total documents stored: ${result.rows[0].count}`);
  
  const sample = await db.query('SELECT metadata FROM documents');
  console.log('Sample files indexed:');
  sample.rows.forEach(row => {
    const source = row.metadata.source || row.metadata.source_file || 'Unknown source';
    console.log(source);
  });
}

checkEmbeddings()
  .catch(console.error)
  .finally(() => process.exit());