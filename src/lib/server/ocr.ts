import { env } from '$env/dynamic/private';

export interface ExtractedContent {
  text: string;
  pageCount?: number;
  sourceType: 'pdf';
}

interface OCRSpaceResponse {
  ParsedResults?: Array<{
    ParsedText: string;
    ErrorMessage?: string;
    ErrorDetails?: string;
  }>;
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string[];
  ErrorDetails?: string;
}

// Constants for file validation
export const MAX_FILE_SIZE_MB = 1;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_PAGES = 3;

/**
 * Extract text from a PDF file using OCR.space API
 * Only supports PDFs up to 1MB and 3 pages
 */
export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ExtractedContent> {
  const apiKey = env.OCR_SPACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('OCR API key not configured. Please set OCR_SPACE_API_KEY environment variable.');
  }

  // Validate file type - PDF only
  if (mimeType !== 'application/pdf') {
    throw new Error('Only PDF files are supported. Please upload a PDF file.');
  }

  try {
    // Convert buffer to base64
    const base64 = buffer.toString('base64');
    const base64File = `data:${mimeType};base64,${base64}`;

    // Prepare form data for OCR.space API
    const formData = new FormData();
    formData.append('base64Image', base64File);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 is better for most documents
    
    // For PDFs, enable multi-page processing
    if (mimeType === 'application/pdf') {
      formData.append('isTable', 'true');
    }

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': apiKey
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`OCR API request failed: ${response.status} ${response.statusText}`);
    }

    const result: OCRSpaceResponse = await response.json();

    if (result.IsErroredOnProcessing || result.OCRExitCode !== 1) {
      const errorMsg = result.ErrorMessage?.join(', ') || result.ErrorDetails || 'Unknown OCR error';
      console.error('OCR.space error:', errorMsg);
      throw new Error(`OCR processing failed: ${errorMsg}`);
    }

    if (!result.ParsedResults || result.ParsedResults.length === 0) {
      throw new Error('No text could be extracted from the file.');
    }

    // Validate page count
    const pageCount = result.ParsedResults.length;
    if (pageCount > MAX_PAGES) {
      throw new Error(`PDF has ${pageCount} pages. Maximum allowed is ${MAX_PAGES} pages.`);
    }

    // Combine text from all pages/results
    const extractedText = result.ParsedResults
      .map(r => r.ParsedText)
      .join('\n\n')
      .trim();

    if (!extractedText) {
      throw new Error('No text could be extracted from the file. The file may be empty or contain only images without text.');
    }

    return {
      text: extractedText,
      pageCount,
      sourceType: 'pdf'
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('OCR extraction error:', error.message);
      throw error;
    }
    console.error('OCR extraction error:', error);
    throw new Error('Failed to extract text from file. Please try again.');
  }
}

/**
 * Clean extracted text for AI processing
 */
export function cleanExtractedText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove page numbers and headers/footers patterns
    .replace(/Page \d+ of \d+/gi, '')
    .replace(/^\d+$/gm, '')
    // Clean up common OCR artifacts
    .replace(/[|\\]/g, '')
    // Normalize line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Validate file size and type for upload
 */
export function validateUploadedFile(
  file: File
): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`
    };
  }

  if (file.type !== 'application/pdf') {
    return {
      valid: false,
      error: 'Only PDF files are supported.'
    };
  }

  return { valid: true };
}
