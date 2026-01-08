import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes, FaCheck, FaSave } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';

interface CustomizeTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableColumns: string[];
    frozenColumns: string[];
    onSave: (frozenCols: string[]) => void;
}

const CustomizeTableModal: React.FC<CustomizeTableModalProps> = ({
    isOpen,
    onClose,
    availableColumns,
    frozenColumns,
    onSave
}) => {
    const { colors } = useTheme();
    const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(frozenColumns));

    useEffect(() => {
        if (isOpen) {
            setSelectedColumns(new Set(frozenColumns));
        }
    }, [isOpen, frozenColumns]);

    if (!isOpen) return null;

    const handleToggleColumn = (column: string) => {
        const newSelected = new Set(selectedColumns);
        if (newSelected.has(column)) {
            newSelected.delete(column);
        } else {
            newSelected.add(column);
        }
        setSelectedColumns(newSelected);
    };

    const handleSave = () => {
        onSave(Array.from(selectedColumns));
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-25 backdrop-blur-sm"
             role="dialog"
             aria-modal="true"
             aria-labelledby="customize-modal-title">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]"
                 style={{ backgroundColor: colors.cardBackground, color: colors.text }}>
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 id="customize-modal-title" className="text-xl font-semibold flex items-center gap-2">
                        <span className="text-blue-600">Freeze Columns</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close modal"
                        style={{ color: colors.text }}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1">
                    <p className="text-sm text-gray-500 mb-4">
                        Select columns to freeze (pin) to the left side of the table.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {availableColumns.map((col) => (
                            <label
                                key={col}
                                className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer group"
                                style={{ 
                                    borderColor: selectedColumns.has(col) ? colors.primary : '#e5e7eb',
                                    backgroundColor: selectedColumns.has(col) ? `${colors.primary}10` : 'transparent'
                                }}
                            >
                                <div className="relative flex items-center shrink-0">
                                    <input
                                        type="checkbox"
                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-blue-500 checked:bg-blue-500"
                                        checked={selectedColumns.has(col)}
                                        onChange={() => handleToggleColumn(col)}
                                        aria-label={`Freeze column ${col}`}
                                    />
                                    <div className="pointer-events-none absolute top-2/4 left-2/4 -translate-x-2/4 -translate-y-2/4 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                                        <FaCheck size={12} />
                                    </div>
                                </div>
                                <span className="ml-3 font-medium select-none truncate" style={{ color: colors.text }} title={col}>
                                    {col}
                                </span>
                            </label>
                        ))}
                    </div>
                        
                    {availableColumns.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No columns available to customize.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                        style={{ color: colors.text }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white shadow-sm hover:shadow-md transition-all active:scale-95"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <FaSave size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CustomizeTableModal;
