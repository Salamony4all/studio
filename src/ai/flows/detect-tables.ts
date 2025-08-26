'use server';
/**
 * @fileOverview This file defines a Genkit flow for automatically detecting tables in a PDF document.
 *
 * - detectTables - A function that initiates the table detection process.
 * - DetectTablesInput - The input type for the detectTables function, which includes the PDF data URI.
 * - DetectTablesOutput - The return type for the detectTables function, which includes the extracted table data.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectTablesInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      'A PDF document as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type DetectTablesInput = z.infer<typeof DetectTablesInputSchema>;

const DetectTablesOutputSchema = z.object({
  tables: z
    .array(z.array(z.record(z.string(), z.any())))
    .describe(
      'An array of tables found in the document. Each table is an array of objects, where each object represents a row.'
    ),
});
export type DetectTablesOutput = z.infer<typeof DetectTablesOutputSchema>;

export async function detectTables(
  input: DetectTablesInput
): Promise<DetectTablesOutput> {
  return detectTablesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectTablesPrompt',
  input: {schema: DetectTablesInputSchema},
  output: {schema: DetectTablesOutputSchema},
  prompt: `You are an expert in extracting tabular data from PDF documents.
  Your task is to automatically detect all tables within the provided PDF document and extract the data in a clean and structured JSON format.

  - Be thorough: Make sure to extract all data from all rows and columns for every table you find. Do not skip any data.
  - Structure: The output must be a valid JSON object.
  - Identify all tables in the document. For each table, create a JSON array of row objects.
  - The keys of each row object should be the column headers from the table.
  - If the PDF contains multiple tables, your output should contain an array of these table arrays. If only one table is found, it should still be inside a top-level array.

  Here is the PDF document data:
  {{media url=pdfDataUri}}
  `,
});

const detectTablesFlow = ai.defineFlow(
  {
    name: 'detectTablesFlow',
    inputSchema: DetectTablesInputSchema,
    outputSchema: DetectTablesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
