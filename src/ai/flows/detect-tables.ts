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
      'A PDF document as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'    ),
});
export type DetectTablesInput = z.infer<typeof DetectTablesInputSchema>;

const DetectTablesOutputSchema = z.object({
  tableData: z
    .string()
    .describe('The extracted table data in a suitable format, such as JSON or CSV.'),
});
export type DetectTablesOutput = z.infer<typeof DetectTablesOutputSchema>;

export async function detectTables(input: DetectTablesInput): Promise<DetectTablesOutput> {
  return detectTablesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectTablesPrompt',
  input: {schema: DetectTablesInputSchema},
  output: {schema: DetectTablesOutputSchema},
  prompt: `You are an expert in extracting tabular data from PDF documents.
  Your task is to automatically detect tables within the provided PDF document and extract the data in a clean and structured format.
  Respond ONLY with valid JSON.

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
