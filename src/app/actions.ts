'use server';

import { extractDataFromFile, ExtractDataInput } from '@/ai/flows/extract-data-flow';

export async function extractData(input: ExtractDataInput) {
  return await extractDataFromFile(input);
}

export async function getImageAsDataUri(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${blob.type};base64,${base64}`;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to get image as data URI');
  }
}
