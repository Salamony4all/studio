'use server';

import { detectTables } from '@/ai/flows/detect-tables';

export async function extractTableData(pdfDataUri: string) {
  try {
    const result = await detectTables({ pdfDataUri });

    if (!result || !result.tables || result.tables.length === 0) {
      throw new Error('AI response did not contain any tables.');
    }
    
    // The AI returns an array of tables. Each table is an array of row objects.
    // We will take all tables and flatten them into a single array of rows for now.
    // This handles cases where the AI finds one or more tables.
    const allRows = result.tables.flat();

    if (!Array.isArray(allRows) || allRows.length === 0) {
      throw new Error('No table data found or data is in an invalid format.');
    }

    return { data: allRows };

  } catch (error) {
    console.error('Error extracting table data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during table extraction.';
    return { error: errorMessage };
  }
}
