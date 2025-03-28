"use client";
import React, { useMemo, useState, useRef } from 'react';
import { DataGrid } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useTheme } from '@/context/ThemeContext';
import { useAppSelector } from '@/redux/hooks';
import { RootState } from '@/redux/store';
import moment from 'moment';

interface DataTableProps {
    data: any[];
    settings?: any;
    onRowClick?: (record: any) => void;
    tableRef?: React.RefObject<HTMLDivElement>;
    summary?: any;
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

const DataTable: React.FC<DataTableProps> = ({ data, settings, onRowClick, tableRef, summary }) => {
    console.log(JSON.stringify(summary, null, 2), 'settings');
    const { colors, fonts } = useTheme();
    const [sortColumns, setSortColumns] = useState<any[]>([]);
    const { tableStyle } = useAppSelector((state: RootState) => state.common);
    console.log(tableStyle);
    const rowHeight = tableStyle === 'small' ? 30 : tableStyle === 'medium' ? 40 : 50;
    // Calculate minimum column width based on content
    const getColumnWidth = (key: string, rows: any[]) => {
        // Start with the header length (plus some padding)
        let maxWidth = key.length * 10 + 32;

        // Check all row values
        rows.forEach(row => {
            const value = row[key];
            const valueString = value?.toString() || '';
            // Calculate based on content type
            if (typeof value === 'number') {
                // For numbers, use a fixed width or calculate based on digits
                maxWidth = Math.max(maxWidth, valueString.length * 10 + 24);
            } else {
                // For text, calculate based on character length
                maxWidth = Math.max(maxWidth, Math.min(valueString.length * 8 + 24, 300));
            }
        });

        return maxWidth;
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

        return data.map(row => {
            const newRow = { ...row };

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

            return newRow;
        });
    }, [data, settings?.dateFormat, settings?.decimalColumns, settings?.valueBasedTextColor]);

    // Dynamically create columns from the first data item
    const columns = useMemo(() => {
        if (!formattedData || formattedData.length === 0) return [];

        // Get columns to hide (if specified in settings)
        const columnsToHide = settings?.hideEntireColumn
            ? settings.hideEntireColumn.split(',').map((col: string) => col.trim())
            : [];

        return Object.keys(formattedData[0])
            .filter(key => !columnsToHide.includes(key)) // Filter out columns that should be hidden
            .map((key: any) => {
                // Check if this column contains numeric values
                const isNumericColumn = formattedData.some((row: any) => {
                    const value = row[key];
                    const rawValue = React.isValidElement(value) ? (value as StyledValue).props.children : value;
                    return !isNaN(parseFloat(rawValue)) && isFinite(rawValue);
                });

                // Check if this column should show a total in the summary row
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
                    // Add a class to identify numeric columns
                    headerCellClass: isNumericColumn ? 'numeric-column-header' : '',
                    cellClass: isNumericColumn ? 'numeric-column-cell' : '',
                    renderSummaryCell: (props: any) => {
                        // Only show values for totalCount and columns that should show totals
                        if (key === 'totalCount' || shouldShowTotal) {
                            return <div className="numeric-value font-bold" style={{ color: colors.text }}>{props.row[key]}</div>;
                        }
                        // Return empty div for columns that shouldn't show totals
                        return <div></div>;
                    },
                    formatter: (props: any) => {
                        const value = props.row[key];
                        // Check if the value is numeric
                        const rawValue = React.isValidElement(value) ? (value as StyledValue).props.children : value;
                        const numValue = parseFloat(rawValue);

                        if (!isNaN(numValue)) {
                            // Format number with commas and 2 decimal places
                            const formattedValue = new Intl.NumberFormat('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }).format(numValue);

                            // Determine text color based on value
                            const textColor = numValue < 0 ? '#dc2626' :
                                numValue > 0 ? '#16a34a' :
                                    colors.text;

                            return <div className="numeric-value" style={{ color: textColor }}>{formattedValue}</div>;
                        }

                        // If it's already a React element (from value-based formatting) and contains a number
                        if (React.isValidElement(value)) {
                            const childValue = (value as StyledValue).props.children;
                            const childNumValue = parseFloat(childValue.toString());

                            if (!isNaN(childNumValue)) {
                                return React.cloneElement(value as StyledElement, {
                                    className: "numeric-value",
                                    style: { ...(value as StyledElement).props.style }
                                });
                            }

                            // Return the original React element if it's not numeric
                            return value;
                        }

                        return value;
                    }
                };
            });
    }, [formattedData, colors.text, settings?.hideEntireColumn, summary?.columnsToShowTotal]);

    // Sort function
    const sortRows = (initialRows: any[], sortColumns: any[]) => {
        if (sortColumns.length === 0) return initialRows;

        return [...initialRows].sort((a, b) => {
            for (const sort of sortColumns) {
                const { columnKey, direction } = sort;
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
                    totals[column.key] = sum.toFixed(2);
                }
            });
        }

        return [totals];
    }, [rows, summary?.columnsToShowTotal]);

    return (
        <div
            ref={tableRef}
            style={{ height: 'calc(100vh - 200px)', width: '100%' }}
        >
            <DataGrid
                columns={columns}
                rows={rows}
                sortColumns={sortColumns}
                onSortColumnsChange={setSortColumns}
                className="rdg-light"
                rowHeight={rowHeight}
                headerRowHeight={rowHeight}
                style={{
                    backgroundColor: colors.background,
                    color: colors.text,
                    fontFamily: fonts.content,
                }}
                bottomSummaryRows={summmaryRows}
                onCellClick={(props: any) => {
                    if (onRowClick) {
                        onRowClick(rows[props.rowIdx]);
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
            `}</style>
        </div>
    );
};

export const exportTableToCsv = (gridEl: HTMLDivElement | null) => {
    if (!gridEl) return;

    const { head, body, foot } = getGridContent(gridEl);
    const content = [...head, ...body, ...foot]
        .map((cells) => cells.map(serialiseCellValue).join(','))
        .join('\n');

    downloadFile(
        'export.csv',
        new Blob([content], { type: 'text/csv;charset=utf-8;' })
    );
};

export const exportTableToPdf = async (gridEl: HTMLDivElement | null) => {
    console.log(gridEl, 'gridEl');
    // if (!gridEl) return;

    // try {
    //     const { head, body, foot } = getGridContent(gridEl);
    //     const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    //         import('jspdf'),
    //         import('jspdf-autotable')
    //     ]);

    //     const doc = new jsPDF({
    //         orientation: 'l',
    //         unit: 'px'
    //     });

    //     autoTable(doc, {
    //         head,
    //         body,
    //         foot,
    //         horizontalPageBreak: true,
    //         styles: { cellPadding: 1.5, fontSize: 8, cellWidth: 'wrap' },
    //         tableWidth: 'wrap'
    //     });
    //     doc.save('export.pdf');
    // } catch (error) {
    //     console.error('Error exporting to PDF:', error);
    // }
};

export default DataTable; 