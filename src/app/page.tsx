"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { extractData } from './actions';
import type { ExtractedData } from '@/ai/flows/extract-data-flow';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [netMargin, setNetMargin] = useState(0);
  const [freight, setFreight] = useState(0);
  const [customs, setCustoms] = useState(0);
  const [installation, setInstallation] = useState(0);


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
        try {
          const result = await extractData({ fileDataUri: dataUri });
          if (result) {
            setExtractedData(result);
          } else {
            setError('Could not extract any data. The format may be unsupported.');
          }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during extraction.';
            setError(`Server error: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Error reading file.');
        setIsLoading(false);
      }
      reader.readAsDataURL(file);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const allBoqItems = extractedData?.boqs?.flatMap(boq => boq.items) || [];
  const subtotal = allBoqItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  
  const netMarginAmount = subtotal * (netMargin / 100);
  const freightAmount = subtotal * (freight / 100);
  const customsAmount = subtotal * (customs / 100);
  const installationAmount = subtotal * (installation / 100);

  const totalBeforeVat = subtotal + netMarginAmount + freightAmount + customsAmount + installationAmount;
  
  const vatRate = 0.15; // 15% VAT
  const vatAmount = totalBeforeVat * vatRate;
  const grandTotal = totalBeforeVat + vatAmount;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 bg-background">
      <div className="w-full max-w-4xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Tabula Extract
            </CardTitle>
            <CardDescription>
              Upload a file (e.g., PDF, image) to extract tables and Bill of Quantities (BOQ).
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
            {isLoading && (
                <div className="mt-4 w-full">
                    <div className="relative h-2 w-full bg-primary/20 overflow-hidden rounded-full">
                        <div 
                            className="absolute top-0 right-full h-full w-full bg-primary animate-pulse" 
                            style={{ animation: 'shimmer 2s infinite' }}
                        ></div>
                    </div>
                    <style jsx>{`
                        @keyframes shimmer {
                            0% { transform: translateX(-100%) scaleX(0.1); }
                            50% { transform: translateX(0) scaleX(0.8); }
                            100% { transform: translateX(100%) scaleX(0.1); }
                        }
                        .animate-pulse {
                           animation-name: shimmer;
                           animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
                        }
                    `}</style>
                </div>
            )}
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
            
            {allBoqItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Cost &amp; Margin Preferences</CardTitle>
                        <CardDescription>Adjust the sliders to set your preferences for additional costs and margins.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="net-margin">Net Margin</Label>
                                <span className="text-sm font-medium">{netMargin}%</span>
                            </div>
                            <Slider id="net-margin" value={[netMargin]} onValueChange={([v]) => setNetMargin(v)} max={100} step={1} />
                        </div>
                         <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="freight">Freight</Label>
                                <span className="text-sm font-medium">{freight}%</span>
                            </div>
                            <Slider id="freight" value={[freight]} onValueChange={([v]) => setFreight(v)} max={100} step={1} />
                        </div>
                         <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                <Label htmlFor="customs">Custom Clearances</Label>
                                <span className="text-sm font-medium">{customs}%</span>
                             </div>
                            <Slider id="customs" value={[customs]} onValueChange={([v]) => setCustoms(v)} max={100} step={1} />
                        </div>
                         <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                <Label htmlFor="installation">Installation</Label>
                                <span className="text-sm font-medium">{installation}%</span>
                            </div>
                            <Slider id="installation" value={[installation]} onValueChange={([v]) => setInstallation(v)} max={100} step={1} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {allBoqItems.length > 0 && (
              <Card>
                <CardHeader>
                   <CardTitle>Bill of Quantities</CardTitle>
                   {extractedData.boqs?.[0]?.description && <CardDescription>{extractedData.boqs?.[0].description}</CardDescription>}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allBoqItems.map((item, itemIndex) => (
                                <TableRow key={`boq-item-${itemIndex}`}>
                                    <TableCell>{item.itemCode}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell>{item.unit}</TableCell>
                                    <TableCell className="text-right">{item.rate?.toFixed(2) || '-'}</TableCell>
                                    <TableCell className="text-right">{item.amount?.toFixed(2) || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                 <CardFooter className="flex flex-col items-end gap-2 p-6">
                    <div className="flex justify-between w-full max-w-xs">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-xs">
                        <span className="text-muted-foreground">Net Margin ({netMargin}%)</span>
                        <span className="font-medium">{netMarginAmount.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between w-full max-w-xs">
                        <span className="text-muted-foreground">Freight ({freight}%)</span>
                        <span className="font-medium">{freightAmount.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between w-full max-w-xs">
                        <span className="text-muted-foreground">Customs ({customs}%)</span>
                        <span className="font-medium">{customsAmount.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between w-full max-w-xs">
                        <span className="text-muted-foreground">Installation ({installation}%)</span>
                        <span className="font-medium">{installationAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-xs">
                        <span className="text-muted-foreground">VAT ({vatRate * 100}%)</span>
                        <span className="font-medium">{vatAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-xs font-bold text-lg border-t pt-2 mt-2">
                        <span>Grand Total</span>
                        <span>{grandTotal.toFixed(2)}</span>
                    </div>
                </CardFooter>
              </Card>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
