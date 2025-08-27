
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { extractData, getImageAsDataUri } from './actions';
import type { ExtractedData } from '@/ai/flows/extract-data-flow';
import { Download, Loader2, FileText, UploadCloud, Image as ImageIcon, X } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';


interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}


export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [showFinalBoq, setShowFinalBoq] = useState(false);

  const [netMargin, setNetMargin] = useState(0);
  const [freight, setFreight] = useState(0);
  const [customs, setCustoms] = useState(0);
  const [installation, setInstallation] = useState(0);
  const [quantityUpscale, setQuantityUpscale] = useState(0);
  
  const [projectName, setProjectName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [imageUris, setImageUris] = useState<Record<string, string>>({});


  useEffect(() => {
    const fetchImageUris = async () => {
        if (extractedData?.boqs) {
            const allItems = extractedData.boqs.flatMap(boq => boq.items);
            const urlsToFetch = allItems
                .map(item => item.imageUrl)
                .filter((url): url is string => !!url && url.startsWith('http') && !imageUris[url]);

            if (urlsToFetch.length > 0) {
                const newImageUris: Record<string, string> = {};
                await Promise.all(urlsToFetch.map(async (url) => {
                    const dataUri = await getImageAsDataUri(url);
                    newImageUris[url] = dataUri;
                }));
                setImageUris(prev => ({...prev, ...newImageUris}));
            }
        }
    };
    fetchImageUris();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractedData]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setExtractedData(null);
      setShowFinalBoq(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
      setExtractedData(null);
      setShowFinalBoq(false);
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
    setShowFinalBoq(false);
    setImageUris({});

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        try {
          const result = await extractData({ fileDataUri: dataUri });
          if (result && (result.boqs?.length || result.tables?.length)) {
            setExtractedData(result);
          } else {
            setError('Could not extract any data. The format may be unsupported or the document empty.');
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
  const originalSubtotal = allBoqItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  
  const costIncreaseFactor = (1 + netMargin / 100 + freight / 100 + customs / 100 + installation / 100);
  const quantityMultiplier = 1 + quantityUpscale;


  const finalBoqItems = allBoqItems.map(item => {
    const newRate = (item.rate || 0) * costIncreaseFactor;
    const newQuantity = item.quantity * quantityMultiplier;
    const newAmount = newQuantity * newRate;
    return {
      ...item,
      quantity: newQuantity,
      rate: newRate,
      amount: newAmount,
    };
  });
  
  const finalSubtotal = finalBoqItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  
  const vatRate = 0.05; // 5% VAT
  const vatAmount = finalSubtotal * vatRate;
  const grandTotal = finalSubtotal + vatAmount;

  const handleExportCsv = () => {
    const escapeCsvCell = (cell: any) => {
        const cellStr = String(cell ?? '').trim();
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
    };

    const headers = ['Sn', 'Item', 'Description', 'Quantity', 'Unit', 'Rate', 'Amount'];
    const rows = finalBoqItems.map((item, index) => [
        index + 1,
        item.itemCode,
        item.description,
        item.quantity,
        item.unit,
        item.rate?.toFixed(2) || '0.00',
        item.amount?.toFixed(2) || '0.00'
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,";

    // Project Details
    csvContent += `Project Name,${escapeCsvCell(projectName)}\n`;
    csvContent += `Contact Person,${escapeCsvCell(contactPerson)}\n`;
    csvContent += `Company Name,${escapeCsvCell(companyName)}\n`;
    csvContent += `Contact Number,${escapeCsvCell(contactNumber)}\n`;
    csvContent += '\n';

    // Table
    csvContent += headers.map(escapeCsvCell).join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(escapeCsvCell).join(',') + '\n';
    });

    // Totals
    csvContent += '\n';
    csvContent += `,,,,,Subtotal,${finalSubtotal.toFixed(2)}\n`;
    csvContent += `,,,,,VAT (${vatRate * 100}%),${vatAmount.toFixed(2)}\n`;
    csvContent += `,,,,,Grand Total,${grandTotal.toFixed(2)}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = projectName ? `${projectName.replace(/\s+/g, '_')}_BOQ.csv` : "Final_BOQ.csv";
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleExportPdf = async () => {
    setIsPdfGenerating(true);
    const doc = new jsPDF() as jsPDFWithAutoTable;
    
    // Add Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Alshaya Enterprise™', 14, 20);
    doc.setFont(undefined, 'normal');


    // Add Project Details
    doc.setFontSize(16);
    doc.text('Bill of Quantities', 14, 45);
    doc.setFontSize(12);
    doc.text(`Project Name: ${projectName}`, 14, 55);
    doc.text(`Contact Person: ${contactPerson}`, 14, 61);
    doc.text(`Company Name: ${companyName}`, 14, 67);
    doc.text(`Contact Number: ${contactNumber}`, 14, 73);

    // Add Table
    const tableColumn = ["Sn", "Image", "Item", "Description", "Quantity", "Unit", "Rate", "Amount"];
    
    const tableRows = finalBoqItems.map((item, index) => {
        let imageCell: any = 'No image';
        if (item.imageUrl) {
            let imageDataUri = item.imageUrl.startsWith('http') ? imageUris[item.imageUrl] : item.imageUrl;
            if(imageDataUri) {
                imageCell = { image: imageDataUri, width: 20 };
            }
        }
        return [
            index + 1,
            imageCell,
            item.itemCode || '-',
            item.description,
            item.quantity,
            item.unit,
            item.rate?.toFixed(2) || '-',
            item.amount?.toFixed(2) || '-'
        ];
    });

    doc.autoTable({
      startY: 80,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [75, 85, 99] }, // gray-600
      styles: { fontSize: 8, valign: 'middle' },
      columnStyles: {
          0: { cellWidth: 8 }, // Sn column
          1: { cellWidth: 22, minCellHeight: 22 }, // Image column
      },
      willDrawCell: (data) => {
        if (data.column.index === 1 && typeof data.cell.raw === 'object' && data.cell.raw?.image) {
            const img = new window.Image();
            img.src = data.cell.raw.image;
            img.onload = () => {
              const aspectRatio = img.width / img.height;
              let imageHeight = (data.cell.width - 4) / aspectRatio;
              if (data.row.height < imageHeight) {
                data.row.height = imageHeight + 4;
              }
            }
        }
      },
      didDrawCell: (data) => {
          if (data.column.index === 1 && typeof data.cell.raw === 'object' && data.cell.raw?.image) {
              const img = new window.Image();
              img.src = data.cell.raw.image;
              img.onload = () => {
                try {
                    const cellWidth = data.cell.width - 4;
                    const cellHeight = data.cell.height - 4;
                    
                    const aspect = img.width / img.height;
                    let imgWidth = cellWidth;
                    let imgHeight = imgWidth / aspect;

                    if (imgHeight > cellHeight) {
                        imgHeight = cellHeight;
                        imgWidth = imgHeight * aspect;
                    }

                    const x = data.cell.x + (data.cell.width - imgWidth) / 2;
                    const y = data.cell.y + (data.cell.height - imgHeight) / 2;
                    
                    const imgFormat = data.cell.raw.image.substring(data.cell.raw.image.indexOf('/') + 1, data.cell.raw.image.indexOf(';'));
                    doc.addImage(data.cell.raw.image, imgFormat.toUpperCase(), x, y, imgWidth, imgHeight);
                
                } catch(e) {
                    console.error("Failed to add image to PDF:", e);
                    const x = data.cell.x + 2;
                    const y = data.cell.y + 2;
                    doc.rect(x, y, data.cell.width - 4, data.cell.height - 4);
                    doc.text("X", x + (data.cell.width - 4) / 2, y + (data.cell.height - 4) / 2, { align: 'center', baseline: 'middle' });
                }
              };
              img.onerror = () => {
                console.error("Failed to load image for PDF");
                const x = data.cell.x + 2;
                const y = data.cell.y + 2;
                doc.rect(x, y, data.cell.width - 4, data.cell.height - 4);
                doc.text("X", x + (data.cell.width - 4) / 2, y + (data.cell.height - 4) / 2, { align: 'center', baseline: 'middle' });
              }
          }
      },
    });

    // Add Totals
    let finalY = (doc as any).autoTable.previous.finalY;
    const rightAlign = doc.internal.pageSize.width - 14;
    doc.setFontSize(10);
    doc.text(`Subtotal: ${finalSubtotal.toFixed(2)}`, rightAlign, finalY + 10, { align: 'right' });
    doc.text(`VAT (${vatRate * 100}%): ${vatAmount.toFixed(2)}`, rightAlign, finalY + 16, { align: 'right' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Grand Total: ${grandTotal.toFixed(2)}`, rightAlign, finalY + 22, { align: 'right' });
    
    finalY += 30;

    // Add Footer
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    doc.setFont(undefined, 'bold');
    doc.text("Regards", 14, finalY);
    finalY += 5;
    doc.setFont(undefined, 'normal');
    doc.text("Mohamed Abdelsalam", 14, finalY);
    finalY += 5;
    doc.text("Sr.Sales Consultant", 14, finalY);
    finalY += 5;
    doc.text("Oman 70 Building , Al-Ghubra,", 14, finalY);
    finalY += 5;
    doc.text("P.O Box 135 , Postal Code 103, Muscat, Oman.", 14, finalY);
    finalY += 5;
    doc.setFont(undefined, 'bold');
    doc.text("Alshaya Enterprises®", 14, finalY);
    finalY += 10;
    doc.setFont(undefined, 'normal');
    doc.text("Phone: (+968) : (+968) 24501943 Ext. 6004", 14, finalY);
    finalY += 5;
    doc.text("Mobile: (+968) 98901384 - 93319809", 14, finalY);
    finalY += 5;
    
    doc.setTextColor(67, 58, 183); // Primary color for links
    doc.textWithLink("www.alshayaenterprises.com", 14, finalY, { url: "http://www.alshayaenterprises.com" });
    finalY += 5;

    const facebookX = 14;
    doc.textWithLink("www.facebook.com/AlshayaEnterprises/", facebookX, finalY, { url: "http://www.facebook.com/AlshayaEnterprises/" });
    const facebookWidth = doc.getTextWidth("www.facebook.com/AlshayaEnterprises/");
    
    doc.setTextColor(0, 0, 0); // Reset color to black
    doc.text("|", facebookX + facebookWidth + 2, finalY);

    doc.setTextColor(67, 58, 183); // Primary color for links
    const instagramX = facebookX + facebookWidth + 5;
    doc.textWithLink("www.instagram.com/alshayaenterprises/", instagramX, finalY, { url: "http://www.instagram.com/alshayaenterprises/" });

    doc.setTextColor(0, 0, 0); // Reset color to black
    finalY += 10;

    const disclaimer = "Disclaimer: This communication doesn’t constitute any binding commitment on behalf of our company and is subject to contract and final board approval in accordance with our internal procedures.";
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    const splitDisclaimer = doc.splitTextToSize(disclaimer, doc.internal.pageSize.width - 28);
    doc.text(splitDisclaimer, 14, finalY);


    const pdfDataUri = doc.output('datauristring');
    setPdfPreviewUrl(pdfDataUri);
    setIsPdfGenerating(false);
  };

  const handleDownloadPdf = () => {
    if (!pdfPreviewUrl) return;
    const link = document.createElement('a');
    link.href = pdfPreviewUrl;
    const fileName = projectName ? `${projectName.replace(/\s+/g, '_')}_BOQ.pdf` : "Final_BOQ.pdf";
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }


  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-8 bg-background">
      <div className="w-full max-w-4xl">
        <Card className="w-full">
          <CardHeader className="items-center text-center">
            <h1 className="text-3xl font-bold">Alshaya Enterprise™</h1>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Estimation Pro
            </CardTitle>
            <CardDescription>
              Upload a file (e.g., PDF, image) to extract tables and Bill of Quantities (BOQ).
            </CardDescription>
          </CardHeader>
          <CardContent>
          <div 
            className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg transition-colors duration-200 ease-in-out ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground">
              <label htmlFor="file-upload" className="font-medium text-primary cursor-pointer hover:underline">
                Click to upload
              </label> or drag and drop a file
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG accepted</p>
            <Input id="file-upload" type="file" className="absolute w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
          </div>
            {file && !isLoading && (
              <div className="mt-4 p-4 border rounded-md flex items-center justify-between bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <Button onClick={() => setFile(null)} variant="ghost" size="sm">Remove</Button>
              </div>
            )}
             <div className="mt-4">
              <Button onClick={handleExtract} disabled={isLoading || !file} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting Data...
                    </>
                  ) : (
                    'Extract Data'
                  )}
                </Button>
            </div>
            {isLoading && (
                <div className="mt-4 w-full space-y-2">
                    <Progress value={undefined} />
                    <p className="text-sm text-center text-muted-foreground animate-pulse">Analyzing your document...</p>
                </div>
            )}
             {error && <p className="mt-4 text-sm text-center text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {extractedData && (
          <div className="mt-8 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>
                  Enter the project and contact information for the export.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input id="project-name" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Enter project name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-person">Contact Person</Label>
                  <Input id="contact-person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Enter name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Enter company name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-number">Contact Number</Label>
                  <Input id="contact-number" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="Enter contact number" />
                </div>
              </CardContent>
            </Card>

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
                   <CardTitle>Original Bill of Quantities</CardTitle>
                   {extractedData.boqs?.[0]?.description && <CardDescription>{extractedData.boqs?.[0].description}</CardDescription>}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sn</TableHead>
                                <TableHead>Image</TableHead>
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
                                    <TableCell>{itemIndex + 1}</TableCell>
                                    <TableCell>
                                        {item.imageUrl ? (
                                            <Image src={item.imageUrl} alt={item.description} width={40} height={40} className="rounded-md object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                        )}
                                    </TableCell>
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
                    <div className="flex justify-between w-full max-w-xs font-bold text-lg border-t pt-2 mt-2">
                        <span>Subtotal</span>
                        <span>{originalSubtotal.toFixed(2)}</span>
                    </div>
                </CardFooter>
              </Card>
            )}

            {allBoqItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Cost &amp; Margin Preferences</CardTitle>
                        <CardDescription>Adjust the sliders to set your preferences for additional costs and margins.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                             <div className="flex justify-between items-center">
                                <Label htmlFor="quantity-upscale">Quantity Upscale</Label>
                                <span className="text-sm font-medium">{quantityUpscale > 0 ? '+' : ''}{quantityUpscale}x</span>
                            </div>
                            <Slider id="quantity-upscale" value={[quantityUpscale]} onValueChange={([v]) => setQuantityUpscale(v)} min={-10} max={10} step={1} />
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button onClick={() => setShowFinalBoq(true)}>Generate BOQ</Button>
                    </CardFooter>
                </Card>
            )}

            {showFinalBoq && allBoqItems.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                     <CardTitle>Final Bill of Quantities</CardTitle>
                     <CardDescription>This BOQ includes the additional costs and margins you specified, distributed across each item.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Sn</TableHead>
                                  <TableHead>Image</TableHead>
                                  <TableHead>Item</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="text-right">Quantity</TableHead>
                                  <TableHead>Unit</TableHead>
                                  <TableHead className="text-right">Rate</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {finalBoqItems.map((item, itemIndex) => (
                                  <TableRow key={`final-boq-item-${itemIndex}`}>
                                      <TableCell>{itemIndex + 1}</TableCell>
                                      <TableCell>
                                          {item.imageUrl ? (
                                              <Image src={item.imageUrl} alt={item.description} width={40} height={40} className="rounded-md object-cover" />
                                          ) : (
                                              <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                                                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                              </div>
                                          )}
                                      </TableCell>
                                      <TableCell>{item.itemCode}</TableCell>
                                      <TableCell>{item.description}</TableCell>
                                      <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
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
                          <span className="font-medium">{finalSubtotal.toFixed(2)}</span>
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
                <Card>
                    <CardHeader>
                        <CardTitle>Export</CardTitle>
                        <CardDescription>Download the final Bill of Quantities.</CardDescription>
                    </CardHeader>
                    <CardContent className='flex gap-4'>
                        <Button onClick={handleExportCsv}>
                            <Download className="mr-2 h-4 w-4" />
                            Export as CSV
                        </Button>
                        <Button 
                            onClick={handleExportPdf} 
                            variant="outline" 
                            disabled={isPdfGenerating}
                        >
                            {isPdfGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Export as PDF
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>

       <Dialog open={!!pdfPreviewUrl} onOpenChange={(isOpen) => !isOpen && setPdfPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>PDF Preview</DialogTitle>
             <DialogClose asChild>
                <Button variant="ghost" size="icon" className="absolute top-4 right-4">
                  <X className="h-4 w-4" />
                </Button>
            </DialogClose>
          </DialogHeader>
          <div className="flex-1 w-full h-full">
            {pdfPreviewUrl && (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            )}
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setPdfPreviewUrl(null)}>Close</Button>
             <Button onClick={handleDownloadPdf}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
