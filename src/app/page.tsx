"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { extractData } from './actions';
import type { ExtractedData } from '@/ai/flows/extract-data-flow';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setExtractedData(null);
    }
  };

  const handleExtract = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        const result = await extractData({ fileDataUri: dataUri });
        if (result) {
          setExtractedData(result);
        } else {
           setError('Could not extract any data. The format may be unsupported.');
        }
      };
      reader.onerror = () => {
        setError('Error reading file.');
        setIsLoading(false);
      }
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 bg-background">
      <div className="w-full max-w-4xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Document Data Extractor
            </CardTitle>
            <CardDescription>
              Upload a file (e.g., PDF, image) to extract tables, lists, prices, and Bill of Quantities (BOQ).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                type="file"
                onChange={handleFileChange}
                className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <Button onClick={handleExtract} disabled={isLoading || !file} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  'Extract Data'
                )}
              </Button>
            </div>
             {error && <p className="mt-4 text-sm text-center text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {extractedData && (
          <div className="mt-8 space-y-8">
            {extractedData.tables?.map((tableData, tableIndex) => (
              <Card key={`table-${tableIndex}`}>
                <CardHeader>
                  <CardTitle>Table {tableIndex + 1}</CardTitle>
                  {tableData.description && <CardDescription>{tableData.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {tableData.headers.map((header, headerIndex) => (
                          <TableHead key={`header-${tableIndex}-${headerIndex}`}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.rows.map((row, rowIndex) => (
                        <TableRow key={`row-${tableIndex}-${rowIndex}`}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={`cell-${tableIndex}-${rowIndex}-${cellIndex}`}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}

            {extractedData.lists?.map((listData, listIndex) => (
              <Card key={`list-${listIndex}`}>
                <CardHeader>
                  <CardTitle>{listData.title || `List ${listIndex + 1}`}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 list-disc list-inside">
                    {listData.items.map((item, itemIndex) => (
                      <li key={`list-item-${listIndex}-${itemIndex}`}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
            
            {extractedData.boqs?.map((boq, boqIndex) => (
              <Card key={`boq-${boqIndex}`}>
                <CardHeader>
                   <CardTitle>{boq.title || `Bill of Quantities ${boqIndex + 1}`}</CardTitle>
                   {boq.description && <CardDescription>{boq.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Unit</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {boq.items.map((item, itemIndex) => (
                                <TableRow key={`boq-item-${boqIndex}-${itemIndex}`}>
                                    <TableCell>{item.itemCode}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{item.unit}</TableCell>
                                    <TableCell className="text-right">{item.rate?.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{item.amount?.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
              </Card>
            ))}

            {extractedData.prices?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Prices</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {extractedData.prices.map((price, priceIndex) => (
                    <Badge variant="secondary" key={`price-${priceIndex}`} className="text-lg">
                      {price}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
