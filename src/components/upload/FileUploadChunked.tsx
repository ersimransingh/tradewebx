"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaUpload, FaFile, FaCheck, FaTimes, FaRedo, FaDownload, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  UploadProgress,
  ChunkData,
  ChunkResult,
  FailedChunk,
  UploadSummary,
  FileMetadata,
  FileImportErrors,
  ImportFilterErrorRecord,
} from '@/types/upload';
import {
  validateFile,
  getFileMetadata,
  formatFileSize,
  formatDuration,
  generateSessionId,
  parseCSVStream,
  parseTXTStream,
  downloadAsCSV,
  getDataPreview,
} from '@/utils/fileParser';
import {
  uploadChunksSequentially,
  calculateUploadStats,
  createChunks,
  uploadChunkWithRetry,
  callUpdateImportSeqFilter,
} from '@/utils/uploadService';
import { BASE_URL, UPDATE_IMPORT_SEQ_URL } from '@/utils/constants';
import { useTheme } from '@/context/ThemeContext';
import ImportErrorsModal from './ImportErrorsModal';

interface FileUploadChunkedProps {
  apiEndpoint: string;
  chunkSize?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  delayBetweenChunks?: number;
  maxRetries?: number;
  onUploadComplete?: (summary: UploadSummary) => void;
  onUploadError?: (error: string) => void;
  metadata?: {
    filters?: Record<string, any>;
    selectedRecord?: any;
    [key: string]: any;
  };
}

const FileUploadChunked: React.FC<FileUploadChunkedProps> = ({
  apiEndpoint,
  chunkSize = 10000, // Increased default for large files
  maxFileSize = 3 * 1024 * 1024 * 1024, // 3GB default
  allowedFileTypes = ['csv', 'txt', 'xls', 'xlsx'],
  delayBetweenChunks = 50, // Reduced delay for faster uploads
  maxRetries = 3,
  onUploadComplete,
  onUploadError,
  metadata,
}) => {
  const { colors } = useTheme();

  // Dynamic chunk size based on file size - MAX 5000 for memory safety
  const getOptimalChunkSize = (fileSize: number): number => {
    // For very large files, use smaller chunks to avoid memory issues
    if (fileSize < 10 * 1024 * 1024) return 2000; // < 10MB: 2k records
    if (fileSize < 50 * 1024 * 1024) return 3000; // < 50MB: 3k records
    if (fileSize < 100 * 1024 * 1024) return 4000; // < 100MB: 4k records
    return 5000; // >= 100MB: 5k records MAX for memory safety
  };

  // State management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
  const [dynamicChunkSize, setDynamicChunkSize] = useState<number>(chunkSize);
  const [progress, setProgress] = useState<UploadProgress>({
    totalRecords: 0,
    processedRecords: 0,
    failedRecords: 0,
    currentChunk: 0,
    totalChunks: 0,
    percentage: 0,
    speed: 0,
    estimatedTimeRemaining: 0,
    status: 'idle',
  });
  const [failedChunks, setFailedChunks] = useState<FailedChunk[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: any[] }>({ headers: [], rows: [] });
  const [summary, setSummary] = useState<UploadSummary | null>(null);

  // Import errors state for the modal
  const [importErrors, setImportErrors] = useState<FileImportErrors[]>([]);
  const [showImportErrorsModal, setShowImportErrorsModal] = useState(false);

  // Refs
  const parserAbortRef = useRef<{ abort: () => void } | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const shouldContinueRef = useRef(true);
  const allDataRef = useRef<any[]>([]);
  const headersRef = useRef<string[]>([]);
  const startTimeRef = useRef<number>(0);
  const processedCountRef = useRef<number>(0);
  const completedChunksRef = useRef<number>(0);
  const totalChunksRef = useRef<number>(0);
  const uploadedRecordsRef = useRef<number>(0);

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const validation = validateFile(file, allowedFileTypes, maxFileSize);

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    const metadata = getFileMetadata(file);
    const optimalChunkSize = getOptimalChunkSize(file.size);

    setSelectedFile(file);
    setFileMetadata(metadata);
    setDynamicChunkSize(optimalChunkSize);
    setProgress({
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      currentChunk: 0,
      totalChunks: 0,
      percentage: 0,
      speed: 0,
      estimatedTimeRemaining: 0,
      status: 'idle',
    });
    setFailedChunks([]);
    setSummary(null);
    allDataRef.current = [];
    headersRef.current = [];

    // Show info about optimal chunk size for large files
    if (file.size > 100 * 1024 * 1024) {
      toast.info(`Large file detected! Using optimized chunk size: ${optimalChunkSize.toLocaleString()} records per chunk`);
    }
  }, [allowedFileTypes, maxFileSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    disabled: progress.status === 'parsing' || progress.status === 'uploading',
  });

  // Load preview
  const loadPreview = async () => {
    if (!selectedFile) return;

    try {
      const preview = await getDataPreview(selectedFile, 10);
      setPreviewData({ headers: preview.headers, rows: preview.preview });
      setShowPreview(true);
    } catch (error: any) {
      toast.error(`Failed to load preview: ${error.message}`);
    }
  };

  // Parse CSV/TXT files with SEQUENTIAL streaming upload
  const parseTextFile = (file: File, fileType: string) => {
    setProgress(prev => ({ ...prev, status: 'parsing' }));
    const currentSessionId = generateSessionId();
    setSessionId(currentSessionId);
    allDataRef.current = [];
    headersRef.current = [];

    let chunkIndex = 0;
    let uploadBuffer: any[] = [];
    let totalParsedRecords = 0;
    shouldContinueRef.current = true;
    setIsPaused(false);
    startTimeRef.current = Date.now();
    processedCountRef.current = 0;
    completedChunksRef.current = 0;
    uploadedRecordsRef.current = 0;

    const onData = async (chunk: any[], headers: string[]) => {
      // Store headers from first chunk
      if (headersRef.current.length === 0 && headers.length > 0) {
        headersRef.current = headers;
      }

      // Add to upload buffer instead of storing all data
      uploadBuffer.push(...chunk);
      totalParsedRecords += chunk.length;

      // Update parsing progress
      setProgress(prev => ({
        ...prev,
        totalRecords: totalParsedRecords,
        status: 'parsing',
      }));

      // When buffer reaches chunk size, upload SEQUENTIALLY (wait for completion)
      if (uploadBuffer.length >= dynamicChunkSize) {
        const dataToUpload = uploadBuffer.splice(0, dynamicChunkSize);

        // WAIT for upload to complete before continuing
        await uploadChunkSequential(dataToUpload, chunkIndex, currentSessionId, totalParsedRecords);
        chunkIndex++;

        // Clear memory and force garbage collection hint
        dataToUpload.length = 0;

        // Add delay to allow GC
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    const onComplete = async (totalRows: number) => {
      // Upload any remaining data in buffer
      if (uploadBuffer.length > 0) {
        await uploadChunkSequential(uploadBuffer, chunkIndex, currentSessionId, totalRows);
        chunkIndex++;
      }

      // Clear buffer
      uploadBuffer.length = 0;
      uploadBuffer = [];

      // Set final total chunks
      totalChunksRef.current = chunkIndex;

      setProgress(prev => ({
        ...prev,
        totalRecords: totalRows,
        totalChunks: chunkIndex,
        status: 'completed',
      }));

      // Check if all uploads are complete
      if (completedChunksRef.current === chunkIndex) {
        handleUploadCompletion(currentSessionId, totalRows);
      }

      toast.success(`Upload completed! ${totalRows.toLocaleString()} records processed.`);
    };

    const onError = (error: Error) => {
      toast.error(`Parsing error: ${error.message}`);
      setProgress(prev => ({ ...prev, status: 'error' }));
    };

    if (fileType === 'csv') {
      parserAbortRef.current = parseCSVStream(file, onData, onComplete, onError, dynamicChunkSize);
    } else {
      parserAbortRef.current = parseTXTStream(file, onData, onComplete, onError, dynamicChunkSize);
    }
  };

  // Upload chunk sequentially with proper waiting and memory management
  const uploadChunkSequential = async (data: any[], index: number, sessionId: string, totalRecords: number) => {
    if (!shouldContinueRef.current) return;

    const chunkData: ChunkData = {
      chunkIndex: index,
      data: data,
      sessionId: sessionId,
      totalChunks: Math.ceil(totalRecords / dynamicChunkSize),
      startIndex: index * dynamicChunkSize,
      endIndex: (index + 1) * dynamicChunkSize,
    };

    try {
      const result = await uploadChunkWithRetry(
        chunkData,
        apiEndpoint,
        headersRef.current,
        maxRetries,
        1000,
        metadata
      );

      // Update completed chunk count
      completedChunksRef.current += 1;

      // Update progress
      const recordsInChunk = data.length;
      uploadedRecordsRef.current += recordsInChunk;
      processedCountRef.current += recordsInChunk;

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const speed = elapsed > 0 ? processedCountRef.current / elapsed : 0;
      const remainingRecords = totalRecords - processedCountRef.current;
      const remaining = speed > 0 ? remainingRecords / speed : 0;

      setProgress(prev => ({
        ...prev,
        processedRecords: processedCountRef.current,
        currentChunk: index + 1,
        percentage: totalRecords > 0 ? Math.round((processedCountRef.current / totalRecords) * 100) : 0,
        speed: Math.round(speed),
        estimatedTimeRemaining: isFinite(remaining) ? remaining : 0,
        failedRecords: result.success ? prev.failedRecords : prev.failedRecords + recordsInChunk,
        status: 'uploading',
      }));

      if (!result.success) {
        setFailedChunks(prev => [...prev, {
          chunkIndex: index,
          data: data,
          error: result.error || 'Unknown error',
          retryCount: result.retryCount,
        }]);
      }

      // Add delay between chunks to allow garbage collection
      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (error: any) {
      console.error(`Error uploading chunk ${index}:`, error);
      completedChunksRef.current += 1; // Still count as completed (failed)

      setFailedChunks(prev => [...prev, {
        chunkIndex: index,
        data: data,
        error: error.message || 'Unknown error',
        retryCount: 0,
      }]);
    }
  };

  // Handle upload completion - called when ALL chunks are done
  const handleUploadCompletion = async (sessionId: string, totalRecords: number) => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;

    setProgress(prev => ({ ...prev, status: 'completed' }));

    // Call UpdateImportSeqFilter API after successful upload
    if (metadata?.selectedRecord?.FileSerialNo && failedChunks.length === 0) {
      try {
        const updateApiEndpoint = `${BASE_URL}${UPDATE_IMPORT_SEQ_URL}`;
        const fileSeqNo = String(metadata.selectedRecord.FileSerialNo);
        const xFilter = metadata.filters || {};
        const userId = metadata.selectedRecord?.UserId || 'SA';
        const fileName = metadata.selectedRecord?.FileName || fileMetadata?.name || 'Unknown File';



        const updateResult = await callUpdateImportSeqFilter(
          updateApiEndpoint,
          fileSeqNo,
          xFilter,
          userId
        );

        if (updateResult.success) {
          // Group error records by filename to create separate tabs
          const errorRecords = updateResult.errorRecords || [];
          const errorsByFile = new Map<string, ImportFilterErrorRecord[]>();

          // Group errors by tf_FileName
          errorRecords.forEach((error: any) => {
            const errorFileName = error.tf_FileName || fileName;
            if (!errorsByFile.has(errorFileName)) {
              errorsByFile.set(errorFileName, []);
            }
            errorsByFile.get(errorFileName)?.push(error);
          });

          // Create FileImportErrors array for each unique file
          const fileErrorsList: FileImportErrors[] = [];

          if (errorsByFile.size > 0) {
            // We have files with errors - create tabs for each
            errorsByFile.forEach((errors, errorFileName) => {
              fileErrorsList.push({
                fileName: errorFileName,
                fileSeqNo: fileSeqNo,
                errors: errors,
                processStatus: updateResult.processStatus || { flag: 'S', message: 'Process Completed' },
              });
            });
          } else {
            // No errors - create a single entry to show success
            fileErrorsList.push({
              fileName: fileName,
              fileSeqNo: fileSeqNo,
              errors: [],
              processStatus: updateResult.processStatus || { flag: 'S', message: 'Process Completed' },
            });
          }

          const totalErrors = errorRecords.length;
          const hasErrors = totalErrors > 0;

          // Set the import errors and show modal
          setImportErrors(fileErrorsList);
          setShowImportErrorsModal(true);

          if (hasErrors) {
            toast.warning(`Upload completed with ${totalErrors} record(s) having errors across ${fileErrorsList.length} file(s)`);
          } else {
            toast.success('Import completed successfully!');
          }

          // console.log('✅ UpdateImportSeqFilter completed:', {
          //   filesWithErrors: fileErrorsList.length,
          //   totalErrorCount: totalErrors,
          //   processStatus: updateResult.processStatus
          // });
        } else {
          toast.warning(`Upload completed but failed to update import filter: ${updateResult.error}`);
          console.warn('⚠️ UpdateImportSeqFilter failed:', updateResult.error);
        }
      } catch (error: any) {
        toast.warning(`Upload completed but failed to update import filter: ${error.message}`);
        console.error('❌ Error calling UpdateImportSeqFilter:', error);
      }
    } else if (failedChunks.length > 0) {
      // console.log('⚠️ Skipping UpdateImportSeqFilter due to failed chunks');
    }

    if (onUploadComplete) {
      onUploadComplete({
        totalRecords: totalRecords,
        successfulRecords: uploadedRecordsRef.current - failedChunks.length,
        failedRecords: failedChunks.length,
        totalChunks: totalChunksRef.current,
        failedChunks: failedChunks.length,
        timeTaken: elapsed,
        sessionId: sessionId,
      });
    }
  };

  // Parse Excel files using Web Worker
  const parseExcelFile = (file: File) => {
    setProgress(prev => ({ ...prev, status: 'parsing' }));
    setSessionId(generateSessionId());
    allDataRef.current = [];
    headersRef.current = [];

    // Create Web Worker
    const worker = new Worker('/workers/excelParser.worker.js');
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, data, totalRows, error } = e.data;

      if (type === 'start') {
        setProgress(prev => ({
          ...prev,
          totalRecords: totalRows,
          totalChunks: Math.ceil(totalRows / dynamicChunkSize),
        }));
      } else if (type === 'chunk') {
        // Extract headers from first chunk
        if (headersRef.current.length === 0 && data.length > 0) {
          headersRef.current = Object.keys(data[0]);
        }
        allDataRef.current.push(...data);
        setProgress(prev => ({
          ...prev,
          totalRecords: allDataRef.current.length,
        }));
      } else if (type === 'complete') {
        toast.success(`Parsed ${totalRows.toLocaleString()} records successfully`);
        setProgress(prev => ({ ...prev, status: 'idle' }));
        worker.terminate();
        workerRef.current = null;
        startUpload();
      } else if (type === 'error') {
        toast.error(`Parsing error: ${error}`);
        setProgress(prev => ({ ...prev, status: 'error' }));
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = (error) => {
      toast.error(`Worker error: ${error.message}`);
      setProgress(prev => ({ ...prev, status: 'error' }));
      worker.terminate();
      workerRef.current = null;
    };

    // Send file to worker
    worker.postMessage({
      type: 'parse',
      file: file,
      chunkSize: dynamicChunkSize,
    });
  };

  // Start upload process
  const startUpload = async () => {
    if (allDataRef.current.length === 0) {
      toast.error('No data to upload');
      return;
    }

    shouldContinueRef.current = true;
    setIsPaused(false);
    setProgress(prev => ({ ...prev, status: 'uploading' }));
    startTimeRef.current = Date.now();
    processedCountRef.current = 0;

    const currentSessionId = sessionId || generateSessionId();

    // Create chunks from data
    const chunks = createChunks(allDataRef.current, dynamicChunkSize, currentSessionId);

    // Clear allDataRef to free up memory for large files (data is now in chunks)
    // We keep a reference count instead
    // const totalRecordsCount = allDataRef.current.length;
    allDataRef.current = []; // Free memory

    const onChunkComplete = (result: ChunkResult) => {
      // Count processed records regardless of success/failure
      const recordsInChunk = chunks[result.chunkIndex].data.length;
      processedCountRef.current += recordsInChunk;

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const speed = elapsed > 0 ? processedCountRef.current / elapsed : 0;
      const remainingRecords = progress.totalRecords - processedCountRef.current;
      const remaining = speed > 0 ? remainingRecords / speed : 0;

      setProgress(prev => ({
        ...prev,
        processedRecords: processedCountRef.current,
        currentChunk: result.chunkIndex + 1,
        percentage: prev.totalRecords > 0 ? Math.round((processedCountRef.current / prev.totalRecords) * 100) : 0,
        speed: Math.round(speed),
        estimatedTimeRemaining: isFinite(remaining) ? remaining : 0,
        failedRecords: result.success ? prev.failedRecords : prev.failedRecords + recordsInChunk,
      }));

      if (!result.success) {
        setFailedChunks(prev => [...prev, {
          chunkIndex: result.chunkIndex,
          data: chunks[result.chunkIndex].data,
          error: result.error || 'Unknown error',
          retryCount: result.retryCount,
        }]);
      }
    };

    try {
      const results = await uploadChunksSequentially(
        chunks,
        apiEndpoint,
        headersRef.current,
        delayBetweenChunks,
        maxRetries,
        undefined,
        onChunkComplete,
        () => shouldContinueRef.current,
        metadata
      );

      const stats = calculateUploadStats(results);
      const timeTaken = (Date.now() - startTimeRef.current) / 1000;

      const uploadSummary: UploadSummary = {
        totalRecords: progress.totalRecords,
        successfulRecords: stats.successfulRecords,
        failedRecords: stats.failedRecords,
        totalChunks: stats.totalChunks,
        failedChunks: stats.failedChunks,
        timeTaken,
        sessionId: currentSessionId,
      };

      setSummary(uploadSummary);
      setProgress(prev => ({ ...prev, status: 'completed' }));
      toast.success(`Upload completed! ${stats.successfulRecords} records uploaded successfully.`);

      // Call UpdateImportSeqFilter API after successful upload (for Excel files)
      if (metadata?.selectedRecord?.FileSerialNo && stats.failedChunks === 0) {
        try {
          const updateApiEndpoint = `${BASE_URL}${UPDATE_IMPORT_SEQ_URL}`;
          const fileSeqNo = String(metadata.selectedRecord.FileSerialNo);
          const xFilter = metadata.filters || {};
          const userId = metadata.selectedRecord?.UserId || 'SA';
          const fileName = metadata.selectedRecord?.FileName || fileMetadata?.name || 'Unknown File';



          const updateResult = await callUpdateImportSeqFilter(
            updateApiEndpoint,
            fileSeqNo,
            xFilter,
            userId
          );

          if (updateResult.success) {
            // Group error records by filename to create separate tabs
            const errorRecords = updateResult.errorRecords || [];
            const errorsByFile = new Map<string, ImportFilterErrorRecord[]>();

            // Group errors by tf_FileName
            errorRecords.forEach((error: any) => {
              const errorFileName = error.tf_FileName || fileName;
              if (!errorsByFile.has(errorFileName)) {
                errorsByFile.set(errorFileName, []);
              }
              errorsByFile.get(errorFileName)?.push(error);
            });

            // Create FileImportErrors array for each unique file
            const fileErrorsList: FileImportErrors[] = [];

            if (errorsByFile.size > 0) {
              // We have files with errors - create tabs for each
              errorsByFile.forEach((errors, errorFileName) => {
                fileErrorsList.push({
                  fileName: errorFileName,
                  fileSeqNo: fileSeqNo,
                  errors: errors,
                  processStatus: updateResult.processStatus || { flag: 'S', message: 'Process Completed' },
                });
              });
            } else {
              // No errors - create a single entry to show success
              fileErrorsList.push({
                fileName: fileName,
                fileSeqNo: fileSeqNo,
                errors: [],
                processStatus: updateResult.processStatus || { flag: 'S', message: 'Process Completed' },
              });
            }

            const totalErrors = errorRecords.length;
            const hasErrors = totalErrors > 0;

            // Set the import errors and show modal
            setImportErrors(fileErrorsList);
            setShowImportErrorsModal(true);

            if (hasErrors) {
              toast.warning(`Upload completed with ${totalErrors} record(s) having errors across ${fileErrorsList.length} file(s)`);
            } else {
              toast.success('Import completed successfully!');
            }

            // console.log('✅ UpdateImportSeqFilter completed:', {
            //   filesWithErrors: fileErrorsList.length,
            //   totalErrorCount: totalErrors,
            //   processStatus: updateResult.processStatus
            // });
          } else {
            toast.warning(`Upload completed but failed to update import filter: ${updateResult.error}`);
            console.warn('⚠️ UpdateImportSeqFilter failed:', updateResult.error);
          }
        } catch (error: any) {
          toast.warning(`Upload completed but failed to update import filter: ${error.message}`);
          console.error('❌ Error calling UpdateImportSeqFilter:', error);
        }
      } else if (stats.failedChunks > 0) {
        // console.log('⚠️ Skipping UpdateImportSeqFilter due to failed chunks');
      }

      if (onUploadComplete) {
        onUploadComplete(uploadSummary);
      }
    } catch (error: any) {
      toast.error(`Upload error: ${error.message}`);
      setProgress(prev => ({ ...prev, status: 'error' }));
      if (onUploadError) {
        onUploadError(error.message);
      }
    }
  };

  // Handle start upload button
  const handleStartUpload = () => {
    if (!selectedFile || !fileMetadata) return;

    const fileType = fileMetadata.extension;

    if (fileType === 'csv' || fileType === 'txt') {
      parseTextFile(selectedFile, fileType);
    } else if (fileType === 'xls' || fileType === 'xlsx') {
      parseExcelFile(selectedFile);
    }
  };

  // Pause/Resume
  // const handlePauseResume = () => {
  //   if (isPaused) {
  //     shouldContinueRef.current = true;
  //     setIsPaused(false);
  //     startUpload();
  //   } else {
  //     shouldContinueRef.current = false;
  //     setIsPaused(true);
  //     setProgress(prev => ({ ...prev, status: 'paused' }));
  //   }
  // };

  // // Cancel upload
  // const handleCancel = () => {
  //   shouldContinueRef.current = false;
  //   if (parserAbortRef.current) {
  //     parserAbortRef.current.abort();
  //   }
  //   if (workerRef.current) {
  //     workerRef.current.terminate();
  //     workerRef.current = null;
  //   }
  //   setProgress(prev => ({ ...prev, status: 'cancelled' }));
  //   toast.info('Upload cancelled');
  // };

  // Retry failed chunks
  const handleRetryFailed = async () => {
    if (failedChunks.length === 0) return;

    const chunks = failedChunks.map(fc => ({
      chunkIndex: fc.chunkIndex,
      data: fc.data,
      sessionId,
      totalChunks: progress.totalChunks,
      startIndex: fc.chunkIndex * dynamicChunkSize,
      endIndex: (fc.chunkIndex + 1) * dynamicChunkSize,
    }));

    setProgress(prev => ({ ...prev, status: 'uploading' }));

    const results = await uploadChunksSequentially(
      chunks,
      apiEndpoint,
      headersRef.current,
      delayBetweenChunks,
      maxRetries,
      undefined,
      undefined,
      undefined,
      metadata
    );

    const successfulRetries = results.filter(r => r.success);
    setFailedChunks(prev => prev.filter(fc => !results.find(r => r.success && r.chunkIndex === fc.chunkIndex)));

    toast.success(`Retried ${successfulRetries.length} chunks successfully`);
    setProgress(prev => ({ ...prev, status: 'completed' }));
  };

  // Download failed chunks with error information
  const handleDownloadFailed = () => {
    if (failedChunks.length === 0) return;

    // Combine all failed chunk data and add error information
    const failedDataWithErrors = failedChunks.flatMap(fc =>
      fc.data.map((record, index) => ({
        ...record,
        '_ErrorReason': fc.error || 'Unknown error',
        '_ChunkIndex': fc.chunkIndex,
        '_RetryCount': fc.retryCount,
        '_RecordIndexInChunk': index + 1
      }))
    );

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `failed_records_${timestamp}_${failedDataWithErrors.length}_records.csv`;

    downloadAsCSV(failedDataWithErrors, fileName);
    toast.success(`Downloaded ${failedDataWithErrors.length} failed records to ${fileName}`);
  };

  // Reset
  const handleReset = () => {
    setSelectedFile(null);
    setFileMetadata(null);
    setProgress({
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      currentChunk: 0,
      totalChunks: 0,
      percentage: 0,
      speed: 0,
      estimatedTimeRemaining: 0,
      status: 'idle',
    });
    setFailedChunks([]);
    setSummary(null);
    allDataRef.current = [];
    headersRef.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const isUploading = progress.status === 'uploading' || progress.status === 'parsing';

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      {!selectedFile && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          style={{ backgroundColor: isDragActive ? colors.cardBackground : 'transparent' }}
        >
          <input {...getInputProps()} />
          <FaUpload className="mx-auto text-5xl text-gray-400 mb-4" />
          <p className="text-lg font-medium" style={{ color: colors.text }}>
            {isDragActive ? 'Drop file here' : 'Drag & drop file here, or click to select'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supported: CSV, TXT, XLS, XLSX | Max size: {formatFileSize(maxFileSize)}
          </p>
        </div>
      )}

      {/* Selected File Info */}
      {selectedFile && fileMetadata && (
        <div className="border rounded-lg p-6" style={{ backgroundColor: colors.cardBackground }}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <FaFile className="text-4xl text-blue-500 mt-1" />
              <div>
                <h3 className="font-semibold text-lg" style={{ color: colors.text }}>
                  {fileMetadata.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(fileMetadata.size)} • {fileMetadata.extension.toUpperCase()}
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-red-500 hover:text-red-700"
              disabled={isUploading}
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            {progress.status === 'idle' && (
              <>
                <button
                  onClick={handleStartUpload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <FaUpload /> Start Upload
                </button>
                <button
                  onClick={loadPreview}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  style={{ color: colors.text }}
                >
                  <FaEye /> Preview
                </button>
              </>
            )}

            {/* Pause and Cancel buttons hidden as per user request */}
            {/* {(progress.status === 'uploading' || progress.status === 'paused') && (
              <>
                <button
                  onClick={handlePauseResume}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  {isPaused ? <FaPlay /> : <FaPause />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <FaTimes /> Cancel
                </button>
              </>
            )} */}

            {/* Show download failed button when there are failed chunks */}
            {(progress.status === 'completed' || progress.status === 'uploading') && failedChunks.length > 0 && (
              <>
                {progress.status === 'completed' && (
                  <button
                    onClick={handleRetryFailed}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    <FaRedo /> Retry Failed
                  </button>
                )}
                <button
                  onClick={handleDownloadFailed}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  title="Download records that failed to upload"
                >
                  <FaDownload /> Download Failed Records ({failedChunks.length} chunks)
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Progress Section */}
      {progress.status !== 'idle' && progress.totalRecords > 0 && (
        <div className="border rounded-lg p-6" style={{ backgroundColor: colors.cardBackground }}>
          <h3 className="font-semibold text-lg mb-4" style={{ color: colors.text }}>
            Upload Progress
          </h3>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: colors.text }}>
                {progress.processedRecords.toLocaleString()} of {progress.totalRecords.toLocaleString()} records
              </span>
              <span style={{ color: colors.text }}>{progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-semibold" style={{ color: colors.text }}>
                {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Speed</p>
              <p className="font-semibold" style={{ color: colors.text }}>
                {progress.speed.toLocaleString()} rec/s
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Time Remaining</p>
              <p className="font-semibold" style={{ color: colors.text }}>
                {formatDuration(progress.estimatedTimeRemaining)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Failed</p>
              <p className="font-semibold text-red-600">
                {progress.failedRecords.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="border rounded-lg p-6" style={{ backgroundColor: colors.cardBackground }}>
          <div className="flex items-center gap-2 mb-4">
            <FaCheck className="text-green-500 text-2xl" />
            <h3 className="font-semibold text-lg" style={{ color: colors.text }}>
              Upload Summary
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="font-semibold text-xl" style={{ color: colors.text }}>
                {summary.totalRecords.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Successful</p>
              <p className="font-semibold text-xl text-green-600">
                {summary.successfulRecords.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Failed</p>
              <p className="font-semibold text-xl text-red-600">
                {summary.failedRecords.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Chunks</p>
              <p className="font-semibold text-xl" style={{ color: colors.text }}>
                {summary.totalChunks}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Time Taken</p>
              <p className="font-semibold text-xl" style={{ color: colors.text }}>
                {formatDuration(summary.timeTaken)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Session ID</p>
              <p className="font-semibold text-sm" style={{ color: colors.text }}>
                {summary.sessionId.substring(0, 20)}...
              </p>
            </div>
          </div>

          {/* Failed Records Warning in Summary */}
          {failedChunks.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-red-900 mb-2">
                    ⚠️ Failed Records Detected
                  </h4>
                  <p className="text-sm text-red-800 mb-3">
                    {failedChunks.flatMap(fc => fc.data).length} records across {failedChunks.length} chunk(s) failed to upload.
                    You can download these records for review and retry later.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadFailed}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      <FaDownload /> Download Failed Records
                    </button>
                    <button
                      onClick={handleRetryFailed}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                    >
                      <FaRedo /> Retry Failed Chunks
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-lg p-6 max-w-6xl w-full max-h-[80vh] overflow-auto"
            style={{ backgroundColor: colors.cardBackground }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg" style={{ color: colors.text }}>
                File Preview (First 10 rows)
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {previewData.headers.map((header, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewData.rows.map((row, idx) => (
                    <tr key={idx}>
                      {previewData.headers.map((header, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-4 py-2 text-sm"
                          style={{ color: colors.text }}
                        >
                          {row[header] !== undefined && row[header] !== null ? String(row[header]) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Import Errors Modal */}
      <ImportErrorsModal
        isOpen={showImportErrorsModal}
        onClose={() => setShowImportErrorsModal(false)}
        fileErrors={importErrors}
        hasErrors={importErrors.some(f => f.errors.length > 0)}
      />
    </div>
  );
};

export default FileUploadChunked;
