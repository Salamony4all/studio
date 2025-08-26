'use server';
/**
 * @fileOverview A flow for extracting structured data from a document and generating images for BOQ items.
 * 
 * - extractDataFromFile: A function that handles the data extraction and image generation process.
 * - ExtractDataInput: The input type for the extractDataFromFile function.
 * - ExtractedData: The return type for the extractDataFromFile function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { generate } from 'genkit';

const ExtractDataInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A file (e.g., PDF, image) encoded as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractDataInput = z.infer<typeof ExtractDataInputSchema>;

const TableSchema = z.object({
  headers: z.array(z.string()).describe('The headers of the table.'),
  rows: z.array(z.array(z.string())).describe('The rows of the table, where each inner array represents a row.'),
  description: z.string().optional().describe('A brief description of the table content.'),
});

const ListSchema = z.object({
    title: z.string().optional().describe('The title of the list.'),
    items: z.array(z.string()).describe('The items in the list.'),
});

const BOQItemSchema = z.object({
    itemCode: z.string().optional().describe('The item code or number.'),
    description: z.string().describe('The description of the work or item.'),
    quantity: z.number().describe('The quantity of the item.'),
    unit: z.string().describe('The unit of measurement (e.g., sqm, nos, kg).'),
    rate: z.number().optional().describe('The rate per unit.'),
    amount: z.number().optional().describe('The total amount for the item (quantity * rate).'),
    image: z.string().optional().describe('A data URI of a generated image representing the item.')
});

const BOQSchema = z.object({
    title: z.string().optional().describe('The title of the Bill of Quantities.'),
    description: z.string().optional().describe('A brief description of the BOQ.'),
    items: z.array(BOQItemSchema).describe('The items in the Bill of Quantities.'),
});

const ExtractedDataSchema = z.object({
  tables: z.array(TableSchema).optional().describe('All tables found in the document.'),
  lists: z.array(ListSchema).optional().describe('All lists found in the document.'),
  prices: z.array(z.string()).optional().describe('Any individual prices or costs mentioned, formatted with currency symbols.'),
  boqs: z.array(BOQSchema).optional().describe('Any Bill of Quantities (BOQ) found in the document.'),
});
export type ExtractedData = z.infer<typeof ExtractedDataSchema>;


export async function extractDataFromFile(input: ExtractDataInput): Promise<ExtractedData> {
  return extractDataFlow(input);
}

const extractDataPrompt = ai.definePrompt({
  name: 'extractDataPrompt',
  input: { schema: ExtractDataInputSchema },
  output: { schema: ExtractedDataSchema },
  prompt: `You are an expert data extraction agent. Your task is to analyze the provided document and extract all structured information with high accuracy.

Analyze the document provided via the data URI and extract the following information:
1.  **Tables**: Identify all tables. For each table, extract the column headers and all corresponding rows.
2.  **Lists**: Identify all bulleted or numbered lists. For each list, extract its title (if available) and all items.
3.  **Prices**: Identify all monetary values mentioned in the document. Extract them exactly as they appear, including currency symbols.
4.  **Bill of Quantities (BOQs)**: Identify any section that resembles a Bill of Quantities. A BOQ typically has columns for Item No., Description, Quantity, Unit, Rate, and Amount. Extract all items from each BOQ you find. If a value is not present for a field (e.g., rate or amount), omit it, but always extract the description, quantity, and unit.

Return the extracted data in the specified JSON format. Ensure all data is included and accurately represented. Do not generate images yet.

Document: {{media url=fileDataUri}}`,
});

const extractDataFlow = ai.defineFlow(
  {
    name: 'extractDataFlow',
    inputSchema: ExtractDataInputSchema,
    outputSchema: ExtractedDataSchema,
  },
  async (input) => {
    // First, extract all the data from the document.
    const { output: extractedData } = await extractDataPrompt(input);

    if (!extractedData || !extractedData.boqs) {
      return extractedData!;
    }

    // Now, for each BOQ item, generate an image in parallel.
    const updatedBoqs = await Promise.all(
      extractedData.boqs.map(async (boq) => {
        const updatedItems = await Promise.all(
          boq.items.map(async (item) => {
            try {
              const { media } = await generate({
                model: 'googleai/imagen-4.0-fast-generate-001',
                prompt: `Generate a photorealistic image of the following construction or building item: ${item.description}`,
                config: {
                  aspectRatio: "1:1",
                }
              });
              return { ...item, image: media.url };
            } catch (e) {
              console.error(`Failed to generate image for item: ${item.description}`, e);
              // If image generation fails, just return the item without an image.
              return item;
            }
          })
        );
        return { ...boq, items: updatedItems };
      })
    );

    return {
      ...extractedData,
      boqs: updatedBoqs,
    };
  }
);
