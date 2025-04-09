"use client";
import React, { useMemo, useState, useRef } from 'react';
import { DataGrid } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useTheme } from '@/context/ThemeContext';
import { useAppSelector } from '@/redux/hooks';
import { RootState } from '@/redux/store';
import { ACTION_NAME } from '@/utils/constants';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// import moment from 'moment';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
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
    console.log(JSON.stringify(settings, null, 2), 'settings');
    const { colors, fonts } = useTheme();
    const [sortColumns, setSortColumns] = useState<any[]>([]);
    const { tableStyle } = useAppSelector((state: RootState) => state.common);
    const rowHeight = tableStyle === 'small' ? 30 : tableStyle === 'medium' ? 40 : 50;

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

        // Get columns that should be left-aligned even if they contain numbers
        const leftAlignedColumns = settings?.leftAlignedColumns || settings?.leftAlignedColums
            ? (settings?.leftAlignedColumns || settings?.leftAlignedColums).split(',').map((col: string) => col.trim())
            : [];

        return Object.keys(formattedData[0])
            .filter(key => !columnsToHide.includes(key)) // Filter out columns that should be hidden
            .map((key: any) => {
                // Check if this column should be forcibly left-aligned
                const isLeftAligned = leftAlignedColumns.includes(key);

                // Check if this column contains numeric values (only if not forced left-aligned)
                const isNumericColumn = !isLeftAligned && formattedData.some((row: any) => {
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
                    // Add a class to identify numeric columns or forced left-aligned columns
                    headerCellClass: isNumericColumn ? 'numeric-column-header' : '',
                    cellClass: isNumericColumn ? 'numeric-column-cell' : '',
                    renderSummaryCell: (props: any) => {
                        // Only show values for totalCount and columns that should show totals
                        if (key === 'totalCount' || shouldShowTotal) {
                            return <div className={isNumericColumn ? "numeric-value font-bold" : "font-bold"} style={{ color: colors.text }}>{props.row[key]}</div>;
                        }
                        // Return empty div for columns that shouldn't show totals
                        return <div></div>;
                    },
                    formatter: (props: any) => {
                        const value = props.row[key];
                        // Check if the value is numeric
                        const rawValue = React.isValidElement(value) ? (value as StyledValue).props.children : value;
                        const numValue = parseFloat(rawValue);

                        if (!isNaN(numValue) && !isLeftAligned) {
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

                            if (!isNaN(childNumValue) && !isLeftAligned) {
                                return React.cloneElement(value as StyledElement, {
                                    className: "numeric-value",
                                    style: { ...(value as StyledElement).props.style }
                                });
                            }

                            // Return the original React element if it's not numeric or should be left-aligned
                            return value;
                        }

                        // For numeric values that should be left-aligned and non-numeric values
                        return value;
                    }
                };
            });
    }, [formattedData, colors.text, settings?.hideEntireColumn, settings?.leftAlignedColumns, settings?.leftAlignedColums, summary?.columnsToShowTotal]);

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
    // const dateFormatMap: Record<string, string> = {};

    // (settings.dateFormat || []).forEach((df: { key: string; format: string }) => {
    //     const normKey = df.key.replace(/\s+/g, '');
    //     dateFormatMap[normKey] = df.format;
    // });

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

    const companyName = headerData.CompanyName?.[0] || "Company Name";
    const reportHeader = headerData.ReportHeader?.[0] || "Report Header";
    let [fileTitle] = reportHeader.split("From Date");
    fileTitle = fileTitle?.trim() || "Report";

    const headers = Object.keys(apiData[0] || {});
    const hiddenColumns = settings.hideEntireColumn?.split(",") || [];
    const filteredHeaders = headers.filter(header => !hiddenColumns.includes(header.trim()));

    // Decimal formatting map
    const decimalColumnsMap: Record<string, number> = {};
    settings.decimalColumns?.forEach((col: { key: string; decimalPlaces: number }) => {
        const columnKeys = col.key.split(",").map(k => k.trim());
        columnKeys.forEach(key => {
            if (key) decimalColumnsMap[key] = col.decimalPlaces;
        });
    });

    // Total tracking
    const totals: Record<string, number> = {};
    const totalLabels: Record<string, string> = {};
    columnsToShowTotal.forEach(({ key, label }: { key: string; label: string }) => {
        totals[key] = 0;
        totalLabels[key] = label;
    });

    // Date format map
    const dateFormatMap: Record<string, string> = {};
    const dateFormatSetting = settings.dateFormat;

    if (Array.isArray(dateFormatSetting)) {
        dateFormatSetting.forEach((df: { key: string; format: string }) => {
            const normKey = df.key?.replace(/\s+/g, '');
            if (normKey) dateFormatMap[normKey] = df.format;
        });
    } else if (typeof dateFormatSetting === 'object' && dateFormatSetting !== null) {
        const normKey = dateFormatSetting.key?.replace(/\s+/g, '');
        if (normKey) dateFormatMap[normKey] = dateFormatSetting.format;
    }

    // Table body
    const bodyRows = apiData.map(row =>
        filteredHeaders.map(header => {
            const normKey = header.replace(/\s+/g, '');
            let value = row[header] ?? "";

            // Apply date format
            if (dateFormatMap[normKey] && value) {
                const parsed = dayjs(value);
                if (parsed.isValid()) {
                    value = parsed.format(dateFormatMap[normKey]);
                }
            }

            // Decimal formatting
            if (decimalColumnsMap[header] !== undefined && !isNaN(parseFloat(value))) {
                value = parseFloat(value).toFixed(decimalColumnsMap[header]);
                if (totals.hasOwnProperty(header)) {
                    totals[header] += parseFloat(value);
                }
            }

            return `"${value}"`;
        }).join(',')
    );

    // Total row
    const totalRow = filteredHeaders.map(header => {
        if (totals[header] !== undefined) {
            return `"${totals[header].toFixed(decimalColumnsMap[header] || 0)}"`; 
        }
        return '""';
    }).join(',');

    // Centered company name
    const startColumnIndex = 1;
    const centerText = (text: string, columnWidth: number) => {
        const padding = Math.max(0, Math.floor((columnWidth - text.length) / 2));
        return `${' '.repeat(padding)}${text}${' '.repeat(padding)}`;
    };
    const formattedCompanyName = [
        ...Array(startColumnIndex).fill('""'),
        `"${centerText(companyName, 20)}"`
    ].join(',');

    // Multiline Report Header
    const reportHeaderLines = reportHeader.split("\\n").map(line =>
        [
            ...Array(startColumnIndex).fill('""'),
            `"${line.trim()}"`
        ].join(',')
    );

    // Compose CSV content
    const csvContent = [
        formattedCompanyName,
        ...reportHeaderLines,
        '',
        filteredHeaders.map(header => `"${header}"`).join(','),
        ...bodyRows,
        totalRow
    ].join('\n');

    // Download CSV
    const filename = `${fileTitle.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    downloadFile(
        filename,
        new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    );
};


// pdfMake.vfs = pdfFonts?.pdfMake?.vfs;
pdfMake.vfs = pdfFonts.vfs;
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
        pageOrientation: 'landscape' ,
        pageSize: headers.length > 15 ? 'A3' : 'A4',
        
    };

    pdfMake.createPdf(docDefinition).download(`${fileTitle}.pdf`);
};
export default DataTable; 