"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FaUpload,
  FaCheck,
  // FaTimes,
  FaPause,
  FaPlay,
  FaRedo,
  FaTrash,
  FaFileAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaSpinner,
  FaDownload,
  FaEye,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useTheme } from '@/context/ThemeContext';
import { getUploadManager } from '@/utils/backgroundUploadService';
import { FileQueueItem, UploadQueueStats, FileImportErrors } from '@/types/upload';
import { formatFileSize, downloadAsCSV } from '@/utils/fileParser';
import ImportErrorsModal from './ImportErrorsModal';

interface MultiFileUploadQueueProps {
  apiRecords: any[];
  allRecords?: any[]; // All records including disabled ones
  filters?: Record<string, any>;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onQueueUpdate?: (stats: UploadQueueStats) => void;
}

const MultiFileUploadQueue: React.FC<MultiFileUploadQueueProps> = ({
  apiRecords,
  allRecords,
  filters = {},
  maxFileSize = 3 * 1024 * 1024 * 1024, // 3GB
  allowedFileTypes = ['csv', 'txt', 'xls', 'xlsx'],
  onQueueUpdate,
}) => {
  const { colors } = useTheme();
  const uploadManager = getUploadManager();

  const [queueItems, setQueueItems] = useState<FileQueueItem[]>([]);
  const [stats, setStats] = useState<UploadQueueStats>({
    total: 0,
    pending: 0,
    uploading: 0,
    success: 0,
    failed: 0,
    noMatch: 0,
    paused: 0,
    disabled: 0,
  });
  const [isPaused, setIsPaused] = useState(false);
  const lastUpdateRef = React.useRef<string>('');

  // Import errors modal state
  const [showImportErrorsModal, setShowImportErrorsModal] = useState(false);
  const [importErrors, setImportErrors] = useState<FileImportErrors[]>([]);
  const shownErrorsRef = React.useRef<Set<string>>(new Set());

  // Update queue state (only if changed to prevent flashing)
  const updateQueueState = useCallback(() => {
    const queue = uploadManager.getQueue();
    const newStats = uploadManager.getStats();

    // Create a hash to detect actual changes
    const queueHash = JSON.stringify({
      items: queue.items.map(i => ({ id: i.id, status: i.status, progress: i.progress, error: i.error, importErrors: i.importErrors?.length })),
      stats: newStats,
      isPaused: queue.isPaused
    });

    // Only update if something actually changed
    if (queueHash !== lastUpdateRef.current) {
      lastUpdateRef.current = queueHash;
      setQueueItems(queue.items);
      setStats(newStats);
      setIsPaused(queue.isPaused);

      // Check for files with import errors and show modal (only for new errors)
      const filesWithErrors = queue.items.filter(
        item => item.status === 'success' && item.importErrors && item.importErrors.length > 0
      );

      if (filesWithErrors.length > 0) {
        // Check if there are any new files with errors that we haven't shown yet
        const newFilesWithErrors = filesWithErrors.filter(item => !shownErrorsRef.current.has(item.id));

        if (newFilesWithErrors.length > 0) {
          // Group errors by filename
          const errorsByFile = new Map<string, FileImportErrors>();

          filesWithErrors.forEach(item => {
            const itemErrors = item.importErrors || [];
            const errorsByFileName = new Map<string, any[]>();

            // Group errors from this item by tf_FileName
            itemErrors.forEach(error => {
              const errorFileName = error.tf_FileName || item.fileName;
              if (!errorsByFileName.has(errorFileName)) {
                errorsByFileName.set(errorFileName, []);
              }
              errorsByFileName.get(errorFileName)!.push(error);
            });

            // Create FileImportErrors for each unique filename
            errorsByFileName.forEach((errors, errorFileName) => {
              if (!errorsByFile.has(errorFileName)) {
                errorsByFile.set(errorFileName, {
                  fileName: errorFileName,
                  fileSeqNo: String(item.matchedRecord?.FileSerialNo || ''),
                  errors: errors,
                  processStatus: item.processStatus || { flag: 'S', message: 'Process Completed' },
                });
              } else {
                // Merge errors if same filename appears in multiple items
                const existing = errorsByFile.get(errorFileName)!;
                existing.errors.push(...errors);
              }
            });

            // Mark this file as shown
            shownErrorsRef.current.add(item.id);
          });

          const errorsList = Array.from(errorsByFile.values());

          if (errorsList.length > 0) {
            setImportErrors(errorsList);
            setShowImportErrorsModal(true);

            // Show toast notification
            const totalErrors = errorsList.reduce((sum, f) => sum + f.errors.length, 0);
            toast.warning(`Found ${totalErrors} error record(s) across ${errorsList.length} file(s)`);
          }
        }
      }

      if (onQueueUpdate) {
        onQueueUpdate(newStats);
      }
    }
  }, [uploadManager, onQueueUpdate]);

  // Listen for queue updates
  useEffect(() => {
    updateQueueState();
    const unsubscribe = uploadManager.addListener(updateQueueState);

    // Poll for updates every 2 seconds (reduced from 1 second to prevent flashing)
    const interval = setInterval(updateQueueState, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [uploadManager, updateQueueState]);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast.error('No valid files selected');
      return;
    }

    // Validate files
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    acceptedFiles.forEach(file => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';

      if (!allowedFileTypes.includes(extension)) {
        invalidFiles.push(`${file.name} (invalid type)`);
        return;
      }

      if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name} (too large)`);
        return;
      }

      validFiles.push(file);
    });

    if (invalidFiles.length > 0) {
      toast.error(`Invalid files: ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      uploadManager.addFiles(validFiles, apiRecords, allRecords || apiRecords, filters);
      toast.success(`Added ${validFiles.length} file(s) to queue`);
    }
  }, [uploadManager, apiRecords, allRecords, filters, allowedFileTypes, maxFileSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  // Get status icon and color
  const getStatusDisplay = (status: FileQueueItem['status']) => {
    switch (status) {
      case 'pending':
        return { icon: <FaFileAlt />, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Pending' };
      case 'uploading':
        return { icon: <FaSpinner className="animate-spin" />, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Uploading' };
      case 'success':
        return { icon: <FaCheckCircle />, color: 'text-green-600', bg: 'bg-green-100', label: 'Success' };
      case 'failed':
        return { icon: <FaTimesCircle />, color: 'text-red-600', bg: 'bg-red-100', label: 'Failed' };
      case 'no_match':
        return { icon: <FaExclamationCircle />, color: 'text-red-600', bg: 'bg-red-100', label: 'Not Matched' };
      case 'disabled':
        return { icon: <FaExclamationCircle />, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Record Disabled' };
      case 'paused':
        return { icon: <FaPause />, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Paused' };
      default:
        return { icon: <FaFileAlt />, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Unknown' };
    }
  };

  // Handle actions
  const handlePauseResume = () => {
    if (isPaused) {
      uploadManager.resumeQueue();
      toast.info('Queue resumed');
    } else {
      uploadManager.pauseQueue();
      toast.info('Queue paused');
    }
  };

  const handleRetry = (id: string) => {
    uploadManager.retryItem(id);
    toast.info('Retrying upload');
  };

  const handleRemove = (id: string) => {
    uploadManager.removeItem(id);
    toast.info('Item removed from queue');
  };

  const handleClearCompleted = () => {
    uploadManager.clearCompleted();
    toast.success('Completed items cleared');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all items from the queue?')) {
      uploadManager.clearAll();
      toast.success('Queue cleared');
    }
  };

  const handleDownloadFailed = (item: FileQueueItem) => {
    if (!item.failedChunks || item.failedChunks.length === 0) {
      toast.error('No failed records to download');
      return;
    }

    const failedData = item.failedChunks.flatMap(fc =>
      fc.data.map((record, index) => ({
        ...record,
        '_ErrorReason': fc.error || 'Unknown error',
        '_ChunkIndex': fc.chunkIndex,
        '_RetryCount': fc.retryCount,
        '_RecordIndexInChunk': index + 1
      }))
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `failed_${item.fileName}_${timestamp}.csv`;

    downloadAsCSV(failedData, fileName);
    toast.success(`Downloaded ${failedData.length} failed records`);
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        style={{ backgroundColor: isDragActive ? colors.cardBackground : 'transparent' }}
      >
        <input {...getInputProps()} />
        <FaUpload className="mx-auto text-4xl text-gray-400 mb-3" />
        <p className="text-lg font-medium mb-2" style={{ color: colors.text }}>
          {isDragActive ? 'Drop files here' : 'Drag & drop files or folders here'}
        </p>
        <p className="text-sm text-gray-500">
          or click to select files
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Supported: CSV, TXT, XLS, XLSX | Max: {formatFileSize(maxFileSize)}
        </p>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3 rounded-lg border" style={{ backgroundColor: colors.cardBackground }}>
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.total}</p>
        </div>
        <div className="p-3 rounded-lg border bg-gray-50">
          <p className="text-xs text-gray-500 mb-1">Pending</p>
          <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
        </div>
        <div className="p-3 rounded-lg border bg-blue-50">
          <p className="text-xs text-blue-600 mb-1">Uploading</p>
          <p className="text-2xl font-bold text-blue-600">{stats.uploading}</p>
        </div>
        <div className="p-3 rounded-lg border bg-green-50">
          <p className="text-xs text-green-600 mb-1">Success</p>
          <p className="text-2xl font-bold text-green-600">{stats.success}</p>
        </div>
        <div className="p-3 rounded-lg border bg-red-50">
          <p className="text-xs text-red-600 mb-1">Failed</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
        <div className="p-3 rounded-lg border bg-red-50">
          <p className="text-xs text-red-600 mb-1">Not Matched</p>
          <p className="text-2xl font-bold text-red-600">{stats.noMatch}</p>
        </div>
        <div className="p-3 rounded-lg border bg-orange-50">
          <p className="text-xs text-orange-600 mb-1">Disabled</p>
          <p className="text-2xl font-bold text-orange-600">{stats.disabled}</p>
        </div>
        <div className="p-3 rounded-lg border bg-purple-50">
          <p className="text-xs text-purple-600 mb-1">Paused</p>
          <p className="text-2xl font-bold text-purple-600">{stats.paused}</p>
        </div>
      </div>

      {/* Queue Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handlePauseResume}
          disabled={stats.total === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
            isPaused
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isPaused ? <FaPlay /> : <FaPause />}
          {isPaused ? 'Resume Queue' : 'Pause Queue'}
        </button>
        <button
          onClick={handleClearCompleted}
          disabled={stats.success === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaCheck />
          Clear Completed
        </button>
        <button
          onClick={handleClearAll}
          disabled={stats.total === 0}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaTrash />
          Clear All
        </button>
      </div>

      {/* Queue Items Table */}
      {queueItems.length > 0 && (
        <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: colors.cardBackground }}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50" style={{ backgroundColor: colors.cardBackground, opacity: 0.9 }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">File Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Matched Record</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Records</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {queueItems.map((item) => {
                  const statusDisplay = getStatusDisplay(item.status);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusDisplay.bg} ${statusDisplay.color} text-sm font-medium w-fit`}>
                          {statusDisplay.icon}
                          <span>{statusDisplay.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FaFileAlt className="text-gray-400" />
                          <div>
                            <p className="font-medium text-sm" style={{ color: colors.text }}>
                              {item.fileName}
                            </p>
                            {item.error && (
                              <p className="text-xs text-red-600 mt-1">{item.error}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: colors.text }}>
                        {formatFileSize(item.fileSize)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: colors.text }}>
                        {item.matchedRecord ? (
                          <span className="text-green-600 font-medium">
                            {item.matchedRecord.FileName || item.matchedRecord.FileSerialNo}
                          </span>
                        ) : (
                          <span className="text-yellow-600">Not Matched</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-full">
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: colors.text }}>{item.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                item.status === 'success' ? 'bg-green-600' :
                                item.status === 'failed' ? 'bg-red-600' :
                                item.status === 'uploading' ? 'bg-blue-600' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${item.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: colors.text }}>
                        {item.uploadedRecords > 0 && (
                          <span>
                            {item.uploadedRecords.toLocaleString()}
                            {item.totalRecords > 0 && ` / ${item.totalRecords.toLocaleString()}`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {(item.status === 'failed' || item.status === 'paused') && (
                            <button
                              onClick={() => handleRetry(item.id)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                              title="Retry"
                            >
                              <FaRedo />
                            </button>
                          )}
                          {item.importErrors && item.importErrors.length > 0 && (
                            <button
                              onClick={() => {
                                // Show modal with this item's errors
                                const errorsByFileName = new Map<string, any[]>();
                                item.importErrors!.forEach(error => {
                                  const errorFileName = error.tf_FileName || item.fileName;
                                  if (!errorsByFileName.has(errorFileName)) {
                                    errorsByFileName.set(errorFileName, []);
                                  }
                                  errorsByFileName.get(errorFileName)!.push(error);
                                });

                                const errorsList: FileImportErrors[] = Array.from(errorsByFileName.entries()).map(([errorFileName, errors]) => ({
                                  fileName: errorFileName,
                                  fileSeqNo: String(item.matchedRecord?.FileSerialNo || ''),
                                  errors: errors,
                                  processStatus: item.processStatus || { flag: 'S', message: 'Process Completed' },
                                }));

                                setImportErrors(errorsList);
                                setShowImportErrorsModal(true);
                              }}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                              title={`View ${item.importErrors.length} Import Errors`}
                            >
                              <FaEye />
                            </button>
                          )}
                          {item.failedChunks && item.failedChunks.length > 0 && (
                            <button
                              onClick={() => handleDownloadFailed(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Download Failed Records"
                            >
                              <FaDownload />
                            </button>
                          )}
                          {item.status !== 'uploading' && (
                            <button
                              onClick={() => handleRemove(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Remove"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {queueItems.length === 0 && (
        <div className="text-center py-12 border rounded-lg" style={{ backgroundColor: colors.cardBackground }}>
          <FaFileAlt className="mx-auto text-5xl text-gray-300 mb-3" />
          <p className="text-lg font-medium text-gray-500">No files in queue</p>
          <p className="text-sm text-gray-400 mt-1">Drag and drop files to get started</p>
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

export default MultiFileUploadQueue;
