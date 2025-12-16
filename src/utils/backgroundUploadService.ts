import {
  FileQueueItem,
  BackgroundUploadQueue,
  UploadQueueStats,
  ChunkData,
  FailedChunk,
} from '@/types/upload';
import {
  parseCSVStream,
  parseTXTStream,
  generateSessionId,
  getFileMetadata,
} from '@/utils/fileParser';
import { uploadChunkWithRetry, callUpdateImportSeqFilter } from '@/utils/uploadService';
import { BASE_URL, UPDATE_IMPORT_SEQ_URL } from '@/utils/constants';

const QUEUE_STORAGE_KEY = 'background_upload_queue';
const QUEUE_UPDATE_EVENT = 'queue_updated';

/**
 * Background Upload Queue Manager
 * Handles multiple file uploads with persistence across browser sessions
 */
class BackgroundUploadManager {
  private queue: BackgroundUploadQueue;
  private isProcessing: boolean = false;
  private currentFileAbortRef: { abort: () => void } | null = null;
  private listeners: Set<() => void> = new Set();
  private consecutiveChunkErrors: number = 0;
  private readonly MAX_CONSECUTIVE_ERRORS = 10;

  constructor() {
    this.queue = this.loadQueue();
    this.startProcessing();

    // Listen for storage changes from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): BackgroundUploadQueue {
    if (typeof window === 'undefined') {
      return { items: [], currentUploadId: null, isPaused: false, lastUpdated: Date.now() };
    }

    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert file data back to File objects (files are lost on reload, mark as failed)
        parsed.items = parsed.items.map((item: any) => {
          // If item was uploading and file is lost (not in memory), mark as failed
          if (item.status === 'uploading' || (item.status === 'pending' && !item.file)) {
            return {
              ...item,
              status: 'failed' as const,
              error: item.error || 'File lost after page reload. Please re-upload the file.',
              file: null
            };
          }
          return item;
        });
        return parsed;
      }
    } catch (error) {
      console.error('Failed to load queue from localStorage:', error);
    }

    return { items: [], currentUploadId: null, isPaused: false, lastUpdated: Date.now() };
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    if (typeof window === 'undefined') return;

    try {
      // Don't save File objects (they can't be serialized)
      const queueToSave = {
        ...this.queue,
        items: this.queue.items.map(item => ({
          ...item,
          file: null, // Remove File object
        })),
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queueToSave));
      this.notifyListeners();

      // Dispatch custom event for cross-tab communication
      window.dispatchEvent(new CustomEvent(QUEUE_UPDATE_EVENT));
    } catch (error) {
      console.error('Failed to save queue to localStorage:', error);
    }
  }

  /**
   * Handle storage changes from other tabs
   */
  private handleStorageChange = (e: StorageEvent) => {
    if (e.key === QUEUE_STORAGE_KEY && e.newValue) {
      try {
        this.queue = JSON.parse(e.newValue);
        this.notifyListeners();
      } catch (error) {
        console.error('Failed to parse storage change:', error);
      }
    }
  };

  /**
   * Add listener for queue updates
   */
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of queue update
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  /**
   * Add files to queue with filename matching
   */
  addFiles(files: File[], apiRecords: any[], allRecords?: any[], filters: Record<string, any> = {}): void {
    const newItems: FileQueueItem[] = files.map(file => {
      const fileName = file.name;
      const fileNameLower = fileName.toLowerCase();
      const fileNameWithoutExtLower = fileName.replace(/\.[^/.]+$/, '').toLowerCase();

      // Check if matched in enabled records
      const matchedRecord = apiRecords.find(record => {
        const recordFileName = record.FileName || '';
        const recordFileNameLower = recordFileName.toLowerCase();

        // Match with or without extension, case-insensitive
        return recordFileNameLower === fileNameLower ||
          recordFileNameLower === fileNameWithoutExtLower ||
          recordFileNameLower.replace(/\.[^/.]+$/, '') === fileNameWithoutExtLower;
      });

      // If not matched in enabled records, check if it exists in all records (disabled)
      let status: FileQueueItem['status'] = 'no_match';
      if (matchedRecord) {
        status = 'pending';
      } else if (allRecords) {
        const disabledMatch = allRecords.find(record => {
          const recordFileName = record.FileName || '';
          const recordFileNameLower = recordFileName.toLowerCase();

          return recordFileNameLower === fileNameLower ||
            recordFileNameLower === fileNameWithoutExtLower ||
            recordFileNameLower.replace(/\.[^/.]+$/, '') === fileNameWithoutExtLower;
        });

        if (disabledMatch) {
          status = 'disabled';
        }
      }

      return {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        fileName,
        fileSize: file.size,
        matchedRecord: matchedRecord || null,
        status,
        progress: 0,
        uploadedRecords: 0,
        totalRecords: 0,
        filters,
      };
    });

    this.queue.items.push(...newItems);
    this.queue.lastUpdated = Date.now();
    this.saveQueue();
    this.startProcessing();
  }

  /**
   * Get queue state
   */
  getQueue(): BackgroundUploadQueue {
    return { ...this.queue };
  }

  /**
   * Get queue statistics
   */
  getStats(): UploadQueueStats {
    const items = this.queue.items;
    return {
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      uploading: items.filter(i => i.status === 'uploading').length,
      success: items.filter(i => i.status === 'success').length,
      failed: items.filter(i => i.status === 'failed').length,
      noMatch: items.filter(i => i.status === 'no_match').length,
      paused: items.filter(i => i.status === 'paused').length,
      disabled: items.filter(i => i.status === 'disabled').length,
    };
  }

  /**
   * Start processing queue
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing || this.queue.isPaused) return;

    this.isProcessing = true;

    while (!this.queue.isPaused) {
      const nextItem = this.queue.items.find(
        item => item.status === 'pending' && item.matchedRecord !== null
      );

      if (!nextItem) break;

      this.queue.currentUploadId = nextItem.id;
      await this.processFile(nextItem);
      this.queue.currentUploadId = null;
    }

    this.isProcessing = false;
    this.saveQueue();
  }

  /**
   * Process a single file
   */
  private async processFile(item: FileQueueItem): Promise<void> {
    if (!item.file || !item.matchedRecord) {
      item.status = 'failed';
      item.error = 'File or matched record not found';
      this.saveQueue();
      return;
    }

    try {
      // Reset consecutive error counter for new file
      this.consecutiveChunkErrors = 0;

      item.status = 'uploading';
      item.startTime = Date.now();
      item.sessionId = generateSessionId();
      this.saveQueue();

      const metadata = getFileMetadata(item.file);
      const fileType = metadata.extension;

      // Determine optimal chunk size
      const chunkSize = this.getOptimalChunkSize(item.file.size);

      if (fileType === 'csv' || fileType === 'txt') {
        await this.parseAndUploadTextFile(item, fileType, chunkSize);
      } else if (fileType === 'xls' || fileType === 'xlsx') {
        await this.parseAndUploadExcelFile(item, chunkSize);
      } else {
        throw new Error('Unsupported file type');
      }

      // Check if there are failed chunks
      if (item.failedChunks && item.failedChunks.length > 0) {
        const totalFailedRecords = item.failedChunks.reduce((sum, fc) => sum + fc.data.length, 0);
        item.status = 'failed';
        item.error = `Upload completed with errors: ${item.failedChunks.length} chunk(s) failed (${totalFailedRecords} records)`;
        item.endTime = Date.now();
      } else {
        item.status = 'success';
        item.endTime = Date.now();
        item.progress = 100;

        // Call UpdateImportSeqFilter API after successful upload
        if (item.matchedRecord?.FileSerialNo) {
          try {
            const updateApiEndpoint = `${BASE_URL}${UPDATE_IMPORT_SEQ_URL}`;
            const fileSeqNo = String(item.matchedRecord.FileSerialNo);
            const xFilter = item.filters || {};
            const userId = item.matchedRecord?.UserId || 'SA';

            console.log('📤 Calling UpdateImportSeqFilter after successful background upload...');

            const updateResult = await callUpdateImportSeqFilter(
              updateApiEndpoint,
              fileSeqNo,
              xFilter,
              userId
            );

            if (updateResult.success) {
              console.log('✅ UpdateImportSeqFilter completed for file:', item.fileName);
            } else {
              console.warn('⚠️ UpdateImportSeqFilter failed for file:', item.fileName, updateResult.error);
            }
          } catch (error: any) {
            console.error('❌ Error calling UpdateImportSeqFilter for file:', item.fileName, error);
          }
        }
      }
    } catch (error: any) {
      item.status = 'failed';
      item.error = error.message || 'Unknown error';
      item.endTime = Date.now();
    }

    this.saveQueue();
  }

  /**
   * Parse and upload text file (CSV/TXT)
   */
  private async parseAndUploadTextFile(
    item: FileQueueItem,
    fileType: string,
    chunkSize: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let chunkIndex = 0;
      // eslint-disable-next-line prefer-const
      let uploadBuffer: any[] = [];
      let headers: string[] = [];
      let totalParsedRecords = 0;

      const onData = async (chunk: any[], chunkHeaders: string[]) => {
        if (this.queue.isPaused) {
          this.currentFileAbortRef?.abort();
          item.status = 'paused';
          this.saveQueue();
          reject(new Error('Upload paused'));
          return;
        }

        if (headers.length === 0 && chunkHeaders.length > 0) {
          headers = chunkHeaders;
        }

        uploadBuffer.push(...chunk);
        totalParsedRecords += chunk.length;
        item.totalRecords = totalParsedRecords;

        if (uploadBuffer.length >= chunkSize) {
          const dataToUpload = uploadBuffer.splice(0, chunkSize);
          await this.uploadChunk(item, dataToUpload, headers, chunkIndex, chunkSize);
          chunkIndex++;
        }

        this.saveQueue();
      };

      const onComplete = async (totalRows: number) => {
        if (uploadBuffer.length > 0) {
          await this.uploadChunk(item, uploadBuffer, headers, chunkIndex, chunkSize);
          chunkIndex++;
        }

        item.totalRecords = totalRows;
        this.saveQueue();
        resolve();
      };

      const onError = (error: Error) => {
        reject(error);
      };

      if (fileType === 'csv') {
        this.currentFileAbortRef = parseCSVStream(
          item.file!,
          onData,
          onComplete,
          onError,
          chunkSize
        );
      } else {
        this.currentFileAbortRef = parseTXTStream(
          item.file!,
          onData,
          onComplete,
          onError,
          chunkSize
        );
      }
    });
  }

  /**
   * Parse and upload Excel file
   */
  private async parseAndUploadExcelFile(
    item: FileQueueItem,
    chunkSize: number
  ): Promise<void> {
    // For Excel files, we need to parse completely first, then upload
    // This is a simplified version - you may want to use the worker approach from FileUploadChunked
    throw new Error('Excel file upload not yet implemented for background service');
  }

  /**
   * Upload a single chunk
   */
  private async uploadChunk(
    item: FileQueueItem,
    data: any[],
    headers: string[],
    chunkIndex: number,
    chunkSize: number
  ): Promise<void> {
    const chunkData: ChunkData = {
      chunkIndex,
      data,
      sessionId: item.sessionId!,
      totalChunks: Math.ceil(item.totalRecords / chunkSize),
      startIndex: chunkIndex * chunkSize,
      endIndex: (chunkIndex + 1) * chunkSize,
    };

    const metadata = {
      selectedRecord: item.matchedRecord,
      filters: item.filters || {},
    };

    const apiEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL || ''}${process.env.NEXT_PUBLIC_UPLOAD_FILE_URL || '/TPLUSNARIMAN/api/ThirdPartyService/ImportLargeFile'}`;

    const result = await uploadChunkWithRetry(
      chunkData,
      apiEndpoint,
      headers,
      3, // maxRetries
      1000, // retryDelay
      metadata
    );

    if (result.success) {
      // Reset consecutive error counter on success
      this.consecutiveChunkErrors = 0;
      item.uploadedRecords += data.length;
      item.progress = item.totalRecords > 0
        ? Math.round((item.uploadedRecords / item.totalRecords) * 100)
        : 0;
    } else {
      // Increment consecutive error counter
      this.consecutiveChunkErrors++;

      if (!item.failedChunks) item.failedChunks = [];
      item.failedChunks.push({
        chunkIndex,
        data,
        error: result.error || 'Unknown error',
        retryCount: result.retryCount,
      });

      // If we hit max consecutive errors, abort the upload
      if (this.consecutiveChunkErrors >= this.MAX_CONSECUTIVE_ERRORS) {
        const errorMsg = `Upload stopped: ${this.MAX_CONSECUTIVE_ERRORS} consecutive chunk failures detected. Please check the data format or API configuration.`;
        item.status = 'failed';
        item.error = errorMsg;
        this.consecutiveChunkErrors = 0; // Reset for next file
        this.saveQueue();
        throw new Error(errorMsg);
      }
    }

    this.saveQueue();
  }

  /**
   * Get optimal chunk size based on file size
   */
  private getOptimalChunkSize(fileSize: number): number {
    if (fileSize < 10 * 1024 * 1024) return 2000; // < 10MB: 2k records
    if (fileSize < 50 * 1024 * 1024) return 3000; // < 50MB: 3k records
    if (fileSize < 100 * 1024 * 1024) return 4000; // < 100MB: 4k records
    return 5000; // >= 100MB: 5k records
  }

  /**
   * Pause queue processing
   */
  pauseQueue(): void {
    this.queue.isPaused = true;
    this.currentFileAbortRef?.abort();
    this.saveQueue();
  }

  /**
   * Resume queue processing
   */
  resumeQueue(): void {
    this.queue.isPaused = false;
    this.saveQueue();
    this.startProcessing();
  }

  /**
   * Remove item from queue
   */
  removeItem(id: string): void {
    this.queue.items = this.queue.items.filter(item => item.id !== id);
    this.saveQueue();
  }

  /**
   * Retry failed item
   */
  retryItem(id: string): void {
    const item = this.queue.items.find(i => i.id === id);
    if (item && (item.status === 'failed' || item.status === 'paused')) {
      item.status = 'pending';
      item.error = undefined;
      item.progress = 0;
      item.uploadedRecords = 0;
      item.totalRecords = 0;
      item.failedChunks = [];
      this.saveQueue();
      this.startProcessing();
    }
  }

  /**
   * Clear completed items
   */
  clearCompleted(): void {
    this.queue.items = this.queue.items.filter(
      item => item.status !== 'success'
    );
    this.saveQueue();
  }

  /**
   * Clear all items
   */
  clearAll(): void {
    this.queue.items = [];
    this.queue.currentUploadId = null;
    this.saveQueue();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.currentFileAbortRef?.abort();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageChange);
    }
    this.listeners.clear();
  }
}

// Singleton instance
let managerInstance: BackgroundUploadManager | null = null;

export const getUploadManager = (): BackgroundUploadManager => {
  if (!managerInstance) {
    managerInstance = new BackgroundUploadManager();
  }
  return managerInstance;
};

export default BackgroundUploadManager;
