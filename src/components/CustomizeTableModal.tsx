import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaSave } from "react-icons/fa";
import { DataGrid, Column } from "react-data-grid";
import { useTheme } from "@/context/ThemeContext";

interface CustomizeTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableColumns: string[];
    frozenColumns: string[];
    textColumns: string[];
    onSave: (data: {
        frozenColumns: string[];
        textColumns: string[];
    }) => void;
}

type CustomizeRow = {
    id: string;
    columnName: string;
};

const CustomizeTableModal: React.FC<CustomizeTableModalProps> = ({
    isOpen,
    onClose,
    availableColumns,
    frozenColumns,
    textColumns,
    onSave
}) => {
    const { colors, fonts } = useTheme();

    const [selectedFrozen, setSelectedFrozen] = useState<Set<string>>(new Set());
    const [selectedText, setSelectedText] = useState<Set<string>>(new Set());

    /* ---------------- Sync state on open ---------------- */
    useEffect(() => {
        if (isOpen) {
            setSelectedFrozen(new Set(frozenColumns));
            setSelectedText(new Set(textColumns));
        }
    }, [isOpen, frozenColumns, textColumns]);

    /* ---------------- Rows ---------------- */
    const rows: CustomizeRow[] = useMemo(
        () =>
            availableColumns.map(col => ({
                id: col,
                columnName: col
            })),
        [availableColumns]
    );

    /* ---------------- Handlers ---------------- */
    const toggleFrozen = (col: string) => {
        setSelectedFrozen(prev => {
            const next = new Set(prev);

            if (next.has(col)) {
                next.delete(col);
            } else {
                next.add(col);
            }

            return next;
        });
    };

    const toggleText = (col: string) => {
        setSelectedText(prev => {
            const next = new Set(prev);

            if (next.has(col)) {
                next.delete(col);
            } else {
                next.add(col);
            }

            return next;
        });
    };


    const handleSave = () => {
        onSave({
            frozenColumns: Array.from(selectedFrozen),
            textColumns: Array.from(selectedText)
        });
        onClose();
    };

    /* ---------------- Grid Columns ---------------- */
    const columns: Column<CustomizeRow>[] = useMemo(
        () => [
            {
                key: "columnName",
                name: "Column Name",
                resizable: true
            },
            {
                key: "freeze",
                name: "Freeze Column",
                width: 150,
                renderCell: ({ row }) => (
                    <label className="relative inline-flex items-center justify-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedFrozen.has(row.id)}
                            onChange={() => toggleFrozen(row.id)}
                            className="peer h-5 w-5 appearance-none rounded border-2 border-blue-600 bg-white cursor-pointer focus:outline-none"
                        />
                        {/* Blue tick */}
                        <span
                            className="absolute text-blue-600 text-sm font-bold opacity-0 peer-checked:opacity-100 pointer-events-none"
                        >
                            ✓
                        </span>
                    </label>
                )

            },
            {
                key: "text",
                name: "Text Column",
                width: 150,
                renderCell: ({ row }) => (
                    <label className="relative inline-flex items-center justify-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedText.has(row.id)}
                            onChange={() => toggleText(row.id)}
                            className="peer h-5 w-5 appearance-none rounded border-2 border-blue-600 bg-white cursor-pointer focus:outline-none"
                        />
                        {/* Blue tick */}
                        <span className="absolute text-blue-600 text-sm font-bold opacity-0 peer-checked:opacity-100 pointer-events-none">
                            ✓
                        </span>
                    </label>
                )

            }
        ],
        [selectedFrozen, selectedText]
    );

    /* ---------------- Render Guard ---------------- */
    if (!isOpen) return null;

    /* ---------------- UI ---------------- */
    return createPortal(
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-25 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]"
                style={{ backgroundColor: colors.cardBackground, color: colors.text }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 style={{ color: colors.text }}>Column Settings</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1">
                    <p className="text-sm text-gray-500 mb-3">
                        Configure column behavior for display and export.
                    </p>
                    <div className="border rounded-lg h-full overflow-y-auto">
                        <DataGrid
                            columns={columns}
                            rows={rows}
                            rowKeyGetter={(row) => row.id}
                            style={{
                                backgroundColor: colors.background,
                                color: colors.text,
                                fontFamily: fonts.content,
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
                        style={{ color: colors.text, backgroundColor: colors.buttonBackground }}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm text-white"
                        style={{ backgroundColor: colors.buttonBackground, color: colors.text }}
                    >
                        <FaSave size={14} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CustomizeTableModal;
