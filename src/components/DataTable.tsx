"use client";
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DataGrid } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useTheme } from '@/context/ThemeContext';
import { useAppSelector } from '@/redux/hooks';
import { RootState } from '@/redux/store';
import { ACTION_NAME } from '@/utils/constants';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import moment from 'moment';

interface DataTableProps {
    data: any[];
    settings?: {
        hideEntireColumn?: string;
        leftAlignedColumns?: string;
        leftAlignedColums?: string;
        mobileColumns?: string[];
        tabletColumns?: string[];
        webColumns?: string[];
        [key: string]: any;
    };
    onRowClick?: (record: any) => void;
    tableRef?: React.RefObject<HTMLDivElement>;
    summary?: any;
    isEntryForm?: boolean;
    handleAction?: (action: string, record: any) => void;
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
            console.log('Screen width:', width, 'Screen size:', newSize);
            setScreenSize(newSize);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    return screenSize;
};

const DataTable: React.FC<DataTableProps> = ({ data, settings, onRowClick, tableRef, summary, isEntryForm = false, handleAction = () => { } }) => {
    console.log(JSON.stringify(settings, null, 2), 'settings', isEntryForm);
    const { colors, fonts } = useTheme();
    const [sortColumns, setSortColumns] = useState<any[]>([]);
    console.log({ colors })
    const { tableStyle } = useAppSelector((state: RootState) => state.common);
    console.log(tableStyle);
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
                _expanded: expandedRows.has(rowId),
                _id: rowId
            };
        });
    }, [data, settings?.dateFormat, settings?.decimalColumns, settings?.valueBasedTextColor, expandedRows]);

    // Dynamically create columns from the first data item
    const columns = useMemo(() => {
        if (!formattedData || formattedData.length === 0) return [];

        console.log('Current screen size:', screenSize);
        console.log('Settings:', settings);
        console.log('Mobile columns:', settings?.mobileColumns);
        console.log('Tablet columns:', settings?.tabletColumns);
        console.log('Web columns:', settings?.webColumns);

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
        console.log('Columns to show:', columnsToShow);
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
            columnsToShow = Object.keys(formattedData[0]).filter(key => !key.startsWith('_'));
            console.log('No responsive columns defined, using all columns:', columnsToShow);
        }

        // Filter out hidden columns
        columnsToShow = columnsToShow.filter(key => !columnsToHide.includes(key));
        console.log('Final columns to show:', columnsToShow);

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
                // cellClass: (row: any) => {
                //     if (row._expanded) {
                //         return 'expanded-row';
                //     }
                //     return undefined;
                // },
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

                return {
                    key,
                    name: key,
                    sortable: true,
                    minWidth: 80,
                    maxWidth: 400,
                    resizable: true,
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
                    minWidth: 120,
                    maxWidth: 350,
                    renderCell: ({ row }: any) => (
                        isEntryForm && (
                            <div className="action-buttons">
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
    }, [formattedData, colors.text, settings?.hideEntireColumn, settings?.leftAlignedColumns, settings?.leftAlignedColums, summary?.columnsToShowTotal, screenSize, settings?.mobileColumns, settings?.tabletColumns, settings?.webColumns, expandedRows]);

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

    console.log(rows, 'rows of fff');
    console.log(columns, 'columns of ffff');



    return (
        <div
            ref={tableRef}
            style={{ height: 'calc(100vh - 170px)', width: '100%' }}
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
                    if (onRowClick && !props.column.key.startsWith('_')) {
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
                    cursor: ${onRowClick ? 'pointer' : 'default'};
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

                .edit-button, .delete-button {
                    padding: 4px 8px;
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

                .edit-button {
                    background-color: ${colors.buttonBackground};
                    color: ${colors.buttonText};
                }

                .delete-button {
                    background-color: ${colors.errorText};
                    color: ${colors.buttonText};
                }
            `}</style>
        </div>
    );
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
    pageData: any
) => {
    if (!allData || allData.length === 0) return;

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

    console.log(jsonData)
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
        console.log(key)
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

    pdfMake.createPdf(docDefinition).download(`${fileTitle}.pdf`);
};
export default DataTable;