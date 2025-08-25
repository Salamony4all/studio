'use server';

import { detectTables } from '@/ai/flows/detect-tables';

export async function extractTableData(pdfDataUri: string) {
  try {
    const result = await detectTables({ pdfDataUri });

    if (!result || !result.tableData) {
      throw new Error('AI response did not contain table data.');
    }
    
    // The AI is prompted to return valid JSON, so we parse it here.
    const parsedData = JSON.parse(result.tableData);
    
    if (!Array.isArray(parsedData)) {
      throw new Error('Extracted data is not in the expected array format.');
    }

    return { data: parsedData };

  } catch (error) {
    console.error('Error extracting table data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during table extraction.';
    return { error: errorMessage };
  }
}
