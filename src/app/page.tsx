'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Loader2, FileUp, TableProperties, CircleX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { extractTableData } from '@/app/actions';
import TableEditor from '@/components/table-editor';

type Status = 'idle' | 'processing' | 'success' | 'error';

export default function Home() {
  const [status, setStatus] = useState<Status>('idle');
  const [tableData, setTableData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleReset = () => {
    setStatus('idle');
    setTableData([]);
    setFileName(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload a valid PDF file.',
      });
      return;
    }

    setFileName(file.name);
    setStatus('processing');
    setProgress(30);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const pdfDataUri = reader.result as string;
        setProgress(60);
        const result = await extractTableData(pdfDataUri);

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          setTableData(result.data);
          setProgress(100);
          setStatus('success');
        } else {
          throw new Error('No table data found or data is in an invalid format.');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({
          variant: 'destructive',
          title: 'Extraction Failed',
          description: errorMessage,
        });
        setStatus('error');
        setProgress(0);
      }
    };
    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: 'File Read Error',
        description: 'Could not read the selected file.',
      });
      setStatus('error');
      setProgress(0);
    };
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileChange(e.target.files[0]);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-background">
      <header className="text-center mb-8">
        <div className="flex justify-center items-center gap-3 mb-2">
          <TableProperties className="w-10 h-10 text-primary" />
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800">
            Tabula Extract
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Effortlessly extract clean tables from your PDFs and export to Excel.
        </p>
      </header>

      <main className="w-full max-w-4xl">
        {status === 'success' ? (
          <TableEditor initialData={tableData} fileName={fileName!} onReset={handleReset} />
        ) : (
          <Card
            className="w-full"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <CardContent className="p-6">
              <div
                className={`flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-lg text-center transition-colors
                  ${status === 'processing' ? 'border-primary/50' : 'border-gray-300 hover:border-primary'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInput}
                  accept=".pdf"
                  className="hidden"
                  disabled={status === 'processing'}
                />

                {status === 'processing' ? (
                  <>
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <p className="text-lg font-medium text-primary">Processing your PDF...</p>
                    <p className="text-muted-foreground mb-4">{fileName}</p>
                    <Progress value={progress} className="w-full max-w-sm" />
                  </>
                ) : status === 'error' ? (
                   <>
                    <CircleX className="w-12 h-12 text-destructive mb-4" />
                    <p className="text-lg font-medium text-destructive">An error occurred.</p>
                    <p className="text-muted-foreground mb-4">Please try another file.</p>
                    <Button onClick={handleReset}>Try Again</Button>
                   </>
                ) : (
                  <>
                    <FileUp className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-600">
                      Drag & drop a PDF here, or{' '}
                      <span className="text-primary font-semibold cursor-pointer">
                        click to upload
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF files only, up to 10MB.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="text-center mt-8">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Tabula Extract. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
