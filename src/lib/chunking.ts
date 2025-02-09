// Types for document chunking
interface ChunkMetadata {
  source: string;
  title?: string;           // Make optional to match DocumentMetadata
  chunk_index?: number;     // Make optional to match DocumentMetadata
  total_chunks?: number;    // Make optional to match DocumentMetadata
  source_file?: string;
  [key: string]: string | number | undefined;  // Add index signature to match DocumentMetadata
}

interface Chunk {
  content: string;
  metadata: ChunkMetadata;
}

interface ChunkingOptions {
  maxChunkSize: number;    // Maximum characters per chunk
  minChunkSize: number;    // Minimum characters per chunk
  headerMaxLength: number; // Maximum length for a line to be considered a header
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxChunkSize: 8000,
  minChunkSize: 100,
  headerMaxLength: 50
};

/**
 * Splits text content into chunks based on semantic structure
 */
export function createChunks(
  content: string,
  source: string,
  sourceFile?: string,
  options: Partial<ChunkingOptions> = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: Chunk[] = [];
  
  // First split into sections based on headers
  const sections = content.split(/(?=^.{1,50}$\n\n)/m);
  
  let currentChunk = '';
  let currentTitle = '';

  for (const section of sections) {
    if (!section.trim()) continue;

    const lines = section.split('\n');
    const firstLine = lines[0].trim();

    if (isHeader(firstLine, opts.headerMaxLength)) {
      // Handle existing chunk before starting new section
      if (currentChunk && currentChunk.length >= opts.minChunkSize) {
        chunks.push(createChunkObject(
          currentChunk.trim(),
          source,
          currentTitle,
          chunks.length,
          sourceFile
        ));
      }
      currentTitle = firstLine;
      currentChunk = section;
    } else {
      // Here's the key change: actively split large sections
      if (section.length > opts.maxChunkSize) {
        // First save any existing chunk
        if (currentChunk && currentChunk.length >= opts.minChunkSize) {
          chunks.push(createChunkObject(
            currentChunk.trim(),
            source,
            currentTitle,
            chunks.length,
            sourceFile
          ));
        }
        
        // Split large section into smaller chunks
        let remainingSection = section;
        while (remainingSection.length > opts.maxChunkSize) {
          // Find last period or newline before maxChunkSize
          let splitIndex = remainingSection.lastIndexOf('.', opts.maxChunkSize);
          if (splitIndex === -1) {
            splitIndex = remainingSection.lastIndexOf('\n', opts.maxChunkSize);
          }
          if (splitIndex === -1) {
            splitIndex = opts.maxChunkSize;
          }
          
          const chunk = remainingSection.slice(0, splitIndex + 1);
          if (chunk.length >= opts.minChunkSize) {
            chunks.push(createChunkObject(
              chunk.trim(),
              source,
              currentTitle,
              chunks.length,
              sourceFile
            ));
          }
          
          remainingSection = remainingSection.slice(splitIndex + 1);
        }
        
        // Start new chunk with remaining content
        currentChunk = remainingSection;
      } else if ((currentChunk + '\n' + section).length < opts.maxChunkSize) {
        currentChunk += '\n' + section;
      } else {
        if (currentChunk && currentChunk.length >= opts.minChunkSize) {
          chunks.push(createChunkObject(
            currentChunk.trim(),
            source,
            currentTitle,
            chunks.length,
            sourceFile
          ));
        }
        currentChunk = section;
      }
    }
  }

  // Add final chunk if it exists and meets minimum size
  if (currentChunk && currentChunk.length >= opts.minChunkSize) {
    chunks.push(createChunkObject(
      currentChunk.trim(),
      source,
      currentTitle,
      chunks.length,
      sourceFile
    ));
  }

  // Update total chunks count in metadata
  return chunks.map(chunk => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      total_chunks: chunks.length
    }
  }));
}

/**
 * Determines if a line is likely a header
 */
function isHeader(line: string, maxLength: number): boolean {
  return (
    line.length < maxLength &&
    !line.endsWith('.') &&
    !line.endsWith('?') &&
    !line.endsWith('!')
  );
}

/**
 * Creates a chunk object with metadata
 */
function createChunkObject(
  content: string,
  source: string,
  title: string,
  index: number,
  sourceFile?: string
): Chunk {
  return {
    content,
    metadata: {
      source,
      title,
      chunk_index: index,
      total_chunks: 0, // Will be updated later
      ...(sourceFile && { source_file: sourceFile })
    }
  };
}