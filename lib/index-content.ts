import { indexDocuments, setupDatabase } from './db';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const CONFIG = {
  batchSize: 50, // Number of files to process in parallel
  minChunkSize: 100, // Minimum characters for a chunk to be indexed
  contentPath: path.join(process.cwd(), 'src', 'lib', 'scraped_content'),
};

async function processDirectory() {
  try {
    await setupDatabase();
    
    const files = await fs.readdir(CONFIG.contentPath);
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    
    console.log(`Found ${txtFiles.length} text files to process`);
    
    // Process files in batches with better error handling
    for (let i = 0; i < txtFiles.length; i += CONFIG.batchSize) {
      const batch = txtFiles.slice(i, i + CONFIG.batchSize);
      const currentBatch = Math.floor(i / CONFIG.batchSize) + 1;
      const totalBatches = Math.ceil(txtFiles.length / CONFIG.batchSize);
      
      console.log(`Processing batch ${currentBatch}/${totalBatches}`);
      
      // Process batch with error handling for each file
      await Promise.all(
        batch.map(async (filename) => {
          try {
            const filePath = path.join(CONFIG.contentPath, filename);
            const content = await fs.readFile(filePath, 'utf-8');
            await indexDocuments([{ content, source: filename }]);
            console.log(`✓ Processed ${filename}`);
          } catch (error) {
            console.error(`✗ Failed to process ${filename}:`, error);
          }
        })
      );
      
      console.log(`Completed batch ${currentBatch}/${totalBatches}`);
    }

    console.log('Processing complete');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Add progress tracking
const totalProcessed = 0;
const progressInterval = setInterval(() => {
  console.log(`Processed ${totalProcessed} documents so far...`);
}, 30000); // Log progress every 30 seconds

// Run the indexing
processDirectory()
  .then(() => {
    clearInterval(progressInterval);
    console.log('Indexing complete!');
    process.exit(0);
  })
  .catch((error) => {
    clearInterval(progressInterval);
    console.error('Fatal error:', error);
    process.exit(1);
  });