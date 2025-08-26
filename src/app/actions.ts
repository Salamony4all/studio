'use server';

import { detectTables } from '@/ai/flows/detect-tables';

export async function extractTableData(pdfDataUri: string) {
  try {
    const result = await detectTables({ pdfDataUri });

    if (!result || !result.tables || result.tables.length === 0) {
      throw new Error('AI response did not contain table data.');
    }

    // Since we expect multiple tables, we will work with the first one for now.
    // In the future, we can add UI to select which table to display.
    const firstTable = result.tables[0];
    
    if (!Array.isArray(firstTable)) {
      throw new Error('Extracted data is not in the expected array format.');
    }

    return { data: firstTable };

  } catch (error) {
    console.error('Error extracting table data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during table extraction.';
    return { error: errorMessage };
  }
}
