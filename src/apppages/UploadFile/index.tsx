"use client";
import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import MultiFileUploadQueue from '@/components/upload/MultiFileUploadQueue';
import { UploadQueueStats } from '@/types/upload';
import { FaInfoCircle } from 'react-icons/fa';

const UploadFile = () => {
    const { colors } = useTheme();
    // Start with empty array - files won't be matched, but can still be uploaded
    // User can configure the API endpoint separately if needed
    const [apiRecords] = useState<any[]>([]);

    const handleQueueUpdate = (stats: UploadQueueStats) => {
        // Queue stats updated - can be used for analytics or UI updates

    };

    return (
        <div className="px-1">
            {/* Header Section */}
            <div className="flex border-b border-gray-200">
                <div className="flex flex-1 gap-2 items-center">
                    <button
                        style={{ backgroundColor: colors.cardBackground }}
                        className={`px-4 py-2 text-sm rounded-t-lg font-bold bg-${colors.primary} text-${colors.buttonText}`}
                    >
                        Batch File Upload
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div
                className="mt-4 p-6 border rounded-lg"
                style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: '#e5e7eb',
                    minHeight: '400px'
                }}
            >
                {/* Instructions */}
                <div className="mb-6">
                    <h2
                        className="text-2xl font-semibold mb-2"
                        style={{ color: colors.text }}
                    >
                        Batch File Upload System
                    </h2>
                    <p
                        className="text-sm text-gray-600 mb-4"
                        style={{ color: colors.text }}
                    >
                        Upload multiple CSV, TXT, or Excel files simultaneously. Files are processed in the background one by one.
                    </p>

                    {/* Info Box */}
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex gap-2 items-start">
                            <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" />
                            <div>
                                <p className="text-sm text-blue-900 font-semibold mb-2">How it works:</p>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• Drag and drop multiple files or select from your computer</li>
                                    <li>• Files are queued and processed one by one in the background</li>
                                    <li>• Upload progress persists even if you close the browser</li>
                                    <li>• Track status, progress, and errors for each file in real-time</li>
                                    <li>• Retry failed files or download failed records for review</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Warning for large files */}
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> For files larger than 500MB, CSV or TXT format is highly recommended.
                            Excel files (.xls, .xlsx) require more memory and may be slower for very large datasets.
                        </p>
                    </div>

                    {/* Features List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div>
                                <p className="font-semibold" style={{ color: colors.text }}>
                                    Background Processing
                                </p>
                                <p className="text-sm text-gray-500">
                                    Files are processed in the background, allowing you to continue working
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div>
                                <p className="font-semibold" style={{ color: colors.text }}>
                                    Multiple File Upload
                                </p>
                                <p className="text-sm text-gray-500">
                                    Upload multiple files at once and track each individually
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div>
                                <p className="font-semibold" style={{ color: colors.text }}>
                                    Persistent Queue
                                </p>
                                <p className="text-sm text-gray-500">
                                    Upload queue persists across browser sessions for reliability
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div>
                                <p className="font-semibold" style={{ color: colors.text }}>
                                    Real-time Status Tracking
                                </p>
                                <p className="text-sm text-gray-500">
                                    Monitor each file&apos;s status, progress, and any errors in real-time
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div>
                                <p className="font-semibold" style={{ color: colors.text }}>
                                    Error Handling
                                </p>
                                <p className="text-sm text-gray-500">
                                    Automatic retry for failed files with detailed error tracking
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div>
                                <p className="font-semibold" style={{ color: colors.text }}>
                                    Pause & Resume
                                </p>
                                <p className="text-sm text-gray-500">
                                    Control the entire queue with pause, resume, and cancel options
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Multi-File Upload Queue */}
                <MultiFileUploadQueue
                    apiRecords={apiRecords}
                    maxFileSize={3 * 1024 * 1024 * 1024} // 3GB
                    allowedFileTypes={['csv', 'txt', 'xls', 'xlsx']}
                    onQueueUpdate={handleQueueUpdate}
                />

                {/* Configuration Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Configuration - Optimized for Large Files</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Max File Size: 3GB per file (supports 10+ crore records)</li>
                        <li>• Chunk Size: 2,000-5,000 records per request (auto-adjusted by file size)</li>
                        <li>• Processing: Sequential, one file at a time for stability</li>
                        <li>• Retries: 3 automatic retry attempts per failed chunk</li>
                        <li>• Memory Management: Aggressive cleanup between chunks and files</li>
                        <li>• Persistence: Queue state saved to browser localStorage</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default UploadFile;
