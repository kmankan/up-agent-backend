import * as fs from 'fs/promises';
import * as path from 'path';

async function combineTextFiles(inputDirectory: string, outputFile: string): Promise<void> {
    try {
        // Get all files in directory
        const files = await fs.readdir(inputDirectory);
        
        // Filter for .txt files and sort them
        const txtFiles = files.filter(file => file.endsWith('.txt')).sort();
        
        // Create a string to store all content
        let combinedContent = '';
        
        // Read each file
        for (const filename of txtFiles) {
            const filePath = path.join(inputDirectory, filename);
            
            // Add file header
            combinedContent += `\n=== ${filename} ===\n\n`;
            
            // Read and append file content
            const content = await fs.readFile(filePath, 'utf-8');
            combinedContent += content + '\n';
        }
        
        // Write everything to output file
        await fs.writeFile(outputFile, combinedContent, 'utf-8');
        
        console.log('Files combined successfully!');
    } catch (error) {
        console.error('Error combining files:', error);
    }
}

// Usage
const inputDir = "src/lib/scraped_content";
const outputFile = "src/lib/scraped_content/combined_content.txt";

combineTextFiles(inputDir, outputFile);