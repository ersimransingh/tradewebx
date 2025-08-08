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
import { buildFilterXml } from '@/utils/helper';
import { toast } from "react-toastify";
import TableStyling from './ui/table/TableStyling';
import apiService from '@/utils/apiService';

interface DataTableProps {
    data: any[];
    settings?: {
        hideEntireColumn?: string;
        leftAlignedColumns?: string;
        leftAlignedColums?: string;
        mobileColumns?: string[];
        tabletColumns?: string[];
        webColumns?: string[];
        columnWidth?: Array<{
            key: string;
            width: number;
        }>;
        [key: string]: any;
    };
    onRowClick?: (record: any) => void;
    onRowSelect?: (selectedRows: any[]) => void;
    tableRef?: React.RefObject<HTMLDivElement>;
    summary?: any;
    isEntryForm?: boolean;
    handleAction?: (action: string, record: any) => void;
    fullHeight?: boolean;
    showViewDocument?: boolean;
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

const DataTable: React.FC<DataTableProps> = ({ data, settings, onRowClick, onRowSelect, tableRef, summary, isEntryForm = false, handleAction = () => { }, fullHeight = true, showViewDocument = false }) => {
    const { colors, fonts } = useTheme();
    const [sortColumns, setSortColumns] = useState<any[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);

    const { tableStyle } = useAppSelector((state: RootState) => state.common);

    const rowHeight = tableStyle === 'small' ? 30 : tableStyle === 'medium' ? 40 : 50;
    const screenSize = useScreenSize();
    const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

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
                ...settings?.EditableColumn ? { _select: selectedRows.some((r) => r._id === rowId) } : {},
                _expanded: expandedRows.has(rowId),
                _id: rowId
            };
        });
    }, [data, settings?.dateFormat, settings?.decimalColumns, settings?.valueBasedTextColor, expandedRows, selectedRows]);

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

        // Create column width mapping from settings
        const columnWidthMap: Record<string, number> = {};
        if (settings?.columnWidth && Array.isArray(settings.columnWidth)) {
            settings.columnWidth.forEach((widthConfig: { key: string; width: number }) => {
                if (widthConfig.key && widthConfig.width) {
                    // Handle comma-separated column names
                    const columnNames = widthConfig.key.split(',').map((name: string) => name.trim());
                    columnNames.forEach((columnName: string) => {
                        if (columnName) {
                            columnWidthMap[columnName] = widthConfig.width;
                        }
                    });
                }
            });
        }

        // Get available columns from the actual data
        const availableColumns = formattedData.length > 0 ? Object.keys(formattedData[0]).filter(key => !key.startsWith('_')) : [];

        // Get columns to show based on screen size
        let columnsToShow: string[] = [];

        if (settings?.mobileColumns && screenSize === 'mobile') {
            columnsToShow = settings.mobileColumns;
            console.log('Using mobile columns:', columnsToShow);
        } else if (settings?.tabletColumns && screenSize === 'tablet') {
            columnsToShow = settings.tabletColumns;
            console.log('Using tablet columns:', columnsToShow);
        } else if (settings?.webColumns) {
            columnsToShow = settings.webColumns;
            console.log('Using web columns:', columnsToShow);
        }

        // If no responsive columns are defined, show all columns
        if (columnsToShow.length === 0) {
            columnsToShow = availableColumns;
            console.log('No responsive columns defined, using all columns:', columnsToShow);
        }

        // Filter out columns that don't exist in the actual data
        columnsToShow = columnsToShow.filter(key => availableColumns.includes(key));
        console.log('Filtered columns to only include existing ones:', columnsToShow);

        // Filter out hidden columns
        columnsToShow = columnsToShow.filter(key => !columnsToHide.includes(key));

        const baseColumns: any = [
            ...(settings?.EditableColumn
                ? [{
                    key: "_select",
                    name: "",
                    minWidth: 30,
                    width: 30,
                    renderHeaderCell: () => {
                        const allIds = rows.map(r => r._id);
                        const selectedIds = selectedRows.map(r => r._id);
                        const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));

                        // Don't show header checkbox for single selection mode
                        if (showViewDocument) {
                            return (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                    <span style={{ fontSize: '12px', color: '#666' }}>Select</span>
                                </div>
                            );
                        }

                        return (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={(e) => {
                                        const newSelection = e.target.checked ? [...rows] : [];
                                        setSelectedRows(newSelection);
                                        onRowSelect?.(newSelection);
                                    }}
                                />
                            </div>
                        );
                    },
                    renderCell: ({ row }) => (
                        <input
                            type={showViewDocument ? "radio" : "checkbox"}
                            name={showViewDocument ? "singleSelection" : undefined}
                            checked={selectedRows.some(r => r._id === row._id)}
                            onChange={(e) => {
                                if (showViewDocument) {
                                    // Single selection mode - replace the entire selection
                                    const updated = e.target.checked ? [row] : [];
                                    setSelectedRows(updated);
                                    onRowSelect?.(updated);
                                } else {
                                    // Multiple selection mode - existing logic
                                    const exists = selectedRows.some(r => r._id === row._id);
                                    const updated = exists
                                        ? selectedRows.filter(r => r._id !== row._id)
                                        : [...selectedRows, row];

                                    setSelectedRows(updated);
                                    onRowSelect?.(updated);
                                }
                            }}
                            style={{ cursor: "pointer" }}
                        />
                    )
                }]
                : []),
            // Only show expand column for mobile and tablet, not for web
            ...((screenSize === 'mobile' || screenSize === 'tablet') ? [{
                key: '_expanded',
                name: '',
                minWidth: 30,
                width: 30,
                colSpan: (props: any) => {
                    if (props.type === 'ROW' && props.row._expanded) {
                        // Calculate the total number of visible columns
                        let totalColumns = 0;

                        // Add selection column if enabled
                        if (settings?.EditableColumn) {
                            totalColumns += 1;
                        }

                        // Add the expand column itself (only if mobile or tablet)
                        if (screenSize === 'mobile' || screenSize === 'tablet') {
                            totalColumns += 1;
                        }

                        // Add visible data columns (columnsToShow minus hidden columns)
                        const visibleDataColumns = columnsToShow.filter(col => !columnsToHide.includes(col));
                        totalColumns += visibleDataColumns.length;

                        // Add actions column if isEntryForm
                        if (isEntryForm) {
                            totalColumns += 1;
                        }

                        return totalColumns;
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
                                        .filter(([key]) => {
                                            // Filter out internal keys and hidden columns
                                            if (key.startsWith('_')) return false;

                                            // Use the same column hiding logic as the main table
                                            return !columnsToHide.includes(key);
                                        })
                                        .map(([key, value]) => {
                                            // Use the same formatter logic as the main table
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
            }] : []),
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

                // Get custom width for this column if specified
                const customWidth = columnWidthMap[key];
                const columnConfig: any = {
                    key,
                    name: key,
                    sortable: true,
                    resizable: true,
                };

                // Apply custom width or use default min/max width
                if (customWidth) {
                    columnConfig.width = customWidth;
                    columnConfig.minWidth = Math.min(50, Math.floor(customWidth * 0.5)); // Allow resizing down to 50% of custom width or minimum 50px
                    columnConfig.maxWidth = Math.max(600, Math.floor(customWidth * 2)); // Allow resizing up to 200% of custom width or minimum 600px
                } else {
                    columnConfig.minWidth = 80;
                    columnConfig.maxWidth = 400;
                }

                return {
                    ...columnConfig,
                    headerCellClass: isNumericColumn ? 'numeric-column-header' : '',
                    cellClass: isNumericColumn ? 'numeric-column-cell' : '',
                    renderSummaryCell: (props: any) => {
                        if (key === 'totalCount' || shouldShowTotal) {
                            return <div className={isNumericColumn ? "numeric-value font-bold" : "font-bold"} style={{ color: colors.text }}>{props.row[key]}</div>;
                        }
                        return <div></div>;
                    },
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
    }, [formattedData, colors.text, settings?.hideEntireColumn, settings?.leftAlignedColumns, settings?.leftAlignedColums, summary?.columnsToShowTotal, screenSize, settings?.mobileColumns, settings?.tabletColumns, settings?.webColumns, settings?.columnWidth, expandedRows, selectedRows]);

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

    return (
        <div
            ref={tableRef}
            style={{ height: fullHeight ? 'calc(100vh - 170px)' : 'auto', width: '100%' }}
        >
            <DataGrid
                columns={columns}
                rows={rows}
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
                onCellClick={(props: any) => {
                    if (onRowClick && !props.column.key.startsWith('_') && !isEntryForm) {
                        const { _id, _expanded, ...rowData } = rows[props.rowIdx];
                        onRowClick(rowData);
                    }
                }}
            />
            <TableStyling onRowClick={onRowClick} screenSize={screenSize} />
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
    const filteredHeaders = headers.filter(header => !hiddenColumns.includes(header.trim()) && header !== '_id');

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
    const filteredHeaders = headers.filter(header => !hiddenColumns.includes(header.trim()) && header !== '_id');

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

    // if (mode === 'email') {
    //     const confirmSend = window.confirm('Do you want to send mail?');
    //     if (!confirmSend) return;
    // }

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

    const headers = Object.keys(allData[0])
        .filter(key => !columnsToHide.includes(key) && key !== '_id');
    const rightAlignedKeys: string[] = jsonData?.RightList?.[0] || [];
    const normalizedRightAlignedKeys = rightAlignedKeys.map(k => k.replace(/\s+/g, ''));
    const reportHeader = (jsonData?.ReportHeader?.[0] || '').replace(/\\n/g, '\n');
    console.log(reportHeader,'reportHeaderreportHeader');
    
    let fileTitle = 'Report';
    let dateRange = '';
    let clientName = '';
    let clientCode = '';

    if (reportHeader.includes('From Date')) {
        const [left, right] = reportHeader.split('From Date');
        fileTitle = left.trim();
    
        if (right) {
            // Handle \n or \\n in different inputs
            const lineBreak = right.includes('\n') ? '\n' : right.includes('\\n') ? '\\n' : '';
    
            if (lineBreak) {
                const [range, clientLine] = right.split(lineBreak);
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
            } else {
                // No \n, just date range in Ledger Report
                dateRange = `From Date${right?.trim() ? ' ' + right.trim() : ''}`;
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
                alignment: normalizedRightAlignedKeys.includes(normalizedKey) ? 'right' : 'left',
            };
        })
    );


    // Data rows
    allData.forEach(row => {
        const rowData = headers.map(key => {
            const normalizedKey = key.replace(/\s+/g, '');
            return {
                text: formatValue(row[key], key),
                alignment: normalizedRightAlignedKeys.includes(normalizedKey) ? 'right' : 'left',
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
            alignment: normalizedRightAlignedKeys.includes(normalizedKey) ? 'right' : 'left',
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
                            {
                                text: clientName
                                    ? clientCode
                                        ? `${clientName} (${clientCode})`
                                        : clientName
                                    : '',
                                style: 'small'
                            },
                        ],
                        alignment: 'center',
                        width: '*',
                    },
                    { text: '', width: 60 },
                ]
            },
            // Add dynamic space between logo and table
            { text: '', margin: [0, logoImage ? 30 : 15, 0, 0] },
    
            // Table block
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
        const showTypes = pageData[0]?.levels[0]?.settings?.showTypstFlag || false;
        const currentLevelData = pageData[0]?.levels[currentLevel];
        const userId = localStorage.getItem('userId') || '';
        const userType = localStorage.getItem('userType') || '';

        const filterXml = buildFilterXml(filters, userId);

        const sendEmail = async (base64Data: string, pdfName: string) => {
            const emailXml = `
                <dsXml>
                    <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"EmailSend","RequestFrom":"W"</J_Ui>
                    <Sql></Sql>
                    <X_Filter>
                        ${filterXml}
                        <ReportName>${fileTitle}</ReportName>
                        <FileName>${pdfName}</FileName>
                        <Base64>${base64Data}</Base64>
                    </X_Filter>
                    <J_Api>"UserId":"${userId}","UserType":"${userType}","AccYear":24,"MyDbPrefix":"SVVS","MemberCode":"undefined","SecretKey":"undefined"</J_Api>
                </dsXml>`;

            const emailResponse = await apiService.postWithAuth(BASE_URL + PATH_URL, emailXml);

            const result = emailResponse?.data;
            const columnMsg = result?.data?.rs0?.[0]?.Column1 || '';

            if (result?.success) {
                if (columnMsg.toLowerCase().includes('mail template not define')) {
                    toast.error('Mail Template Not Defined');
                } else {
                    toast.success(columnMsg);
                }
            } else {
                toast.error(columnMsg || result?.message);
            }
        };

        try {
            if (showTypes) {
                const fetchXml = `
                    <dsXml>
                        <J_Ui>${JSON.stringify(currentLevelData?.J_Ui).slice(1, -1)},"ReportDisplay":"D"</J_Ui>
                        <Sql></Sql>
                        <X_Filter>
                            ${filterXml}
                        </X_Filter>
                        <J_Api>"UserId":"${userId}","UserType":"${userType}","AccYear":24,"MyDbPrefix":"SVVS","MemberCode":"undefined","SecretKey":"undefined"</J_Api>
                    </dsXml>`;

                const fetchResponse = await apiService.postWithAuth(BASE_URL + PATH_URL, fetchXml);

                const rs0 = fetchResponse?.data?.data?.rs0;
                if (!Array.isArray(rs0) || rs0.length === 0 || !rs0[0]?.Base64PDF) {
                    toast.error('Failed to fetch PDF for email.');
                    return;
                }

                const { PDFName, Base64PDF } = rs0[0];
                await sendEmail(Base64PDF, PDFName);
            } else {
                pdfMake.createPdf(docDefinition).getBase64(async (base64Data: string) => {
                    try {
                        await sendEmail(base64Data, `${fileTitle}.PDF`);
                    } catch (err) {
                        toast.error('Failed to send email.');
                    }
                });

                return; // Skip the rest of the block
            }
        } catch (err) {
            toast.error('Failed to send email.');
        }
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

    const filterXml = buildFilterXml(filters, userId);

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
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData1);

        // Pull out the first rs0 entry
        const rs0 = response.data?.data?.rs0;
        if (Array.isArray(rs0) && rs0.length > 0) {
            const { PDFName, Base64PDF } = rs0[0];
            if (PDFName && Base64PDF) {
                // Kick off the download
                downloadPdf(PDFName, Base64PDF);
            } else {
                toast.error('Response missing PDFName or Base64PDF');
            }
        } else {
            toast.error('Unexpected response format:', response.data);
        }
    } catch (err) {
        toast.error('Not available Donwload');
    }

}
export default DataTable;