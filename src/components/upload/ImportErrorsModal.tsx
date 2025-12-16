"use client";
import React, { useState } from 'react';
import { FaTimes, FaCheckCircle, FaExclamationTriangle, FaDownload, FaFileAlt } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { FileImportErrors, ImportFilterErrorRecord } from '@/types/upload';
import { downloadAsCSV } from '@/utils/fileParser';

interface ImportErrorsModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileErrors: FileImportErrors[];
    hasErrors: boolean;
}

const ImportErrorsModal: React.FC<ImportErrorsModalProps> = ({
    isOpen,
    onClose,
    fileErrors,
    hasErrors,
}) => {
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState(0);

    if (!isOpen) return null;

    // Calculate totals
    const totalErrors = fileErrors.reduce((sum, file) => sum + file.errors.length, 0);
    const filesWithErrors = fileErrors.filter(f => f.errors.length > 0).length;

    // Download errors for a specific file
    const handleDownloadFileErrors = (fileError: FileImportErrors) => {
        if (fileError.errors.length === 0) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const fileName = `import_errors_${fileError.fileName.replace(/\.[^/.]+$/, '')}_${timestamp}.csv`;

        // Map the error records to a more readable format
        const downloadData = fileError.errors.map((err, index) => ({
            'Sr No': index + 1,
            'Exchange': err.tf_Exchange,
            'Segment': err.tf_Segment,
            'File Type': err.tf_FileType,
            'Code': err.tf_Code,
            'Status': err.tf_Status === 'E' ? 'Error' : err.tf_Status,
            'Remark': err.tf_Remark,
            'Type': err.tf_Type,
        }));

        downloadAsCSV(downloadData, fileName);
    };

    // Download all errors
    const handleDownloadAllErrors = () => {
        if (totalErrors === 0) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const fileName = `all_import_errors_${timestamp}.csv`;

        const downloadData = fileErrors.flatMap(file =>
            file.errors.map((err, index) => ({
                'File Name': file.fileName,
                'Sr No': index + 1,
                'Exchange': err.tf_Exchange,
                'Segment': err.tf_Segment,
                'File Type': err.tf_FileType,
                'Code': err.tf_Code,
                'Status': err.tf_Status === 'E' ? 'Error' : err.tf_Status,
                'Remark': err.tf_Remark,
                'Type': err.tf_Type,
            }))
        );

        downloadAsCSV(downloadData, fileName);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
                className="rounded-lg shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden"
                style={{ backgroundColor: colors.cardBackground }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        {hasErrors ? (
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <FaExclamationTriangle className="text-orange-600 text-xl" />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <FaCheckCircle className="text-green-600 text-xl" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
                                {hasErrors ? 'Import Completed with Errors' : 'Import Completed Successfully'}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {hasErrors
                                    ? `${filesWithErrors} file(s) have ${totalErrors} record(s) with errors`
                                    : 'All records imported successfully'
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        style={{ color: colors.text }}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Content */}
                {hasErrors ? (
                    <>
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 overflow-x-auto">
                            {fileErrors.map((file, index) => (
                                <button
                                    key={file.fileSeqNo}
                                    onClick={() => setActiveTab(index)}
                                    className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${activeTab === index
                                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                                        : 'border-transparent hover:bg-gray-50'
                                        }`}
                                    style={{ color: activeTab === index ? undefined : colors.text }}
                                >
                                    <FaFileAlt className="text-sm" />
                                    <span className="font-medium text-sm">{file.fileName}</span>
                                    {file.errors.length > 0 && (
                                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                            {file.errors.length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {fileErrors.map((file, index) => (
                                <div
                                    key={file.fileSeqNo}
                                    className={`flex-1 flex flex-col ${activeTab === index ? 'block' : 'hidden'}`}
                                >
                                    {/* File Info Bar */}
                                    <div className="px-6 py-3 bg-gray-50 flex items-center justify-between" style={{ backgroundColor: colors.background }}>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm" style={{ color: colors.text }}>
                                                <strong>Status:</strong>{' '}
                                                <span className={file.processStatus.flag === 'S' ? 'text-green-600' : 'text-orange-600'}>
                                                    {file.processStatus.message}
                                                </span>
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {file.errors.length} error record(s)
                                            </span>
                                        </div>
                                        {file.errors.length > 0 && (
                                            <button
                                                onClick={() => handleDownloadFileErrors(file)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                            >
                                                <FaDownload /> Download Errors
                                            </button>
                                        )}
                                    </div>

                                    {/* Table */}
                                    <div className="flex-1 overflow-auto p-4">
                                        {file.errors.length > 0 ? (
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sr No</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Exchange</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Segment</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Remark</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {file.errors.map((error, errIndex) => (
                                                        <tr key={errIndex} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm" style={{ color: colors.text }}>{errIndex + 1}</td>
                                                            <td className="px-4 py-3 text-sm font-medium" style={{ color: colors.text }}>{error.tf_Code}</td>
                                                            <td className="px-4 py-3 text-sm" style={{ color: colors.text }}>{error.tf_Exchange}</td>
                                                            <td className="px-4 py-3 text-sm" style={{ color: colors.text }}>{error.tf_Segment}</td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${error.tf_Status === 'E'
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : 'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                    {error.tf_Status === 'E' ? 'Error' : error.tf_Status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-red-600">{error.tf_Remark}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full py-12">
                                                <FaCheckCircle className="text-green-500 text-5xl mb-4" />
                                                <p className="text-lg font-medium text-green-700">No errors for this file</p>
                                                <p className="text-sm text-gray-500">All records imported successfully</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Total: {totalErrors} error(s) across {filesWithErrors} file(s)
                            </div>
                            <div className="flex gap-3">
                                {totalErrors > 0 && (
                                    <button
                                        onClick={handleDownloadAllErrors}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                    >
                                        <FaDownload /> Download All Errors
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Success State */
                    <div className="flex-1 flex flex-col items-center justify-center py-16">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                            <FaCheckCircle className="text-green-600 text-4xl" />
                        </div>
                        <h3 className="text-2xl font-semibold text-green-700 mb-2">All Files Imported Successfully!</h3>
                        <p className="text-gray-500 mb-8">
                            {fileErrors.length} file(s) processed with no errors
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportErrorsModal;
