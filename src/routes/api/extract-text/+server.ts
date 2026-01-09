import { json, error } from '@sveltejs/kit';
import { extractTextFromFile, cleanExtractedText, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, MAX_PAGES } from '$lib/server/ocr';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST({ request, locals }: RequestEvent) {
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw error(400, 'No file provided');
    }

    // Validate file size - 1MB max
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw error(400, `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
    }

    // Validate file type - PDF only
    if (file.type !== 'application/pdf') {
      throw error(400, 'Only PDF files are supported.');
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text
    const result = await extractTextFromFile(buffer, file.type, file.name);

    // Clean the text
    const cleanedText = cleanExtractedText(result.text);

    if (!cleanedText || cleanedText.length < 10) {
      throw error(400, 'Could not extract readable text from the file. Please ensure the document contains clear text or the image is not blurry.');
    }

    return json({
      success: true,
      text: cleanedText,
      sourceType: result.sourceType,
      pageCount: result.pageCount,
      characterCount: cleanedText.length
    });
  } catch (err) {
    console.error('OCR extraction error:', err);
    
    if (err instanceof Error && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }

    throw error(500, err instanceof Error ? err.message : 'Failed to extract text from file');
  }
};
