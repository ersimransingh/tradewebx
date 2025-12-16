// Type definitions for file upload system

export interface UploadConfig {
  chunkSize: number;
  maxFileSize: number;
  allowedFileTypes: string[];
  apiEndpoint: string;
  delayBetweenChunks: number;
  maxRetries: number;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  extension: string;
}

export interface UploadProgress {
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  currentChunk: number;
  totalChunks: number;
  percentage: number;
  speed: number; // records per second
  estimatedTimeRemaining: number; // in seconds
  status: 'idle' | 'parsing' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled';
}

export interface ChunkData {
  chunkIndex: number;
  data: any[];
  sessionId: string;
  totalChunks: number;
  startIndex: number;
  endIndex: number;
}

export interface ChunkResult {
  chunkIndex: number;
  success: boolean;
  error?: string;
  recordsProcessed: number;
  retryCount: number;
}

export interface FailedChunk {
  chunkIndex: number;
  data: any[];
  error: string;
  retryCount: number;
}

export interface UploadSummary {
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  totalChunks: number;
  failedChunks: number;
  timeTaken: number; // in seconds
  sessionId: string;
}

export interface ParsedData {
  headers: string[];
  rows: any[];
  totalRows: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Worker message types
export interface WorkerMessage {
  type: 'parse' | 'progress' | 'complete' | 'error';
  data?: any;
  progress?: number;
  error?: string;
}

export interface ExcelParserConfig {
  file: File;
  chunkSize: number;
  sheetName?: string;
}

// Multi-file upload queue types
export type FileUploadStatus = 'pending' | 'uploading' | 'success' | 'failed' | 'no_match' | 'paused' | 'disabled';

export interface FileQueueItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  matchedRecord: any | null; // From API list
  filters?: Record<string, any>;
  status: FileUploadStatus;
  progress: number; // 0-100
  error?: string;
  uploadedRecords: number;
  totalRecords: number;
  startTime?: number;
  endTime?: number;
  sessionId?: string;
  failedChunks?: FailedChunk[];
}

export interface BackgroundUploadQueue {
  items: FileQueueItem[];
  currentUploadId: string | null;
  isPaused: boolean;
  lastUpdated: number;
}

export interface UploadQueueStats {
  total: number;
  pending: number;
  uploading: number;
  success: number;
  failed: number;
  noMatch: number;
  paused: number;
  disabled: number;
}

// Import filter error types (from UpdateImportSeqFilter API response)
export interface ImportFilterErrorRecord {
  tf_Exchange: string;
  tf_Segment: string;
  tf_FileType: string;
  tf_FileName: string;
  tf_Status: string;
  tf_Type: string;
  tf_Code: string;
  tf_Remark: string;
  tf_FileDesc: string;
}

export interface FileImportErrors {
  fileName: string;
  fileSeqNo: string;
  errors: ImportFilterErrorRecord[];
  processStatus: {
    flag: string;
    message: string;
  };
}

export interface ImportErrorsCache {
  files: FileImportErrors[];
  hasErrors: boolean;
}
