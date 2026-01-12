import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { FileMetadata } from '@/types/upload';

const isNumericLike = (value: any): boolean => {
  const str = value === null || value === undefined ? '' : String(value).trim();
  if (str === '') return false;
  return !isNaN(Number(str));
};

const isDateLike = (value: any): boolean => {
  const str = value === null || value === undefined ? '' : String(value).trim();
  // Support common date formats like 14-NOV-2025 or 2025-11-14
  return /\d{1,2}[-/](?:[A-Za-z]{3}|[01]?\d)[-/]\d{2,4}/.test(str) ||
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str);
};

const shouldTreatRowAsHeader = (firstRow: any[], secondRow?: any[]): boolean => {
  if (firstRow.length === 0) return false;

  const cleaned = firstRow.map(cell => (cell === null || cell === undefined ? '' : String(cell).trim()));
  const duplicates = cleaned.length - new Set(cleaned.map(c => c.toLowerCase())).size;
  const numericOrDateCount = cleaned.filter(cell => isNumericLike(cell) || isDateLike(cell)).length;
  const blankValues = cleaned.filter(cell => cell === '').length;

  // If the row is mostly numbers/dates or has duplicated numeric-looking values, it's likely data not headers
  if (numericOrDateCount >= Math.max(3, Math.ceil(cleaned.length * 0.5))) {
    return false;
  }

  if (duplicates > 0 && (numericOrDateCount + blankValues) > 0) {
    return false;
  }

  if (secondRow && secondRow.length > 0) {
    const secondNumericOrDate = secondRow.filter(cell => isNumericLike(cell) || isDateLike(cell)).length;
    const firstRatio = numericOrDateCount / cleaned.length;
    const secondRatio = secondNumericOrDate / secondRow.length;

    // If both rows look like data, don't treat the first as headers
    if (firstRatio >= 0.4 && secondRatio >= 0.4) {
      return false;
    }

    // If the first row is text heavy but the next row is numeric heavy, the first row is probably headers
    if (firstRatio < 0.3 && secondRatio > 0.5) {
      return true;
    }
  }

  // Default to treating the first row as headers to preserve existing behavior
  return true;
};

const buildHeadersFromRow = (row: any[]): string[] => {
  const seen = new Map<string, number>();
  return row.map((cell, idx) => {
    const base = (cell === null || cell === undefined || String(cell).trim() === '')
      ? `Column${idx + 1}`
      : String(cell).trim();
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count}`;
  });
};

const buildSyntheticHeaders = (length: number): string[] => {
  return Array.from({ length }, (_, idx) => `Column${idx + 1}`);
};

const mapRowToObject = (row: any[], headers: string[]): any => {
  const obj: any = {};
  headers.forEach((header, idx) => {
    obj[header] = row[idx] !== undefined ? row[idx] : '';
  });
  return obj;
};

const parseTextFileStream = (
  file: File,
  onData: (chunk: any[], headers: string[]) => void,
  onComplete: (totalRows: number) => void,
  onError: (error: Error) => void,
  chunkSize: number = 5000,
  delimiter?: string
): { abort: () => void } => {
  let headers: string[] = [];
  let buffer: any[] = [];
  let totalRows = 0;
  let aborted = false;
  const pendingRows: any[][] = [];
  let headerResolved = false;

  const flushBuffer = () => {
    if (buffer.length >= chunkSize) {
      onData([...buffer], headers);
      buffer = [];
    }
  };

  const pushRowObject = (row: any[]) => {
    buffer.push(mapRowToObject(row, headers));
    totalRows++;
    flushBuffer();
  };

  const resolveHeaders = () => {
    if (headerResolved || pendingRows.length === 0) return;

    const firstRow = pendingRows.shift();
    if (!firstRow) return;
    const secondRow = pendingRows[0];
    const useFirstRowAsHeader = shouldTreatRowAsHeader(firstRow, secondRow);

    if (useFirstRowAsHeader) {
      headers = buildHeadersFromRow(firstRow);
    } else {
      headers = buildSyntheticHeaders(firstRow.length);
      pushRowObject(firstRow);
    }

    headerResolved = true;

    while (pendingRows.length > 0) {
      const row = pendingRows.shift();
      if (row) pushRowObject(row);
    }
  };

  Papa.parse(file, {
    header: false,
    skipEmptyLines: true,
    dynamicTyping: true,
    delimiter,
    step: (results: any, parser: any) => {
      if (aborted) {
        parser.abort();
        return;
      }

      const row = results.data as any[];

      if (!row || row.length === 0) {
        return;
      }

      if (!headerResolved) {
        pendingRows.push(row);

        // Wait for at least two rows before deciding, so we don't misclassify data as headers
        if (pendingRows.length >= 2) {
          resolveHeaders();
        }
        return;
      }

      pushRowObject(row);
    },
    complete: () => {
      if (aborted) return;
      resolveHeaders();
      if (buffer.length > 0) {
        onData([...buffer], headers);
      }
      onComplete(totalRows);
    },
    error: (error: Error) => {
      if (aborted) return;
      onError(error);
    },
  });

  return {
    abort: () => {
      aborted = true;
    },
  };
};

/**
 * Get file metadata
 */
export const getFileMetadata = (file: File): FileMetadata => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    extension,
  };
};

/**
 * Validate file before processing
 */
export const validateFile = (
  file: File,
  allowedTypes: string[],
  maxSize: number
): { valid: boolean; error?: string } => {
  const metadata = getFileMetadata(file);

  if (!allowedTypes.includes(metadata.extension)) {
    return {
      valid: false,
      error: `File type .${metadata.extension} is not supported. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
};

/**
 * Parse CSV file using streaming (Papa.parse with step callback)
 * This prevents loading entire file into memory
 */
export const parseCSVStream = (
  file: File,
  onData: (chunk: any[], headers: string[]) => void,
  onComplete: (totalRows: number) => void,
  onError: (error: Error) => void,
  chunkSize: number = 5000
): { abort: () => void } => {
  return parseTextFileStream(
    file,
    onData,
    onComplete,
    onError,
    chunkSize
  );
};

/**
 * Parse TXT file (similar to CSV but with different delimiter)
 */
export const parseTXTStream = (
  file: File,
  onData: (chunk: any[], headers: string[]) => void,
  onComplete: (totalRows: number) => void,
  onError: (error: Error) => void,
  chunkSize: number = 5000,
  delimiter: string = '\t'
): { abort: () => void } => {
  return parseTextFileStream(
    file,
    onData,
    onComplete,
    onError,
    chunkSize,
    delimiter
  );
};

/**
 * Parse Excel file in chunks
 * For large files, this should be called in a Web Worker
 */
export const parseExcelInChunks = async (
  file: File,
  onChunk: (chunk: any[], headers: string[], progress: number) => void,
  chunkSize: number = 5000,
  sheetName?: string
): Promise<{ totalRows: number; headers: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first sheet or specified sheet
        const sheet = sheetName
          ? workbook.Sheets[sheetName]
          : workbook.Sheets[workbook.SheetNames[0]];

        if (!sheet) {
          reject(new Error(`Sheet ${sheetName || 'first sheet'} not found`));
          return;
        }

        // Convert sheet to JSON
        const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
        });

        if (jsonData.length === 0) {
          reject(new Error('No data found in Excel file'));
          return;
        }

        // First row is headers
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1);

        // Send data in chunks
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);

          // Convert array rows to objects with headers
          const chunkObjects = chunk.map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] !== undefined ? row[index] : '';
            });
            return obj;
          });

          const progress = Math.round(((i + chunk.length) / rows.length) * 100);
          onChunk(chunkObjects, headers, progress);
        }

        resolve({ totalRows: rows.length, headers });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format time duration
 */
export const formatDuration = (seconds: number): string => {
  // Handle invalid values (NaN, Infinity, negative, etc.)
  if (!isFinite(seconds) || seconds < 0 || isNaN(seconds)) {
    return 'Calculating...';
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
};

/**
 * Generate unique session ID
 */
export const generateSessionId = (): string => {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Download data as CSV
 */
export const downloadAsCSV = (data: any[], filename: string): void => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Get preview of data (first N rows)
 */
export const getDataPreview = async (
  file: File,
  rowCount: number = 10
): Promise<{ headers: string[]; preview: any[] }> => {
  const metadata = getFileMetadata(file);

  if (metadata.extension === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        preview: rowCount,
        complete: (results) => {
          resolve({
            headers: results.meta.fields || [],
            preview: results.data,
          });
        },
        error: (error) => reject(error),
      });
    });
  } else if (metadata.extension === 'txt') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        preview: rowCount,
        delimiter: '\t',
        complete: (results) => {
          resolve({
            headers: results.meta.fields || [],
            preview: results.data,
          });
        },
        error: (error) => reject(error),
      });
    });
  } else if (['xls', 'xlsx'].includes(metadata.extension)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: '',
          });

          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1, rowCount + 1);

          const preview = rows.map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] !== undefined ? row[index] : '';
            });
            return obj;
          });

          resolve({ headers, preview });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  return Promise.reject(new Error('Unsupported file type'));
};
