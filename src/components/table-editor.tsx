'use client';

import { useState, useMemo } from 'react';
import { FileDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { exportToExcel } from '@/lib/excel';

interface TableEditorProps {
  initialData: any[];
  fileName: string;
  onReset: () => void;
}

export default function TableEditor({ initialData, fileName, onReset }: TableEditorProps) {
  const [editedData, setEditedData] = useState([...initialData]);

  const headers = useMemo(() => {
    if (editedData.length === 0) return [];
    return Object.keys(editedData[0]);
  }, [editedData]);

  const handleCellChange = (rowIndex: number, header: string, value: string) => {
    const newData = [...editedData];
    newData[rowIndex][header] = value;
    setEditedData(newData);
  };

  const handleExport = () => {
    const exportFileName = fileName.endsWith('.pdf') ? fileName.slice(0, -4) : fileName;
    exportToExcel(editedData, exportFileName);
  };

  return (
    <Card className="w-full animate-in fade-in-50 duration-500">
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <CardTitle className="text-2xl">Extracted Table</CardTitle>
          <CardDescription>File: {fileName}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset}>
            <RefreshCw className="mr-2" />
            Start Over
          </Button>
          <Button onClick={handleExport} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <FileDown className="mr-2" />
            Export to Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[50vh] w-full border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header} className="font-bold">{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {headers.map((header) => (
                    <TableCell key={header}>
                      <Input
                        type="text"
                        value={row[header] || ''}
                        onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                        className="border-none focus-visible:ring-1 focus-visible:ring-ring p-1 h-auto"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
