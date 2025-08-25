'use client';

import * as XLSX from 'xlsx';

type DataObject = { [key: string]: any };

export const exportToExcel = (data: DataObject[], fileName: string): void => {
  if (!data || data.length === 0) {
    console.error("No data to export");
    return;
  }

  // Sanitize file name
  const sanitizedFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const finalFileName = `${sanitizedFileName}.xlsx`;
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  XLSX.writeFile(workbook, finalFileName);
};
