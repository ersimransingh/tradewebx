"use client";
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DataGrid } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useTheme } from '@/context/ThemeContext';
import { useAppSelector } from '@/redux/hooks';
import { RootState } from '@/redux/store';
import { ACTION_NAME, PATH_URL } from '@/utils/constants';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import moment from 'moment';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import axios from 'axios';
import { BASE_URL } from '@/utils/constants';
import DatePicker from 'react-datepicker';

interface DataTableProps {
    data: any[];
    settings?: {
        hideEntireColumn?: string;
        leftAlignedColumns?: string;
        leftAlignedColums?: string;
        mobileColumns?: string[];
        tabletColumns?: string[];
        webColumns?: string[];
        EditableColumn?: Array<{
            Srno: number;
            type: string;
            label: string;
            wKey: string;
            showLabel: boolean;
            wPlaceholder?: string;
            options?: Array<{
                label: string;
                Value: string;
            }>;
            wQuery?: {
                J_Ui: any;
                Sql: string;
                X_Filter: string;
                X_Filter_Multiple?: string;
                J_Api: any;
            };
            dependsOn?: {
                field: string | string[];
                wQuery: {
                    J_Ui: any;
                    Sql: string;
                    X_Filter: string;
                    X_Filter_Multiple?: string;
                    J_Api: any;
                };
            };
            wDropDownKey?: {
                key: string;
                value: string;
            };
            wValue?: string;
            isMultiple?: boolean;
        }>;
        [key: string]: any;
    };
    onRowClick?: (record: any) => void;
    tableRef?: React.RefObject<HTMLDivElement>;
    summary?: any;
    isEntryForm?: boolean;
    handleAction?: (action: string, record: any) => void;
    fullHeight?: boolean;
}

interface DecimalColumn {
    key: string;
    decimalPlaces: number;
}

interface ValueBasedColor {
    key: string;
    checkNumber: number;
    lessThanColor: string;
    greaterThanColor: string;
    equalToColor: string;
}

interface StyledValue {
    type: string;
    props: {
        children: string | number;
        style?: React.CSSProperties;
        className?: string;
    };
}

interface StyledElement extends React.ReactElement {
    props: {
        children: string | number;
        style?: React.CSSProperties;
        className?: string;
    };
}

interface RowData {
    id: string | number;
    expanded: boolean;
    data: any;
}

interface EditableColumn {
    Srno: number;
    type: string;
    label: string;
    wKey: string;
    showLabel: boolean;
    wPlaceholder?: string;
    options?: Array<{
        label: string;
        Value: string;
    }>;
    wQuery?: {
        J_Ui: any;
        Sql: string;
        X_Filter: string;
        X_Filter_Multiple?: string;
        J_Api: any;
    };
    dependsOn?: {
        field: string | string[];
        wQuery: {
            J_Ui: any;
            Sql: string;
            X_Filter: string;
            X_Filter_Multiple?: string;
            J_Api: any;
        };
    };
    wDropDownKey?: {
        key: string;
        value: string;
    };
    wValue?: string;
    isMultiple?: boolean;
}

function getGridContent(gridEl: HTMLDivElement) {
    return {
        head: getRows('.rdg-header-row'),
        body: getRows('.rdg-row:not(.rdg-summary-row)'),
        foot: getRows('.rdg-summary-row')
    };

    function getRows(selector: string) {
        return Array.from(gridEl.querySelectorAll<HTMLDivElement>(selector)).map((gridRow) => {
            return Array.from(gridRow.querySelectorAll<HTMLDivElement>('.rdg-cell')).map(
                (gridCell) => gridCell.innerText
            );
        });
    }
}

function serialiseCellValue(value: unknown) {
    if (typeof value === 'string') {
        const formattedValue = value.replace(/"/g, '""');
        return formattedValue.includes(',') ? `"${formattedValue}"` : formattedValue;
    }
    return value;
}

function downloadFile(fileName: string, data: Blob) {
    const downloadLink = document.createElement('a');
    downloadLink.download = fileName;
    const url = URL.createObjectURL(data);
    downloadLink.href = url;
    downloadLink.click();
    URL.revokeObjectURL(url);
}

export function downloadPdf(fileName, base64Data) {
    console.log(fileName)
    // Decode Base64 into raw binary data held in a string
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    // Convert to Uint8Array
    const byteArray = new Uint8Array(byteNumbers);
    // Create a blob from the PDF bytes
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    // Create a link element, set URL and trigger download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

const useScreenSize = () => {
    const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'web'>('web');

    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            let newSize: 'mobile' | 'tablet' | 'web' = 'web';
            if (width < 768) {
                newSize = 'mobile';
            } else if (width < 1024) {
                newSize = 'tablet';
            } else {
                newSize = 'web';
            }
            setScreenSize(newSize);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    return screenSize;
};

const DataTable: React.FC<DataTableProps> = ({ data, settings, onRowClick, tableRef, summary, isEntryForm = false, handleAction = () => { }, fullHeight = true }) => {
    const { colors, fonts } = useTheme();
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editedData, setEditedData] = useState<any[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
    const [dropdownOptions, setDropdownOptions] = useState<Record<string, any[]>>({});
    const [loadingDropdowns, setLoadingDropdowns] = useState<Record<string, boolean>>({});
    const { tableStyle } = useAppSelector((state: RootState) => state.common);
    const [sortColumns, setSortColumns] = useState<any[]>([]);

    const rowHeight = tableStyle === 'small' ? 30 : tableStyle === 'medium' ? 40 : 50;
    const screenSize = useScreenSize();
    const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

    // Initialize editedData when data changes
    useEffect(() => {
        setEditedData(data);
        setSelectedRows(new Set()); // Reset selections when data changes
    }, [data]);

    useEffect(() => {
        const preloadDropdowns = () => {
            settings?.EditableColumn?.forEach((field) => {
                if (field.type === 'WDropDownBox' && !field.dependsOn) {
                    setDropdownOptions(prev => ({
                        ...prev,
                        [field.wKey]: field.options || []
                    }));
                }
            });
        };
        preloadDropdowns();
    }, []);

    // Handle save changes
    const handleSaveChanges = () => {
        // Only save selected rows
        const selectedData = editedData.filter((row) => selectedRows.has(row._id));
        console.log('Saving selected changes:', selectedData);
        setIsEditMode(false);
        setSelectedRows(new Set());
    };

    // Handle row selection
    const handleRowSelect = (rowId: string | number) => {
        setSelectedRows(prev => {
            const newSelectedRows = new Set(prev);
            if (newSelectedRows.has(rowId)) {
                newSelectedRows.delete(rowId);
            } else {
                newSelectedRows.add(rowId);
            }
            return newSelectedRows;
        });
    };

    // Handle select all
    const handleSelectAll = () => {
        setSelectedRows(prev => {
            if (prev.size === editedData.length) {
                return new Set();
            }
            return new Set(editedData.map(row => row._id));
        });
    };

    // Handle cell edit
    const handleCellEdit = (rowIndex: number, key: string, value: any) => {
        const newData = [...editedData];
        newData[rowIndex] = {
            ...newData[rowIndex],
            [key]: value
        };
        setEditedData(newData);
    };

    // Format date function
    const formatDateValue = (value: string | number | Date, format: string = 'DD-MM-YYYY'): string => {
        if (!value) return '';

        try {
            // Parse the YYYYMMDD format
            const momentDate = moment(value.toString(), 'YYYYMMDD');

            // Check if the date is valid
            if (!momentDate.isValid()) {
                // Try parsing as a regular date string
                const fallbackDate = moment(value);
                return fallbackDate.isValid() ? fallbackDate.format(format) : '';
            }

            return momentDate.format(format);
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    };

    // New decimal formatting function
    const formatDecimalValue = (value: number | string, decimalPlaces: number): string => {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        try {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            return numValue.toFixed(decimalPlaces);
        } catch (error) {
            console.error('Error formatting decimal:', error);
            return value.toString();
        }
    };

    // New function to get color based on value comparison
    const getValueBasedColor = (
        value: number | string,
        colorRule: ValueBasedColor
    ): string => {
        if (value === null || value === undefined || value === '') {
            return ''; // Default color
        }

        try {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;

            if (isNaN(numValue)) {
                return ''; // Default color for non-numeric values
            }

            if (numValue < colorRule.checkNumber) {
                return colorRule.lessThanColor;
            } else if (numValue > colorRule.checkNumber) {
                return colorRule.greaterThanColor;
            } else {
                return colorRule.equalToColor;
            }
        } catch (error) {
            console.error('Error determining value-based color:', error);
            return ''; // Default color on error
        }
    };

    // Process and format the data
    const formattedData = useMemo(() => {
        if (!data || !Array.isArray(data)) {
            return data;
        }

        return data.map((row, index) => {
            const newRow = { ...row };
            const rowId = row.id || index;

            // Handle date formatting
            if (settings?.dateFormat?.key) {
                const dateColumns = settings.dateFormat.key.split(',').map((key: any) => key.trim());
                const dateFormat = settings.dateFormat.format;

                dateColumns.forEach((column: any) => {
                    if (newRow.hasOwnProperty(column)) {
                        newRow[column] = formatDateValue(newRow[column], dateFormat);
                    }
                });
            }

            // Handle decimal formatting
            if (settings?.decimalColumns && Array.isArray(settings.decimalColumns)) {
                settings.decimalColumns.forEach((decimalSetting: DecimalColumn) => {
                    if (decimalSetting.key) {
                        const decimalColumns = decimalSetting.key.split(',').map((key: any) => key.trim());

                        decimalColumns.forEach((column: any) => {
                            if (newRow.hasOwnProperty(column)) {
                                newRow[column] = formatDecimalValue(newRow[column], decimalSetting.decimalPlaces);
                            }
                        });
                    }
                });
            }

            // Handle value-based text colors
            if (settings?.valueBasedTextColor) {
                settings.valueBasedTextColor.forEach((colorRule: any) => {
                    const columns = colorRule.key.split(',').map((key: any) => key.trim());
                    columns.forEach((column: any) => {
                        if (newRow.hasOwnProperty(column)) {
                            const color = getValueBasedColor(newRow[column], colorRule);
                            if (color) {
                                newRow[column] = <div style={{ color }}>{newRow[column]}</div>;
                            }
                        }
                    });
                });
            }

            return {
                ...newRow,
                _expanded: expandedRows.has(rowId),
                _id: rowId
            };
        });
    }, [data, settings?.dateFormat, settings?.decimalColumns, settings?.valueBasedTextColor, expandedRows]);

    // Dynamically create columns from the first data item
    const columns = useMemo(() => {
        if (!formattedData || formattedData.length === 0) return [];

        // Get columns to hide (if specified in settings)
        const columnsToHide = settings?.hideEntireColumn
            ? settings.hideEntireColumn.split(',').map((col: string) => col.trim())
            : [];

        // Get columns that should be left-aligned even if they contain numbers
        const leftAlignedColumns = settings?.leftAlignedColumns || settings?.leftAlignedColums
            ? (settings?.leftAlignedColumns || settings?.leftAlignedColums).split(',').map((col: string) => col.trim())
            : [];

        // Get columns to show based on screen size
        let columnsToShow: string[] = [];

        if (settings?.mobileColumns && screenSize === 'mobile') {
            columnsToShow = settings.mobileColumns;
        } else if (settings?.tabletColumns && screenSize === 'tablet') {
            columnsToShow = settings.tabletColumns;
        } else if (settings?.webColumns) {
            columnsToShow = settings.webColumns;
        }

        // If no responsive columns are defined, show all columns
        if (columnsToShow.length === 0) {
            columnsToShow = Object.keys(formattedData[0]).filter(key => !key.startsWith('_'));
        }

        // Filter out hidden columns
        columnsToShow = columnsToShow.filter(key => !columnsToHide.includes(key));

        const editableColumns = settings?.EditableColumn || [];
        const editableColumnKeys = editableColumns.map(col => col.wKey);

        const baseColumns: any = [
            {
                key: '_expanded',
                name: '',
                minWidth: 30,
                width: 30,
                colSpan: (props: any) => {
                    if (props.type === 'ROW' && props.row._expanded) {
                        return columnsToShow.length + 1;
                    }
                    return undefined;
                },
                renderCell: ({ row, tabIndex, onRowChange }: any) => {
                    if (row._expanded) {
                        return (
                            <div className="expanded-content" style={{ height: '100%', overflow: 'auto' }}>
                                <div className="expanded-header">
                                    <div
                                        className="expand-button"
                                        onClick={() => {
                                            const newExpandedRows = new Set(expandedRows);
                                            newExpandedRows.delete(row._id);
                                            setExpandedRows(newExpandedRows);
                                        }}
                                    >
                                        ▼
                                    </div>
                                </div>
                                <div className="expanded-details">
                                    {Object.entries(row)
                                        .filter(([key]) => !key.startsWith('_'))
                                        .map(([key, value]) => {
                                            const isLeftAligned = leftAlignedColumns.includes(key);
                                            const isNumericColumn = !isLeftAligned && ['Balance', 'Credit', 'Debit'].includes(key);

                                            let formattedValue: React.ReactNode;
                                            if (React.isValidElement(value)) {
                                                formattedValue = value;
                                            } else if (isNumericColumn) {
                                                const rawValue = React.isValidElement(value) ? (value as StyledValue).props.children : value;
                                                const numValue = parseFloat(String(rawValue).replace(/,/g, ''));

                                                if (!isNaN(numValue)) {
                                                    const formattedNumber = new Intl.NumberFormat('en-IN', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    }).format(numValue);

                                                    const textColor = numValue < 0 ? '#dc2626' :
                                                        numValue > 0 ? '#16a34a' :
                                                            colors.text;

                                                    formattedValue = <div style={{ color: textColor }}>{formattedNumber}</div>;
                                                } else {
                                                    formattedValue = String(value);
                                                }
                                            } else {
                                                formattedValue = String(value);
                                            }

                                            return (
                                                <div key={key} className="expanded-row-item">
                                                    <span className="expanded-row-label">{key}:</span>
                                                    <span className="expanded-row-value">
                                                        {formattedValue}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    {isEntryForm && (
                                        <div className="action-buttons">
                                            <button
                                                className="edit-button"
                                                onClick={() => handleAction('edit', row)}
                                                disabled={row?.isUpdated === "true" ? true : false}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="delete-button"
                                                onClick={() => handleAction('delete', row)}
                                                disabled={row?.isDeleted === "true" ? true : false}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            className="expand-button"
                            onClick={() => {
                                const newExpandedRows = new Set(expandedRows);
                                if (row._expanded) {
                                    newExpandedRows.delete(row._id);
                                } else {
                                    newExpandedRows.add(row._id);
                                }
                                setExpandedRows(newExpandedRows);
                            }}
                        >
                            {row._expanded ? '▼' : '▶'}
                        </div>
                    );
                },
            },
            ...columnsToShow.map((key: any) => {
                const isLeftAligned = leftAlignedColumns.includes(key);
                const isNumericColumn = !isLeftAligned && formattedData.some((row: any) => {
                    const value = row[key];
                    const rawValue = React.isValidElement(value) ? (value as StyledValue).props.children : value;
                    return !isNaN(parseFloat(rawValue)) && isFinite(rawValue);
                });

                const shouldShowTotal = summary?.columnsToShowTotal?.some(
                    (col: any) => col.key === key
                );

                const isEditable = editableColumnKeys.includes(key);
                const editableColumn = editableColumns.find(col => col.wKey === key);

                const renderEditCell = isEditable && isEditMode ? ({ row, onRowChange }) => {
                    const value = editedData.find(r => r._id === row._id)?.[key] || row[key] || '';

                    if (editableColumn?.type === 'WDropDownBox') {
                        const options = dropdownOptions[key] || [];
                        const isLoading = loadingDropdowns[key];

                        if (editableColumn.isMultiple) {
                            const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
                            return (
                                <div className="relative">
                                    <select
                                        value={selectedValues}
                                        onChange={(e) => {
                                            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                                            onRowChange({ ...row, [key]: selectedOptions }, true);
                                            handleDropdownChange(editableColumn, selectedOptions, row);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                        disabled={isLoading}
                                        multiple
                                        autoFocus
                                    >
                                        {options.map((option: any) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {isLoading && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div className="relative">
                                <select
                                    value={value}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        onRowChange({ ...row, [key]: newValue }, true);
                                        handleDropdownChange(editableColumn, newValue, row);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    disabled={isLoading}
                                    autoFocus
                                >
                                    <option value="">Select...</option>
                                    {options.map((option: any) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                {isLoading && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    if (editableColumn?.type === 'WDateBox') {
                        return (
                            <DatePicker
                                selected={value ? new Date(value) : null}
                                onChange={(date: Date) => {
                                    onRowChange({ ...row, [key]: date }, true);
                                }}
                                dateFormat="dd/MM/yyyy"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholderText="Select Date"
                                autoFocus
                            />
                        );
                    }

                    return (
                        <input
                            type={editableColumn?.type === 'WTextBox' ? 'text' : 'number'}
                            value={value}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                onRowChange({ ...row, [key]: newValue }, true);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={editableColumn?.wPlaceholder || ''}
                            autoFocus
                        />
                    );
                } : undefined;

                return {
                    key,
                    name: key,
                    sortable: true,
                    minWidth: 80,
                    maxWidth: 400,
                    resizable: true,
                    headerCellClass: isNumericColumn ? 'numeric-column-header' : '',
                    cellClass: (props: any) => {
                        const classes = [isNumericColumn ? 'numeric-column-cell' : ''];
                        if (isEditable && isEditMode) {
                            classes.push('editable');
                        }
                        return classes.join(' ');
                    },
                    renderSummaryCell: (props: any) => {
                        if (key === 'totalCount' || shouldShowTotal) {
                            return <div className={isNumericColumn ? "numeric-value font-bold" : "font-bold"} style={{ color: colors.text }}>{props.row[key]}</div>;
                        }
                        return <div></div>;
                    },
                    renderEditCell,
                    formatter: (props: any) => {
                        const value = props.row[key];
                        const rawValue = React.isValidElement(value) ? (value as StyledValue).props.children : value;
                        const numValue = parseFloat(rawValue);

                        if (!isNaN(numValue) && !isLeftAligned) {
                            const formattedValue = new Intl.NumberFormat('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }).format(numValue);

                            const textColor = numValue < 0 ? '#dc2626' :
                                numValue > 0 ? '#16a34a' :
                                    colors.text;

                            return <div className="numeric-value" style={{ color: textColor }}>{formattedValue}</div>;
                        }

                        if (React.isValidElement(value)) {
                            const childValue = (value as StyledValue).props.children;
                            const childNumValue = parseFloat(childValue.toString());

                            if (!isNaN(childNumValue) && !isLeftAligned) {
                                return React.cloneElement(value as StyledElement, {
                                    className: "numeric-value",
                                    style: { ...(value as StyledElement).props.style }
                                });
                            }
                            return value;
                        }

                        return value;
                    }
                };
            }),
        ];
        if (isEntryForm) {
            baseColumns.push(
                {
                    key: 'actions',
                    name: 'Actions',
                    minWidth: 170,
                    maxWidth: 350,
                    renderCell: ({ row }: any) => (
                        isEntryForm && (
                            <div className="action-buttons">
                                <button
                                    className="view-button"
                                    style={{}}
                                    onClick={() => handleAction('view', row)}
                                >
                                    view
                                </button>
                                <button
                                    className="edit-button"
                                    style={{}}
                                    onClick={() => handleAction('edit', row)}
                                    disabled={row?.isUpdated === "true" ? true : false}
                                >
                                    Edit
                                </button>
                                <button
                                    className="delete-button"
                                    style={{}}
                                    onClick={() => handleAction('delete', row)}
                                    disabled={row?.isDeleted === "true" ? true : false}
                                >
                                    Delete
                                </button>
                            </div>
                        )
                    ),
                }
            )
        }
        return baseColumns;
    }, [formattedData, colors.text, settings?.hideEntireColumn, settings?.leftAlignedColumns, settings?.leftAlignedColums, summary?.columnsToShowTotal, screenSize, settings?.mobileColumns, settings?.tabletColumns, settings?.webColumns, expandedRows, settings?.EditableColumn, isEditMode]);

    // Sort function
    const sortRows = (initialRows: any[], sortColumns: any[]) => {
        if (sortColumns.length === 0) return initialRows;

        return [...initialRows].sort((a, b) => {
            for (const sort of sortColumns) {
                const { columnKey, direction } = sort;
                if (columnKey.startsWith('_')) continue; // Skip internal columns
                const aValue = a[columnKey];
                const bValue = b[columnKey];

                // Handle React elements (from value-based text color formatting)
                const aActual = React.isValidElement(aValue) ? (aValue as StyledValue).props.children : aValue;
                const bActual = React.isValidElement(bValue) ? (bValue as StyledValue).props.children : bValue;

                // Convert to numbers if possible for comparison
                const aNum = parseFloat(aActual);
                const bNum = parseFloat(bActual);

                if (!isNaN(aNum) && !isNaN(bNum)) {
                    if (aNum !== bNum) {
                        return direction === 'ASC' ? aNum - bNum : bNum - aNum;
                    }
                } else {
                    // Make sure we're comparing strings
                    const aStr = String(aActual ?? '');  // Convert to string explicitly
                    const bStr = String(bActual ?? '');  // Convert to string explicitly
                    const comparison = aStr.localeCompare(bStr);
                    if (comparison !== 0) {
                        return direction === 'ASC' ? comparison : -comparison;
                    }
                }
            }
            return 0;
        });
    };

    const rows = useMemo(() => {
        return sortRows(formattedData, sortColumns);
    }, [formattedData, sortColumns]);

    const summmaryRows = useMemo(() => {
        const totals: Record<string, any> = {
            id: 'summary_row',
            totalCount: rows.length
        };

        // Only calculate totals for columns specified in summary.columnsToShowTotal
        if (summary?.columnsToShowTotal && Array.isArray(summary.columnsToShowTotal)) {
            summary.columnsToShowTotal.forEach(column => {
                if (column.key) {
                    // Calculate the sum for this column
                    const sum = rows.reduce((total, row) => {
                        const value = row[column.key];
                        // Handle React elements (from value-based text color formatting)
                        const actualValue = React.isValidElement(value)
                            ? parseFloat((value as StyledValue).props.children.toString())
                            : parseFloat(value);

                        return !isNaN(actualValue) ? total + actualValue : total;
                    }, 0);

                    // Format the sum with 2 decimal places
                    const formattedSum = sum.toFixed(2);

                    // Apply value-based text color if configured for this column
                    if (settings?.valueBasedTextColor) {
                        const colorRule = settings.valueBasedTextColor.find((rule: ValueBasedColor) => {
                            const columns = rule.key.split(',').map((key: string) => key.trim());
                            return columns.includes(column.key);
                        });

                        if (colorRule) {
                            const color = getValueBasedColor(formattedSum, colorRule);
                            if (color) {
                                totals[column.key] = <div className="numeric-value font-bold" style={{ color }}>{formattedSum}</div>;
                                return;
                            }
                        }
                    }

                    // Default formatting if no color rule applies
                    totals[column.key] = formattedSum;
                }
            });
        }

        return [totals];
    }, [rows, summary?.columnsToShowTotal, settings?.valueBasedTextColor]);

    const handleEditClick = (row: any) => {
        setIsEditMode(true);
        setEditingRowId(row._id);

        // Only set the edited data for the specific row
        const newEditedData = data.map(r => {
            if (r._id === row._id) {
                return { ...r };
            }
            return r;
        });
        setEditedData(newEditedData);

        // Fetch dropdown options only for the row being edited and only if they're not already loaded
        if (settings?.EditableColumn) {
            settings.EditableColumn.forEach(async (field) => {
                if (field.type === 'WDropDownBox' && field.wQuery) {
                    // Only fetch if options are not already loaded
                    if (!dropdownOptions[field.wKey]) {
                        await fetchDropdownOptions(field, row);
                    }
                }
            });
        }
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditingRowId(null);
        setEditedData([]);
    };

    const handleSaveEdit = () => {
        // Save logic here
        setIsEditMode(false);
        setEditingRowId(null);
        setEditedData([]);
    };

    const handleDropdownChange = async (field: any, value: any, row: any) => {
        // Find dependent fields and update them
        const editableColumns = settings?.EditableColumn || [];
        const dependentFields = editableColumns.filter(col =>
            col.dependsOn?.field?.includes(field.wKey)
        );

        // Clear dependent field values
        dependentFields.forEach(depField => {
            const newData = editedData.map(r => {
                if (r._id === row._id) {
                    return { ...r, [depField.wKey]: depField.isMultiple ? [] : '' };
                }
                return r;
            });
            // setEditedData(newData);
            setDropdownOptions(prev => ({ ...prev, [depField.wKey]: [] }));
        });

        // Fetch new options for dependent fields
        for (const depField of dependentFields) {
            const dependencyValues = { ...row, [field.wKey]: value };
            if (field.isMultiple && Array.isArray(value)) {
                dependencyValues[field.wKey] = value.join('|');
            }
            await fetchDependentOptions(depField, dependencyValues);
        }
    };

    const fetchDependentOptions = async (field: any, parentValue: string | Record<string, any>) => {
        if (!field.dependsOn) return;

        try {
            setLoadingDropdowns(prev => ({ ...prev, [field.wKey]: true }));

            let jUi, jApi;

            if (typeof field.dependsOn.wQuery.J_Ui === 'object') {
                const uiObj = field.dependsOn.wQuery.J_Ui;
                jUi = Object.keys(uiObj)
                    .map(key => `"${key}":"${uiObj[key]}"`)
                    .join(',');
            } else {
                jUi = field.dependsOn.wQuery.J_Ui;
            }

            if (typeof field.dependsOn.wQuery.J_Api === 'object') {
                const apiObj = field.dependsOn.wQuery.J_Api;
                jApi = Object.keys(apiObj)
                    .map(key => `"${key}":"${apiObj[key]}"`)
                    .join(',');
            } else {
                jApi = field.dependsOn.wQuery.J_Api;
            }

            let xmlFilterContent = '';

            if (Array.isArray(field.dependsOn.field)) {
                if (field.dependsOn.wQuery.X_Filter_Multiple) {
                    xmlFilterContent = field.dependsOn.wQuery.X_Filter_Multiple;
                    field.dependsOn.field.forEach(fieldName => {
                        const value = typeof parentValue === 'object' ? parentValue[fieldName] : '';
                        xmlFilterContent = xmlFilterContent.replace(`\${${fieldName}}`, value);
                    });
                } else {
                    xmlFilterContent = field.dependsOn.wQuery.X_Filter || '';
                    field.dependsOn.field.forEach(fieldName => {
                        const value = typeof parentValue === 'object' ? parentValue[fieldName] : '';
                        xmlFilterContent = xmlFilterContent.replace(`\${${fieldName}}`, value);
                    });
                }
            } else {
                xmlFilterContent = typeof parentValue === 'string' ? parentValue : '';
            }

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${field.dependsOn.wQuery.Sql || ''}</Sql>
                ${Array.isArray(field.dependsOn.field) && field.dependsOn.wQuery.X_Filter_Multiple
                    ? `<X_Filter_Multiple>${xmlFilterContent}</X_Filter_Multiple><X_Filter></X_Filter>`
                    : `<X_Filter>${xmlFilterContent}</X_Filter>`
                }
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });

            const rs0Data = response.data?.data?.rs0;
            if (!Array.isArray(rs0Data)) {
                console.error('Unexpected data format:', response.data);
                return [];
            }

            const keyField = field.wDropDownKey?.key || 'DisplayName';
            const valueField = field.wDropDownKey?.value || 'Value';

            const options = rs0Data.map(dataItem => ({
                label: dataItem[keyField],
                value: dataItem[valueField]
            }));

            setDropdownOptions(prev => ({ ...prev, [field.wKey]: options }));
            return options;
        } catch (error) {
            console.error('Error fetching dependent options:', error);
            return [];
        } finally {
            setLoadingDropdowns(prev => ({ ...prev, [field.wKey]: false }));
        }
    };

    // Update fetchDropdownOptions to handle existing options
    const fetchDropdownOptions = async (field: any, row: any) => {
        // If options are already loaded, return them
        if (dropdownOptions[field.wKey]) {
            return dropdownOptions[field.wKey];
        }

        try {
            setLoadingDropdowns(prev => ({ ...prev, [field.wKey]: true }));

            let jUi, jApi;

            if (typeof field.wQuery.J_Ui === 'object') {
                const uiObj = field.wQuery.J_Ui;
                jUi = Object.keys(uiObj)
                    .map(key => `"${key}":"${uiObj[key]}"`)
                    .join(',');
            } else {
                jUi = field.wQuery.J_Ui;
            }

            if (typeof field.wQuery.J_Api === 'object') {
                const apiObj = field.wQuery.J_Api;
                jApi = Object.keys(apiObj)
                    .map(key => `"${key}":"${apiObj[key]}"`)
                    .join(',');
            } else {
                jApi = field.wQuery.J_Api;
            }

            let xmlFilterContent = '';

            if (Array.isArray(field.dependsOn?.field)) {
                if (field.dependsOn.wQuery.X_Filter_Multiple) {
                    xmlFilterContent = field.dependsOn.wQuery.X_Filter_Multiple;
                    field.dependsOn.field.forEach(fieldName => {
                        const value = row[fieldName] || '';
                        xmlFilterContent = xmlFilterContent.replace(`\${${fieldName}}`, value);
                    });
                } else {
                    xmlFilterContent = field.dependsOn.wQuery.X_Filter || '';
                    field.dependsOn.field.forEach(fieldName => {
                        const value = row[fieldName] || '';
                        xmlFilterContent = xmlFilterContent.replace(`\${${fieldName}}`, value);
                    });
                }
            } else {
                xmlFilterContent = field.wQuery.X_Filter || '';
            }

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${field.wQuery.Sql || ''}</Sql>
                ${Array.isArray(field.dependsOn?.field) && field.dependsOn.wQuery.X_Filter_Multiple
                    ? `<X_Filter_Multiple>${xmlFilterContent}</X_Filter_Multiple><X_Filter></X_Filter>`
                    : `<X_Filter>${xmlFilterContent}</X_Filter>`
                }
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });

            const rs0Data = response.data?.data?.rs0;
            if (!Array.isArray(rs0Data)) {
                console.error('Unexpected data format:', response.data);
                return [];
            }

            const keyField = field.wDropDownKey?.key || 'DisplayName';
            const valueField = field.wDropDownKey?.value || 'Value';

            const options = rs0Data.map(dataItem => ({
                label: dataItem[keyField],
                value: dataItem[valueField]
            }));

            setDropdownOptions(prev => ({ ...prev, [field.wKey]: options }));
            return options;
        } catch (error) {
            console.error('Error fetching dropdown options:', error);
            return [];
        } finally {
            setLoadingDropdowns(prev => ({ ...prev, [field.wKey]: false }));
        }
    };

    return (
        <div
            ref={tableRef}
            style={{ height: fullHeight ? 'calc(100vh - 170px)' : 'auto', width: '100%' }}
        >
            {settings?.EditableColumn && settings.EditableColumn.length > 0 && (
                <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    {isEditMode && (
                        <div style={{ marginRight: 'auto' }}>
                            <span style={{ marginRight: '10px' }}>
                                {selectedRows.size} rows selected
                            </span>
                            <button
                                onClick={handleSelectAll}
                                style={{
                                    padding: '4px 8px',
                                    backgroundColor: colors.primary,
                                    color: colors.buttonText,
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                {selectedRows.size === editedData.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => isEditMode ? handleSaveChanges() : setIsEditMode(true)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: isEditMode ? colors.errorText : colors.primary,
                            color: colors.buttonText,
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {isEditMode ? 'Save' : 'Edit'}
                    </button>
                </div>
            )}
            <DataGrid
                columns={[
                    {
                        key: 'select',
                        name: '',
                        width: 40,
                        frozen: true,
                        renderCell: ({ row }) => (
                            isEditMode ? (
                                <input
                                    type="checkbox"
                                    checked={selectedRows.has(row._id)}
                                    onChange={() => handleRowSelect(row._id)}
                                    style={{
                                        width: '16px',
                                        height: '16px',
                                        cursor: 'pointer'
                                    }}
                                />
                            ) : null
                        ),
                        renderSummaryCell: () => null
                    },
                    ...columns
                ]}
                rows={isEditMode ? editedData : data}
                sortColumns={sortColumns}
                onSortColumnsChange={setSortColumns}
                className="rdg-light"
                rowHeight={(row) => row._expanded ? 200 : rowHeight}
                headerRowHeight={rowHeight}
                style={{
                    backgroundColor: colors.background,
                    color: colors.text,
                    fontFamily: fonts.content,
                }}
                bottomSummaryRows={summmaryRows}
                onRowsChange={(newRows) => {
                    if (isEditMode) {
                        setEditedData(newRows);
                    }
                }}
                onCellClick={(props: any) => {
                    if (!isEditMode && onRowClick && !props.column.key.startsWith('_') && !isEntryForm) {
                        const { _id, _expanded, ...rowData } = rows[props.rowIdx];
                        onRowClick(rowData);
                    }
                }}
            />
            <style jsx global>{`
                .rdg {
                    block-size: 100%;
                    border: 1px solid ${colors.textInputBorder};
                    --rdg-header-background-color: ${colors.primary};
                    --rdg-header-row-color: ${colors.buttonText};
                    --rdg-background-color: ${colors.background};
                    --rdg-row-hover-background-color: ${colors.color1};
                }
                
                .rdg-header-row {
                    background-color: ${colors.primary};
                    color: ${colors.buttonText};
                    font-weight: 600;
                }

                .rdg-cell {
                    border-right: 1px solid ${colors.textInputBorder};
                    border-bottom: 1px solid ${colors.textInputBorder};
                    padding: 0 8px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    color: ${colors.text};
                }

                .numeric-column-header, .numeric-column-cell {
                    text-align: right !important;
                }

                .numeric-value {
                    text-align: right !important;
                    width: 100% !important;
                    display: block !important;
                }

                .rdg-row {
                    cursor: ${isEditMode ? 'default' : (onRowClick ? 'pointer' : 'default')};
                }

                .rdg-row:nth-child(even) {
                    background-color: ${colors.evenCardBackground};
                }

                .rdg-row:nth-child(odd) {
                    background-color: ${colors.oddCardBackground};
                }

                .rdg-row:hover {
                    background-color: ${colors.color1} !important;
                }

                .rdg-header-sort-cell {
                    cursor: pointer;
                }

                .rdg-header-sort-cell:hover {
                    background-color: ${colors.primary}dd;
                }

                .expanded-content {
                    position: relative;
                    width: 100%;
                    min-height: 200px;
                    background-color: ${colors.background};
                    border: 1px solid ${colors.textInputBorder};
                    margin-top: 4px;
                }

                .expanded-header {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: ${colors.background};
                    border-right: 1px solid ${colors.textInputBorder};
                    border-bottom: 1px solid ${colors.textInputBorder};
                }

                .expanded-details {
                    padding: 16px 16px 16px 46px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .expanded-row-item {
                    display: flex;
                    align-items: flex-start;
                }

                .expanded-row-label {
                    font-weight: bold;
                    min-width: 150px;
                    color: ${colors.text};
                    padding-right: 16px;
                }

                .expanded-row-value {
                    color: ${colors.text};
                    flex: 1;
                    word-break: break-word;
                    display: flex;
                    align-items: center;
                }

                .expanded-row-value > div {
                    display: inline;
                    width: 100%;
                }

                .expand-button {
                    cursor: pointer;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    background-color: transparent;
                    border: none;
                    color: ${colors.text};
                }

                .expand-button:hover {
                    background-color: ${colors.color1};
                }

                .action-buttons {
                    display: flex;
                    gap: 8px;
                }

                .edit-button, .delete-button, .view-button {
                    padding: 4px 10px;
                    border: none;
                    cursor: pointer;
                    font-size: 12px;
                    border-radius: 4px;
                    transition: background-color 0.2s ease; 
                }
                
                .edit-button:disabled, 
                .delete-button:disabled {
                    background-color: #e0e0e0;
                    color: #a0a0a0;
                    cursor: not-allowed;
                }
                .view-button {
                    background-color: ${colors.primary};
                    color: ${colors.buttonText};
                }
                .edit-button {
                    background-color: ${colors.buttonBackground};
                    color: ${colors.buttonText};
                }

                .delete-button {
                    background-color: ${colors.errorText};
                    color: ${colors.buttonText};
                }

                .rdg-cell.editable {
                    cursor: text;
                }
                .rdg-cell.editable:hover {
                    background-color: ${colors.color1};
                }
                .rdg-cell.editing {
                    padding: 0;
                }
                .rdg-cell.editing input {
                    width: 100%;
                    height: 100%;
                    padding: 4px;
                    border: 2px solid ${colors.primary};
                    background-color: ${colors.background};
                    color: ${colors.text};
                }
                .rdg-row.selected {
                    background-color: ${colors.color1} !important;
                }
            `}</style>
        </div>
    );
};

export const exportTableToExcel = async (
    gridEl: HTMLDivElement | null,
    headerData: any,
    apiData: any,
    pageData: any,
    appMetadata: any
) => {
    if (!apiData || apiData.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    const levelData = pageData[0]?.levels[0] || {};
    const settings = levelData.settings || {};
    const columnsToShowTotal = levelData.summary?.columnsToShowTotal || [];
    const dateFormatMap: Record<string, string> = {};

    const dateFormatSetting = settings.dateFormat;
    if (Array.isArray(dateFormatSetting)) {
        dateFormatSetting.forEach((df: { key: string; format: string }) => {
            const normKey = df.key.replace(/\s+/g, '');
            dateFormatMap[normKey] = df.format;
        });
    } else if (typeof dateFormatSetting === 'object' && dateFormatSetting !== null) {
        const normKey = dateFormatSetting.key.replace(/\s+/g, '');
        dateFormatMap[normKey] = dateFormatSetting.format;
    }


    const companyName = headerData.CompanyName?.[0] || "Company Name";
    const reportHeader = headerData.ReportHeader?.[0] || "Report Header";
    const rightList: string[] = headerData.RightList?.[0] || [];
    const normalizedRightList = rightList.map(k => k.replace(/\s+/g, ''));

    let [fileTitle] = reportHeader.split("From Date");
    fileTitle = fileTitle?.trim() || "Report";

    const headers = Object.keys(apiData[0] || {});
    const hiddenColumns = settings.hideEntireColumn?.split(",") || [];
    const filteredHeaders = headers.filter(header => !hiddenColumns.includes(header.trim()));

    const decimalColumnsMap: Record<string, number> = {};
    (settings.decimalColumns || []).forEach((col: { key: string; decimalPlaces: number }) => {
        const columnKeys = col.key.split(",").map(k => k.trim().replace(/\s+/g, ''));
        columnKeys.forEach(key => {
            if (key) decimalColumnsMap[key] = col.decimalPlaces;
        });
    });

    const totals: Record<string, number> = {};
    const totalLabels: Record<string, string> = {};
    columnsToShowTotal.forEach(({ key, label }: { key: string; label: string }) => {
        const normKey = key.replace(/\s+/g, '');
        totals[normKey] = 0;
        totalLabels[normKey] = label;
    });

    // Convert BMP to PNG and add logo
    const bmpBase64 = appMetadata.companyLogo;
    const pngBase64 = await convertBmpToPng(bmpBase64);
    const imageId = workbook.addImage({ base64: pngBase64, extension: 'png' });
    worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 80 } });

    let rowCursor = 1;

    worksheet.getCell(`D${rowCursor}`).value = companyName;
    worksheet.getCell(`D${rowCursor}`).font = { bold: true };
    rowCursor++;

    reportHeader.split("\\n").forEach(line => {
        worksheet.getCell(`D${rowCursor}`).value = line.trim();
        rowCursor++;
    });

    rowCursor++;

    // Header Row
    const headerRow = worksheet.getRow(rowCursor);
    filteredHeaders.forEach((header, colIdx) => {
        const normKey = header.replace(/\s+/g, '');
        const cell = headerRow.getCell(colIdx + 1);
        cell.value = header;
        cell.alignment = { horizontal: normalizedRightList.includes(normKey) ? 'right' : 'left' };
        cell.font = { bold: true };
    });
    headerRow.commit();
    rowCursor++;

    // Data Rows
    apiData.forEach(row => {
        const currentRow = worksheet.getRow(rowCursor);

        filteredHeaders.forEach((header, colIdx) => {
            const normKey = header.replace(/\s+/g, '');
            const originalKey = Object.keys(row).find(k => k.replace(/\s+/g, '') === normKey);
            let value = originalKey ? row[originalKey] : "";

            // Format decimals
            if (decimalColumnsMap[normKey] !== undefined && !isNaN(parseFloat(value))) {
                const fixed = parseFloat(value).toFixed(decimalColumnsMap[normKey]);
                if (totals.hasOwnProperty(normKey)) {
                    totals[normKey] += parseFloat(fixed);
                }
                value = fixed;
            }

            // Format date
            if (dateFormatMap[normKey] && value) {
                value = dayjs(value).format(dateFormatMap[normKey]);
            }

            const cell = currentRow.getCell(colIdx + 1);
            cell.value = isNaN(value) || typeof value === 'string' ? value : Number(value);
            cell.alignment = {
                horizontal: normalizedRightList.includes(normKey) ? 'right' : 'left'
            };
        });

        currentRow.commit();
        rowCursor++;
    });

    // Total Row
    const totalRow = worksheet.getRow(rowCursor);
    filteredHeaders.forEach((header, colIdx) => {
        const normKey = header.replace(/\s+/g, '');
        const cell = totalRow.getCell(colIdx + 1);

        if (colIdx === 0) {
            cell.value = 'Total';
        } else if (totals.hasOwnProperty(normKey)) {
            cell.value = totals[normKey].toFixed(decimalColumnsMap[normKey] ?? 0);
        } else {
            cell.value = '';
        }

        cell.alignment = {
            horizontal: normalizedRightList.includes(normKey) ? 'right' : 'left'
        };
        cell.font = { bold: true };
    });
    totalRow.commit();

    // Export file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, `${fileTitle.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);
};

export const exportTableToCsv = (
    gridEl: HTMLDivElement | null,
    headerData: any,
    apiData: any,
    pageData: any
) => {
    if (!apiData || apiData.length === 0) return;

    const levelData = pageData[0]?.levels[0] || {};
    const settings = levelData.settings || {};
    const columnsToShowTotal = levelData.summary?.columnsToShowTotal || [];

    // Extract report details
    const companyName = headerData.CompanyName?.[0] || "Company Name";
    const reportHeader = headerData.ReportHeader?.[0] || "Report Header";

    // Split Report Header before "From Date"
    let [fileTitle] = reportHeader.split("From Date");
    fileTitle = fileTitle?.trim() || "Report"; // Fallback title

    // **1. Get all available headers from API data**
    const headers = Object.keys(apiData[0] || {});

    // **2. Remove columns mentioned in hideEntireColumn**
    const hiddenColumns = settings.hideEntireColumn?.split(",") || [];
    const filteredHeaders = headers.filter(header => !hiddenColumns.includes(header.trim()));

    // **3. Decimal Formatting Logic (Bind Dynamically)**

    const decimalColumnsMap: Record<string, number> = {};
    settings.decimalColumns?.forEach((col: { key: string; decimalPlaces: number }) => {
        const columnKeys = col.key.split(",").map(k => k.trim());
        columnKeys.forEach(key => {
            if (key) decimalColumnsMap[key] = col.decimalPlaces;
        });
    });

    // **4. Initialize totals (only for columns in columnsToShowTotal)**
    const totals: Record<string, number> = {};
    const totalLabels: Record<string, string> = {};

    columnsToShowTotal.forEach(({ key, label }: { key: string; label: string }) => {
        totals[key] = 0;
        totalLabels[key] = label;
    });

    // **5. Prepare table body rows with decimal formatting & total calculation**

    const bodyRows = apiData.map(row =>
        filteredHeaders.map(header => {
            let value = row[header] ?? "";

            // Apply decimal formatting if needed
            if (decimalColumnsMap[header] && !isNaN(parseFloat(value))) {
                value = parseFloat(value).toFixed(decimalColumnsMap[header]);

                // Add to total if the column is in columnsToShowTotal
                if (totals.hasOwnProperty(header)) {
                    totals[header] += parseFloat(value);
                }
            }

            return `"${value}"`;
        }).join(',')
    );


    // **6. Format total row (only for selected columns)**
    const totalRow = filteredHeaders.map(header => {
        if (totals[header] !== undefined) {
            return `"${totals[header].toFixed(decimalColumnsMap[header] || 0)}"`; // Apply decimals if specified
        }
        return '""'; // Empty for non-numeric columns
    }).join(',');

    // **7. Center Company Name in CSV**
    const startColumnIndex = 1;
    const centerText = (text: string, columnWidth: number) => {
        const padding = Math.max(0, Math.floor((columnWidth - text.length) / 2));
        return `${' '.repeat(padding)}${text}${' '.repeat(padding)}`;
    };

    const formattedCompanyName = [
        ...Array(startColumnIndex).fill('""'), // Empty columns for shifting to column E
        `"${centerText(companyName, 20)}"`
    ].join(',');

    // **8. Handle multiline Report Header**
    const reportHeaderLines = reportHeader.split("\\n").map(line =>
        [
            ...Array(startColumnIndex).fill('""'),
            `"${line.trim()}"`
        ].join(',')
    );

    // **9. Prepare CSV content**
    const csvContent = [
        formattedCompanyName,   // Line 1: Company Name (Centered)
        ...reportHeaderLines,   // Line 2+: Report Header (Shifted)
        '',                     // Empty row for spacing
        filteredHeaders.map(header => `"${header}"`).join(','), // Table Header
        ...bodyRows,            // Table Data
        totalRow                // Total Row at the End
    ].join('\n');

    // **10. Construct the filename dynamically**
    const filename = `${fileTitle.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;

    // **11. Download CSV file**
    downloadFile(
        filename,
        new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    );
};


// pdfMake.vfs = pdfFonts?.pdfMake?.vfs;
pdfMake.vfs = pdfFonts.vfs;

const convertBmpToPng = (bmpBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Canvas context is null');
            ctx.drawImage(image, 0, 0);
            const pngBase64 = canvas.toDataURL('image/png');
            resolve(pngBase64);
        };
        image.onerror = reject;
        image.src = 'data:image/bmp;base64,' + bmpBase64;
    });
};


export const exportTableToPdf = async (
    gridEl: HTMLDivElement | null,
    jsonData: any,
    appMetadata: any,
    allData: any[],
    pageData: any,
    filters: any,
    currentLevel: any,
    mode: 'download' | 'email',
) => {
    if (!allData || allData.length === 0) return;

    if (mode === 'email') {
        const confirmSend = window.confirm('Do you want to send mail?');
        if (!confirmSend) return;
    }

    const decimalSettings = pageData[0]?.levels?.[0]?.settings?.decimalColumns || [];
    const columnsToHide = pageData[0]?.levels?.[0]?.settings?.hideEntireColumn?.split(',') || [];
    const totalColumns = pageData[0]?.levels?.[0]?.summary?.columnsToShowTotal || [];

    const decimalMap: Record<string, number> = {};
    decimalSettings.forEach(({ key, decimalPlaces }: any) => {
        key.split(',').forEach((k: string) => {
            const cleanKey = k.trim();
            if (cleanKey) decimalMap[cleanKey] = decimalPlaces;
        });
    });

    const headers = Object.keys(allData[0]).filter(key => !columnsToHide.includes(key));
    const rightAlignedKeys: string[] = jsonData?.RightList?.[0] || [];

    const reportHeader = (jsonData?.ReportHeader?.[0] || '').replace(/\\n/g, '\n');
    let fileTitle = 'Report';
    let dateRange = '';
    let clientName = '';
    let clientCode = '';

    if (reportHeader.includes('From Date')) {
        const [left, right] = reportHeader.split('From Date');
        fileTitle = left.trim();
        const [range, clientLine] = right.split('\n');
        dateRange = `From Date${range?.trim() ? ' ' + range.trim() : ''}`;

        if (clientLine) {
            const match = clientLine.trim().match(/^(.*)\((.*)\)$/);
            if (match) {
                clientName = match[1].trim();
                clientCode = match[2].trim();
            } else {
                clientName = clientLine.trim();
            }
        }
    }

    const totals: Record<string, number> = {};
    totalColumns.forEach(col => (totals[col.key] = 0));

    const formatValue = (value: any, key: string) => {
        if (key.toLowerCase() === 'date') {
            const date = new Date(value);
            return isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB');
        }

        if (decimalMap[key]) {
            const num = parseFloat(String(value).replace(/,/g, ''));
            const safeNum = isNaN(num) ? 0 : num;
            if (totals.hasOwnProperty(key)) totals[key] += safeNum;
            return safeNum.toFixed(decimalMap[key]);
        }

        return value !== null && value !== undefined ? String(value) : '';
    };

    const tableBody = [];


    tableBody.push(
        headers.map(key => {
            const normalizedKey = key.replace(/\s+/g, '');
            return {
                text: key,
                bold: true,
                fillColor: '#eeeeee',
                alignment: rightAlignedKeys.includes(normalizedKey) ? 'right' : 'left',
            };
        })
    );


    // Data rows
    allData.forEach(row => {
        const rowData = headers.map(key => {
            const normalizedKey = key.replace(/\s+/g, '');
            return {
                text: formatValue(row[key], key),
                alignment: rightAlignedKeys.includes(normalizedKey) ? 'right' : 'left',
            };
        });
        tableBody.push(rowData);
    });

    const totalRow = headers.map(key => {
        const normalizedKey = key.replace(/\s+/g, '');
        const isTotalCol = totalColumns.find(col => col.key.replace(/\s+/g, '') === normalizedKey);
        return {
            text: isTotalCol ? totals[key].toFixed(decimalMap[key] || 2) : '',
            bold: true,
            alignment: rightAlignedKeys.includes(normalizedKey) ? 'right' : 'left',
        };
    });
    tableBody.push(totalRow);


    const columnCount = headers.length;
    const columnWidth = (100 / columnCount).toFixed(2) + '%';

    // Convert BMP logo if available
    let logoImage = '';
    if (appMetadata?.companyLogo) {
        try {
            logoImage = await convertBmpToPng(appMetadata.companyLogo);
        } catch (err) {
            console.warn('Logo conversion failed:', err);
        }
    }

    const docDefinition: any = {
        content: [
            {
                columns: [
                    logoImage
                        ? {
                            image: logoImage,
                            width: 60,
                            height: 40,
                            margin: [0, 0, 10, 0],
                        }
                        : {},
                    {
                        stack: [
                            { text: jsonData?.CompanyName?.[0] || '', style: 'header' },
                            { text: `${fileTitle} ${dateRange}`, style: 'subheader' },
                            { text: `${clientName} (${clientCode})`, style: 'small' },
                        ],
                        alignment: 'center',
                        width: '*',
                    },
                    { text: '', width: 60 },
                ]
            },
            {
                style: 'tableStyle',
                table: {
                    headerRows: 1,
                    widths: headers.map(() => columnWidth),
                    body: tableBody,
                },
                layout: {
                    paddingLeft: () => 2,
                    paddingRight: () => 2,
                    paddingTop: () => 2,
                    paddingBottom: () => 2,
                    fillColor: (rowIndex: number) =>
                        rowIndex === tableBody.length - 1 ? '#e8f4ff' : null,
                },
            },
        ],
        styles: {
            header: { fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 2] },
            subheader: { fontSize: 10, alignment: 'center', margin: [0, 0, 0, 2] },
            small: { fontSize: 9, alignment: 'center', margin: [0, 0, 0, 6] },
            tableStyle: { fontSize: 8, margin: [0, 2, 0, 2] },
        },
        footer: function (currentPage: number, pageCount: number) {
            const now = new Date().toLocaleString('en-GB');
            return {
                columns: [
                    { text: `Printed on: ${now}`, alignment: 'left', margin: [40, 0] },
                    { text: `${ACTION_NAME}[Page ${currentPage} of ${pageCount}]`, alignment: 'right', margin: [0, 0, 40, 0] },
                ],
                fontSize: 8,
            };
        },
        pageOrientation: 'landscape',
        pageSize: headers.length > 15 ? 'A3' : 'A4',

    };

    if (mode === 'download') {
        pdfMake.createPdf(docDefinition).download(`${fileTitle}.pdf`);

    } else if (mode === 'email') {
        pdfMake.createPdf(docDefinition).getBase64(async (base64Data: string) => {
            try {
                const userId = localStorage.getItem('userId') || '';
                const authToken = document.cookie.split('auth_token=')[1]?.split(';')[0] || '';

                let filterXml;

                if (filters && Object.keys(filters).length > 0) {
                    filterXml = Object.entries(filters).map(([key, value]) => {
                        if ((key === 'FromDate' || key === 'ToDate') && value) {
                            const date = new Date(String(value));
                            if (!isNaN(date.getTime())) {
                                // Format as YYYYMMDD in local timezone
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const formatted = `${year}${month}${day}`;
                                return `<${key}>${formatted}</${key}>`;
                            }
                        }
                        return `<${key}>${value}</${key}>`;
                    }).join('\n');
                }
                else {
                    filterXml = `<ClientCode>${userId}</ClientCode>`;
                }

                const xmlData1 = `
                    <dsXml>
                    <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"EmailSend","RequestFrom":"W"</J_Ui>
                    <Sql></Sql>
                    <X_Filter>
                    ${filterXml}
                        <ReportName>${fileTitle}</ReportName>
                        <FileName>${fileTitle}.PDF</FileName>
                        <Base64>${base64Data}</Base64>
                    </X_Filter>
                    <J_Api>"UserId":"${userId}","UserType":"Client","AccYear":24,"MyDbPrefix":"SVVS","MemberCode":"undefined","SecretKey":"undefined", "UserType":"${localStorage.getItem('userType')}"</J_Api>
                    </dsXml>`;

                const response = await axios.post(BASE_URL + PATH_URL, xmlData1, {
                    headers: {
                        'Content-Type': 'application/xml',
                        Authorization: `Bearer ${authToken}`,
                    },
                    timeout: 300000,
                });
                // Handle based on success and specific message content
                const result = response?.data;
                // Get Column1 message if present
                const columnMsg = result?.data?.rs0?.[0]?.Column1 || '';
                if (result?.success) {
                    if (columnMsg.toLowerCase().includes('mail template not define')) {
                        alert('Mail Template Not Defined');
                    } else {
                        alert(columnMsg);
                    }
                } else {
                    // Show error message if available, fallback to default
                    alert(columnMsg || result?.message);
                }
            } catch (err) {
                console.error(err);
                alert('Failed to send email.');
            }
        });
    }
};

export const downloadOption = async (
    jsonData: any,
    appMetadata: any,
    allData: any[],
    pageData: any,
    filters: any,
    currentLevel: any,
) => {

    const userId = localStorage.getItem('userId') || '';
    const authToken = document.cookie.split('auth_token=')[1]?.split(';')[0] || '';
    let filterXml;

    if (filters && Object.keys(filters).length > 0) {
        filterXml = Object.entries(filters).map(([key, value]) => {
            if ((key === 'FromDate' || key === 'ToDate') && value) {
                const date = new Date(String(value));
                if (!isNaN(date.getTime())) {
                    // Format as YYYYMMDD in local timezone
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const formatted = `${year}${month}${day}`;
                    return `<${key}>${formatted}</${key}>`;
                }
            }
            return `<${key}>${value}</${key}>`;
        }).join('\n');
    }

    const xmlData1 = `
    <dsXml>
    <J_Ui>${JSON.stringify(pageData[0].levels[currentLevel].J_Ui).slice(1, -1)},"ReportDisplay":"D"</J_Ui>
    <Sql></Sql>
    <X_Filter>
    ${filterXml}
    </X_Filter>
    <J_Api>"UserId":"${userId}","UserType":"${localStorage.getItem('userType')}","AccYear":24,"MyDbPrefix":"SVVS","MemberCode":"undefined","SecretKey":"undefined"</J_Api>
    </dsXml>`;

    try {
        const response = await axios.post(BASE_URL + PATH_URL, xmlData1, {
            headers: {
                'Content-Type': 'application/xml',
                Authorization: `Bearer ${authToken}`,
            },
            timeout: 300000,
        });

        // Pull out the first rs0 entry
        const rs0 = response.data?.data?.rs0;
        if (Array.isArray(rs0) && rs0.length > 0) {
            const { PDFName, Base64PDF } = rs0[0];
            if (PDFName && Base64PDF) {
                // Kick off the download
                downloadPdf(PDFName, Base64PDF);
            } else {
                console.error('Response missing PDFName or Base64PDF');
            }
        } else {
            console.error('Unexpected response format:', response.data);
        }
    } catch (err) {
        alert('Not available Donwload');
    }

}

export default DataTable;