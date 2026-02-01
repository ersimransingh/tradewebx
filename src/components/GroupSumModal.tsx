import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaCalculator, FaArrowLeft, FaFileExcel, FaFilePdf } from "react-icons/fa";
import { DataGrid, Column } from "react-data-grid";
import 'react-data-grid/lib/styles.css';
import { useTheme } from "@/context/ThemeContext";
import ExcelJS from 'exceljs';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = (pdfFonts as any).vfs;

interface GroupSumModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableColumns: string[];
    data: any[];
    rightList?: string[];
    leftAlignedColumns?: string[];
    pageName?: string;
    appMetadata?: {
        companyLogo?: string;
        companyName?: string;
    };
    companyName?: string;
    reportHeader?: string;
}

type ConfigRow = {
    id: string;
    columnName: string;
};

// Helper function to convert BMP to PNG
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

const GroupSumModal: React.FC<GroupSumModalProps> = ({
    isOpen,
    onClose,
    availableColumns,
    data,
    rightList = [],
    leftAlignedColumns = [],
    pageName = 'Grouped Results',
    appMetadata,
    companyName = '',
    reportHeader = ''
}) => {
    const { colors, fonts } = useTheme();

    // Normalize rightList and leftAlignedColumns for comparison
    const normalizedRightList = useMemo(() =>
        rightList.map(col => col.replace(/\s+/g, '').toLowerCase()),
        [rightList]
    );

    const normalizedLeftAlignedColumns = useMemo(() =>
        leftAlignedColumns.map(col => col.replace(/\s+/g, '').toLowerCase()),
        [leftAlignedColumns]
    );

    const [selectedGroup, setSelectedGroup] = useState<Set<string>>(new Set());
    const [selectedSub, setSelectedSub] = useState<Set<string>>(new Set());
    const [selectedSum, setSelectedSum] = useState<Set<string>>(new Set());
    const [resultData, setResultData] = useState<any[] | null>(null);
    const [viewMode, setViewMode] = useState<'config' | 'result'>('config');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setViewMode('config');
            setResultData(null);
            // Optional: reset selections or keep them? Keeping them is usually better UX.
            // If we want to persist selections, we'd need to lift state up or use localstorage.
            // For now, let's keep them in component state so they persist while the parent component is mounted.
        }
    }, [isOpen]);

    /* ---------------- Logic ---------------- */
    const [isCalculating, setIsCalculating] = useState(false);

    /* ---------------- Export Functions ---------------- */
    const exportToExcel = async () => {
        if (!resultData || resultData.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Grouped Data');

        // Get column headers
        const groupCols = Array.from(selectedGroup);
        const subCols = Array.from(selectedSub);
        const hasSubColumns = subCols.length > 0;
        const sumCols = Array.from(selectedSum);
        const exportRows = displayRows && displayRows.length > 0 ? displayRows : resultData;
        const headers = [
            ...groupCols.map(col => `${col} (Group)`),
            ...subCols.map(col => `${col} (Sub)`),
            ...sumCols.map(col => `${col} (Total)`)
        ];

        let rowCursor = 1;

        // Add company logo if available
        if (appMetadata?.companyLogo) {
            try {
                const pngBase64 = await convertBmpToPng(appMetadata.companyLogo);
                const imageId = workbook.addImage({ base64: pngBase64, extension: 'png' });
                worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 80 } });
            } catch (err) {
                console.warn('Logo conversion failed:', err);
            }
        }

        // Add company name
        const displayCompanyName = companyName || appMetadata?.companyName || '';
        if (displayCompanyName) {
            worksheet.getCell(`D${rowCursor}`).value = displayCompanyName;
            worksheet.getCell(`D${rowCursor}`).font = { bold: true, size: 14 };
            rowCursor++;
        }

        // Add report header / page name
        const displayTitle = `${pageName} - Grouped Results`;
        worksheet.getCell(`D${rowCursor}`).value = displayTitle;
        worksheet.getCell(`D${rowCursor}`).font = { bold: true, size: 12 };
        rowCursor++;

        // Add report header lines if available
        if (reportHeader) {
            reportHeader.split("\\n").forEach(line => {
                if (line.trim()) {
                    worksheet.getCell(`D${rowCursor}`).value = line.trim();
                    rowCursor++;
                }
            });
        }

        // Add empty row for spacing
        rowCursor += 2;

        // Add header row
        const headerRow = worksheet.getRow(rowCursor);
        headerRow.height = 25;
        headers.forEach((header, colIdx) => {
            const cell = headerRow.getCell(colIdx + 1);
            cell.value = header;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4A5568' }
            };
            cell.alignment = { horizontal: header.includes('(Total)') ? 'right' : 'left' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFCBD5E0' } },
                left: { style: 'thin', color: { argb: 'FFCBD5E0' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E0' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E0' } }
            };
        });
        headerRow.commit();
        rowCursor++;

        const getGroupTotalLabel = () => 'Total';

        // Add data rows
        exportRows.forEach((row, rowIndex) => {
            const currentRow = worksheet.getRow(rowCursor);
            const rowType = row.__rowType ?? 'child';
            const isGroupHeader = rowType === 'groupHeader';
            const isSubtotal = rowType === 'subtotal';
            const isGrandTotal = rowType === 'grandTotal';
            const isChild = rowType === 'child';
            const isSpecialRow = isGroupHeader || isSubtotal || isGrandTotal;
            const fillColor = isGrandTotal ? 'FFD9D9D9' : isSpecialRow ? 'FFF7FAFC' : '';

            const rowData = [
                ...groupCols.map((col, idx) => {
                    if (isGroupHeader) return row[`group_${col}`];
                    if (isSubtotal) return idx === 0 ? getGroupTotalLabel() : '';
                    if (isGrandTotal) return idx === 0 ? 'Grand Total' : '';
                    if (isChild) return hasSubColumns ? '' : row[`group_${col}`];
                    return row[`group_${col}`];
                }),
                ...subCols.map((col, idx) => {
                    if (isChild) return row[`sub_${col}`];
                    if (isGrandTotal && groupCols.length === 0 && idx === 0) return 'Grand Total';
                    return '';
                }),
                ...sumCols.map(col => {
                    if (isChild || isSubtotal || isGrandTotal) return row[`sum_${col}`];
                    return '';
                })
            ];

            rowData.forEach((value, colIdx) => {
                const cell = currentRow.getCell(colIdx + 1);
                const header = headers[colIdx];

                if (typeof value === 'number') {
                    cell.value = value;
                    if (header.includes('(Total)')) {
                        cell.numFmt = '0.00';
                    }
                    cell.alignment = { horizontal: 'right' };
                } else {
                    cell.value = value;
                    cell.alignment = { horizontal: 'left' };
                }

                if (fillColor) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: fillColor }
                    };
                } else if (rowIndex % 2 === 0) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF7FAFC' }
                    };
                }

                if (isSpecialRow) {
                    cell.font = { ...cell.font, bold: true };
                }

                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E0' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E0' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E0' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E0' } }
                };
            });

            currentRow.commit();
            rowCursor++;
        });

        // Auto-size columns
        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        // Generate file with proper naming
        const fileTitle = pageName.replace(/[^a-zA-Z0-9]/g, "_");
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileTitle}_Grouped.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const exportToPDF = async () => {
        if (!resultData || resultData.length === 0) return;

        const groupCols = Array.from(selectedGroup);
        const subCols = Array.from(selectedSub);
        const hasSubColumns = subCols.length > 0;
        const sumCols = Array.from(selectedSum);
        const exportRows = displayRows && displayRows.length > 0 ? displayRows : resultData;

        // Build table headers with alignment
        const tableHeaders = [
            ...groupCols.map(col => ({
                text: `${col} (Group)`,
                bold: true,
                fillColor: '#eeeeee',
                alignment: 'left'
            })),
            ...subCols.map(col => ({
                text: `${col} (Sub)`,
                bold: true,
                fillColor: '#eeeeee',
                alignment: 'left'
            })),
            ...sumCols.map(col => ({
                text: `${col} (Total)`,
                bold: true,
                fillColor: '#eeeeee',
                alignment: 'right'
            }))
        ];

        const getGroupTotalLabel = () => 'Total';

        const buildCell = (
            text: string,
            alignment: 'left' | 'right',
            isBold: boolean,
            fillColor?: string
        ) => ({
            text,
            alignment,
            ...(isBold ? { bold: true } : {}),
            ...(fillColor ? { fillColor } : {})
        });

        // Build table body with alignment
        const tableBody = exportRows.map(row => {
            const rowType = row.__rowType ?? 'child';
            const isGroupHeader = rowType === 'groupHeader';
            const isSubtotal = rowType === 'subtotal';
            const isGrandTotal = rowType === 'grandTotal';
            const isChild = rowType === 'child';
            const isSpecialRow = isGroupHeader || isSubtotal || isGrandTotal;
            const fillColor = isGrandTotal ? '#e8f4ff' : isSpecialRow ? '#f7fafc' : undefined;

            return [
                ...groupCols.map((col, idx) => {
                    let value = '';
                    if (isGroupHeader) value = row[`group_${col}`] || '';
                    else if (isSubtotal) value = idx === 0 ? getGroupTotalLabel() : '';
                    else if (isGrandTotal) value = idx === 0 ? 'Grand Total' : '';
                    else if (isChild) value = hasSubColumns ? '' : (row[`group_${col}`] || '');
                    return buildCell(value, 'left', isSpecialRow, fillColor);
                }),
                ...subCols.map((col, idx) => {
                    let value = '';
                    if (isChild) value = row[`sub_${col}`] || '';
                    else if (isGrandTotal && groupCols.length === 0 && idx === 0) value = 'Grand Total';
                    return buildCell(value, 'left', isSpecialRow, fillColor);
                }),
                ...sumCols.map(col => {
                    let value = '';
                    if (isChild || isSubtotal || isGrandTotal) {
                        const val = row[`sum_${col}`];
                        value = typeof val === 'number' ? val.toFixed(2) : (val ?? '');
                    }
                    return buildCell(value, 'right', isSpecialRow, fillColor);
                })
            ];
        });

        // Convert BMP logo if available
        let logoImage = '';
        if (appMetadata?.companyLogo) {
            try {
                logoImage = await convertBmpToPng(appMetadata.companyLogo);
            } catch (err) {
                console.warn('Logo conversion failed:', err);
            }
        }

        const displayCompanyName = companyName || appMetadata?.companyName || '';
        const displayTitle = `${pageName} - Grouped Results`;
        const columnCount = groupCols.length + subCols.length + sumCols.length;
        const columnWidth = (100 / columnCount).toFixed(2) + '%';

        // PDF document definition
        const docDefinition: any = {
            pageSize: columnCount > 15 ? 'A3' : 'A4',
            pageOrientation: columnCount > 6 ? 'landscape' : 'portrait',
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
                                { text: displayCompanyName, style: 'header' },
                                { text: displayTitle, style: 'subheader' },
                                ...(reportHeader ? [{ text: reportHeader.replace(/\\n/g, ' '), style: 'small' }] : [])
                            ],
                            alignment: 'center',
                            width: '*',
                        },
                        { text: '', width: 60 },
                    ]
                },
                { text: '', margin: [0, logoImage ? 30 : 15, 0, 0] },
                {
                    style: 'tableStyle',
                    table: {
                        headerRows: 1,
                        widths: Array(columnCount).fill(columnWidth),
                        body: [tableHeaders, ...tableBody]
                    },
                    layout: {
                        paddingLeft: () => 2,
                        paddingRight: () => 2,
                        paddingTop: () => 2,
                        paddingBottom: () => 2,
                        fillColor: (rowIndex: number) => {
                            if (rowIndex === 0) return '#eeeeee';
                            return rowIndex % 2 === 0 ? '#f7fafc' : null;
                        },
                        hLineWidth: () => 1,
                        vLineWidth: () => 1,
                        hLineColor: () => '#cbd5e0',
                        vLineColor: () => '#cbd5e0',
                    }
                }
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
                        { text: `[Page ${currentPage} of ${pageCount}]`, alignment: 'right', margin: [0, 0, 40, 0] },
                    ],
                    fontSize: 8,
                };
            },
            defaultStyle: {
                fontSize: 10
            }
        };

        // Download PDF with proper naming
        const fileTitle = pageName.replace(/[^a-zA-Z0-9]/g, "_");
        pdfMake.createPdf(docDefinition).download(`${fileTitle}_Grouped.pdf`);
    };

    /* ---------------- Logic ---------------- */
    const calculateResults = () => {
        if (selectedGroup.size === 0 && selectedSub.size === 0) {
            alert("Please select at least one column to group by (Group or Sub Column).");
            return;
        }

        setIsCalculating(true);

        setTimeout(() => {
            try {
                const groups: Record<string, any> = {};
                const groupCols = Array.from(selectedGroup);
                const subCols = Array.from(selectedSub);
                const sumCols = Array.from(selectedSum);

                const normalizeValue = (value: any) =>
                    value === null || value === undefined ? '' : String(value).trim();

                data.forEach(row => {
                    // Create a unique key for the group (group + sub columns)
                    const keyParts = [...groupCols, ...subCols].map(col => normalizeValue(row[col]));
                    const key = keyParts.join('|||');

                    // Group key for display (only group columns)
                    const groupKeyParts = groupCols.map(col => normalizeValue(row[col]));
                    const groupKey = groupKeyParts.join('|||');

                    if (!groups[key]) {
                        groups[key] = {
                            _count: 0,
                            _key: key,
                            _groupKey: groupKey
                        };
                        // Initialize group columns
                        groupCols.forEach((col) => {
                            groups[key][`group_${col}`] = row[col];
                        });
                        // Initialize sub columns
                        subCols.forEach((col) => {
                            groups[key][`sub_${col}`] = row[col];
                        });
                        // Initialize sum columns
                        sumCols.forEach(col => {
                            groups[key][`sum_${col}`] = 0;
                        });
                    }

                    // Increment count
                    groups[key]._count += 1;

                    // Add values for sum
                    sumCols.forEach(col => {
                        let val = 0;
                        const rawVal = row[col];

                        if (typeof rawVal === 'number') {
                            val = rawVal;
                        } else if (typeof rawVal === 'string') {
                            const cleanVal = rawVal.replace(/[,\s₹$€£¥]/g, '');
                            const parsed = parseFloat(cleanVal);
                            if (!isNaN(parsed)) val = parsed;
                        }

                        groups[key][`sum_${col}`] += val;
                    });
                });

                // Calculate means (averages) for each group
                const results = Object.values(groups).map(group => {
                    const result = { ...group };
                    sumCols.forEach(col => {
                        const sumKey = `sum_${col}`;
                        const meanKey = `mean_${col}`;
                        // Calculate mean
                        result[meanKey] = group._count > 0 ? result[sumKey] / group._count : 0;
                    });
                    return result;
                });
                const buildSortKey = (row: any) => {
                    const groupKey = groupCols
                        .map(col => normalizeValue(row[`group_${col}`]).toLowerCase())
                        .join('|||');
                    const subKey = subCols
                        .map(col => normalizeValue(row[`sub_${col}`]).toLowerCase())
                        .join('|||');
                    return `${groupKey}|||${subKey}`;
                };

                const sortedResults = results.sort((a: any, b: any) =>
                    buildSortKey(a).localeCompare(buildSortKey(b), undefined, { numeric: true, sensitivity: 'base' })
                );

                setResultData(sortedResults);
                setViewMode('result');
            } catch (err) {
                console.error("Calculation Error", err);
            } finally {
                setIsCalculating(false);
            }
        }, 50);
    };

    /* ---------------- Config View Columns ---------------- */
    const configRows: ConfigRow[] = useMemo(
        () =>
            availableColumns.map(col => ({
                id: col,
                columnName: col
            })),
        [availableColumns]
    );

    const toggleGroup = (col: string) => {
        const willSelect = !selectedGroup.has(col);
        setSelectedGroup(prev => {
            const next = new Set(prev);
            if (next.has(col)) next.delete(col);
            else next.add(col);
            return next;
        });
        if (willSelect) {
            setSelectedSub(prev => {
                if (!prev.has(col)) return prev;
                const next = new Set(prev);
                next.delete(col);
                return next;
            });
            setSelectedSum(prev => {
                if (!prev.has(col)) return prev;
                const next = new Set(prev);
                next.delete(col);
                return next;
            });
        }
    };

    const toggleSub = (col: string) => {
        const willSelect = !selectedSub.has(col);
        setSelectedSub(prev => {
            const next = new Set(prev);
            if (next.has(col)) next.delete(col);
            else next.add(col);
            return next;
        });
        if (willSelect) {
            setSelectedGroup(prev => {
                if (!prev.has(col)) return prev;
                const next = new Set(prev);
                next.delete(col);
                return next;
            });
            setSelectedSum(prev => {
                if (!prev.has(col)) return prev;
                const next = new Set(prev);
                next.delete(col);
                return next;
            });
        }
    };

    const toggleSum = (col: string) => {
        const willSelect = !selectedSum.has(col);
        setSelectedSum(prev => {
            const next = new Set(prev);
            if (next.has(col)) next.delete(col);
            else next.add(col);
            return next;
        });
        if (willSelect) {
            setSelectedGroup(prev => {
                if (!prev.has(col)) return prev;
                const next = new Set(prev);
                next.delete(col);
                return next;
            });
            setSelectedSub(prev => {
                if (!prev.has(col)) return prev;
                const next = new Set(prev);
                next.delete(col);
                return next;
            });
        }
    };

    const configColumns: Column<ConfigRow>[] = useMemo(
        () => [
            {
                key: "columnName",
                name: "Column Name",
                resizable: true
            },
            {
                key: "group",
                name: "Select Column (Group)",
                width: 180,
                renderCell: ({ row }) => (
                    <label className="relative inline-flex items-center justify-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedGroup.has(row.id)}
                            onChange={() => toggleGroup(row.id)}
                            className="peer h-5 w-5 appearance-none rounded border-2 border-blue-600 bg-white checked:bg-blue-600 cursor-pointer focus:outline-none"
                        />
                        <span className="absolute text-white text-sm font-bold opacity-0 peer-checked:opacity-100 pointer-events-none">
                            {"\u2713"}
                        </span>
                    </label>
                )
            },
            {
                key: "sub",
                name: "Select Sub Column",
                width: 180,
                renderCell: ({ row }) => (
                    <label className="relative inline-flex items-center justify-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedSub.has(row.id)}
                            onChange={() => toggleSub(row.id)}
                            className="peer h-5 w-5 appearance-none rounded border-2 border-indigo-600 bg-white checked:bg-indigo-600 cursor-pointer focus:outline-none"
                        />
                        <span className="absolute text-white text-sm font-bold opacity-0 peer-checked:opacity-100 pointer-events-none">
                            {"\u2713"}
                        </span>
                    </label>
                )
            },
            {
                key: "sum",
                name: "SUM Column",
                width: 150,
                renderCell: ({ row }) => (
                    <label className="relative inline-flex items-center justify-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedSum.has(row.id)}
                            onChange={() => toggleSum(row.id)}
                            className="peer h-5 w-5 appearance-none rounded border-2 border-green-600 bg-white checked:bg-green-600 cursor-pointer focus:outline-none"
                        />
                        <span className="absolute text-white text-sm font-bold opacity-0 peer-checked:opacity-100 pointer-events-none">
                            {"\u2713"}
                        </span>
                    </label>
                )
            }
        ],
        [selectedGroup, selectedSub, selectedSum]
    );

    /* ---------------- Result View Columns ---------------- */
    const resultColumns: Column<any>[] = useMemo(() => {
        if (!resultData || resultData.length === 0) return [];

        const cols: Column<any>[] = [];
        const hasSubColumns = selectedSub.size > 0;
        const groupHeaderCellClass = (row: any) =>
            row.__rowType === 'groupHeader' ? 'group-header-cell' : undefined;

        // Helper function to check if column should be right-aligned
        const isRightAligned = (colName: string, colKey: string): boolean => {
            const normalizedColName = colName.replace(/\s+/g, '').toLowerCase();

            // First check if it's forced to be left-aligned (highest priority)
            if (normalizedLeftAlignedColumns.includes(normalizedColName)) {
                return false;
            }

            // Then check if it's in the API's rightList
            if (normalizedRightList.includes(normalizedColName)) {
                return true;
            }

            // Otherwise, detect if column is numeric based on data
            const sampleSize = Math.min(10, resultData.length);
            const sample = resultData.slice(0, sampleSize);

            let numericCount = 0;
            let validValuesCount = 0;

            for (const row of sample) {
                const value = row[colKey];
                if (value === null || value === undefined || value === '') continue;

                validValuesCount++;
                const rawValue = String(value);
                const cleanValue = rawValue.replace(/[,\s₹$€£¥]/g, '');
                const numValue = parseFloat(cleanValue);

                if (!isNaN(numValue)) {
                    numericCount++;
                }
            }

            return validValuesCount > 0 && numericCount / validValuesCount >= 0.7;
        };

        // Group Columns
        Array.from(selectedGroup).forEach((col, index) => {
            const groupKey = `group_${col}`;
            const shouldRightAlign = isRightAligned(col, groupKey);
            const isFirstGroupColumn = index === 0;

            cols.push({
                key: groupKey,
                name: col + " (Group)",
                resizable: true,
                cellClass: groupHeaderCellClass,
                renderCell: ({ row }) => {
                    const rowType = row.__rowType;

                    let displayValue = '';
                    if (rowType === 'grandTotal') {
                        displayValue = isFirstGroupColumn ? 'Grand Total' : '';
                    } else if (rowType === 'subtotal') {
                        if (isFirstGroupColumn) {
                            displayValue = 'Total';
                        }
                    } else if (rowType === 'groupHeader') {
                        displayValue = row[groupKey];
                    } else if (rowType === 'child') {
                        displayValue = hasSubColumns ? '' : row[groupKey];
                    }

                    return (
                        <div
                            className="w-full h-full flex items-center px-2"
                            style={{
                                justifyContent: shouldRightAlign ? 'flex-end' : 'flex-start',
                                textAlign: shouldRightAlign ? 'right' : 'left'
                            }}
                        >
                            {displayValue}
                        </div>
                    );
                }
            });
        });

        // Sub Columns
        Array.from(selectedSub).forEach((col, index) => {
            const subKey = `sub_${col}`;
            const shouldRightAlign = isRightAligned(col, subKey);
            const isFirstSubColumn = index === 0;

            cols.push({
                key: subKey,
                name: col + " (Sub)",
                resizable: true,
                cellClass: groupHeaderCellClass,
                renderCell: ({ row }) => {
                    const rowType = row.__rowType;

                    let displayValue = '';
                    if (rowType === 'child') {
                        displayValue = row[subKey];
                    } else if (rowType === 'grandTotal') {
                        displayValue =
                            selectedGroup.size === 0 && isFirstSubColumn ? 'Grand Total' : '';
                    } else if (rowType === 'subtotal') {
                        displayValue =
                            selectedGroup.size === 0 && isFirstSubColumn ? 'Total' : '';
                    }

                    return (
                        <div
                            className="w-full h-full flex items-center px-2"
                            style={{
                                justifyContent: shouldRightAlign ? 'flex-end' : 'flex-start',
                                textAlign: shouldRightAlign ? 'right' : 'left'
                            }}
                        >
                            {displayValue}
                        </div>
                    );
                }
            });
        });

        // Sum Columns - check API rightList first, then default to right align (since they're numeric)
        Array.from(selectedSum).forEach(col => {
            const sumKey = `sum_${col}`;
            const shouldRightAlign = isRightAligned(col, sumKey);

            cols.push({
                key: sumKey,
                name: col + " (Total)",
                resizable: true,
                cellClass: groupHeaderCellClass,
                renderCell: ({ row }) => {
                    const rowType = row.__rowType;
                    const displayValue =
                        rowType === 'child' || rowType === 'subtotal' || rowType === 'grandTotal'
                            ? (typeof row[sumKey] === 'number' ? row[sumKey].toFixed(2) : row[sumKey])
                            : '';

                    return (
                        <div
                            className="w-full h-full flex items-center px-2"
                            style={{
                                justifyContent: shouldRightAlign ? 'flex-end' : 'flex-start',
                                textAlign: shouldRightAlign ? 'right' : 'left'
                            }}
                            title={
                                rowType === 'grandTotal'
                                    ? 'Grand Total'
                                    : rowType === 'subtotal'
                                        ? 'Group Total'
                                        : rowType === 'child'
                                            ? `Sum of ${row._count} records`
                                            : undefined
                            }
                        >
                            {displayValue}
                        </div>
                    );
                }
            });
        });

        return cols;
    }, [resultData, selectedGroup, selectedSub, selectedSum, normalizedRightList, normalizedLeftAlignedColumns]);

    const displayRows = useMemo(() => {
        if (!resultData) return [];

        const groupCols = Array.from(selectedGroup);
        const subCols = Array.from(selectedSub);
        const sumCols = Array.from(selectedSum);

        const normalizeValue = (value: any) =>
            value === null || value === undefined ? '' : String(value).trim();

        const shouldAddSubtotals = groupCols.length > 0 && subCols.length > 0;
        const groupingCols = groupCols.length > 0 ? groupCols : subCols;
        const getGroupKey = (row: any) =>
            groupingCols
                .map(col => {
                    const keyPrefix = groupCols.length > 0 ? 'group_' : 'sub_';
                    return normalizeValue(row[`${keyPrefix}${col}`]);
                })
                .join('|||');

        const rows: any[] = [];

        if (!shouldAddSubtotals) {
            resultData.forEach(row => {
                rows.push({ ...row, __rowType: 'child' });
            });
        } else {
            let currentGroupKey: string | null = null;
            let groupTotals: Record<string, number> = {};
            let groupCount = 0;
            let groupLabelValues: Record<string, any> = {};

            const resetGroupTotals = () => {
                groupTotals = {};
                sumCols.forEach(col => {
                    groupTotals[col] = 0;
                });
                groupCount = 0;
            };

            const pushGroupHeaderRow = () => {
                const headerRow: any = {
                    _key: `__group__${currentGroupKey}`,
                    __rowType: 'groupHeader'
                };
                groupCols.forEach(col => {
                    headerRow[`group_${col}`] = groupLabelValues[col];
                });
                rows.push(headerRow);
            };

            const pushSubtotalRow = () => {
                if (currentGroupKey === null) return;
                const subtotalRow: any = {
                    _key: `__subtotal__${currentGroupKey}`,
                    __rowType: 'subtotal',
                    _count: groupCount
                };
                groupCols.forEach(col => {
                    subtotalRow[`group_${col}`] = groupLabelValues[col];
                });
                sumCols.forEach(col => {
                    subtotalRow[`sum_${col}`] = groupTotals[col] ?? 0;
                });
                rows.push(subtotalRow);
            };

            resetGroupTotals();

            resultData.forEach(row => {
                const groupKey = getGroupKey(row);
                const isGroupStart = groupKey !== currentGroupKey;

                if (isGroupStart && currentGroupKey !== null) {
                    pushSubtotalRow();
                }

                if (isGroupStart) {
                    currentGroupKey = groupKey;
                    groupLabelValues = {};
                    groupCols.forEach(col => {
                        groupLabelValues[col] = row[`group_${col}`];
                    });
                    pushGroupHeaderRow();
                    resetGroupTotals();
                }

                rows.push({ ...row, __rowType: 'child' });

                groupCount += row._count || 0;
                sumCols.forEach(col => {
                    const val = row[`sum_${col}`];
                    groupTotals[col] += typeof val === 'number' ? val : 0;
                });
            });

            if (rows.length > 0) {
                pushSubtotalRow();
            }
        }

        if (rows.length === 0) return rows;

        const grandTotals = {
            count: resultData.reduce((acc, row) => acc + (row._count || 0), 0),
            sums: {} as Record<string, number>
        };

        sumCols.forEach(col => {
            grandTotals.sums[col] = resultData.reduce((acc, row) => {
                const val = row[`sum_${col}`];
                return acc + (typeof val === 'number' ? val : 0);
            }, 0);
        });

        const totalRow: any = {
            _key: '__total__',
            __rowType: 'grandTotal',
            _count: grandTotals.count
        };

        sumCols.forEach(col => {
            totalRow[`sum_${col}`] = grandTotals.sums[col] ?? 0;
        });

        rows.push(totalRow);

        return rows;
    }, [resultData, selectedGroup, selectedSub, selectedSum]);


    /* ---------------- Render Guard ---------------- */
    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-7xl mx-4 flex flex-col max-h-[90vh]"
                style={{ backgroundColor: colors.cardBackground, color: colors.text }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 style={{ color: colors.text }} className="text-xl font-semibold">
                        {viewMode === 'config' ? `${pageName} - Group & Sum Configuration` : `${pageName} - Grouped Results`}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1 relative">
                    {isCalculating && (
                        <div className="absolute inset-0 z-50 bg-white/50 flex items-center justify-center">
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                                <span className="mt-2 text-sm text-blue-600 font-semibold">Calculating...</span>
                            </div>
                        </div>
                    )}
                    {viewMode === 'config' ? (
                        <>
                            <p className="text-sm text-gray-500 mb-3">
                                Select columns to group by, sub columns, and columns to calculate totals.
                            </p>
                            <div className="border rounded-lg h-full min-h-[400px] overflow-y-auto">
                                <DataGrid
                                    columns={configColumns}
                                    rows={configRows}
                                    rowKeyGetter={(row) => row.id}
                                    style={{
                                        backgroundColor: colors.background,
                                        color: colors.text,
                                        fontFamily: fonts.content,
                                        height: '100%'
                                    }}
                                    className="rdg-light"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="border rounded-lg" style={{ height: '500px' }}>
                            {displayRows && displayRows.length > 0 ? (
                                <DataGrid
                                    columns={resultColumns}
                                    rows={displayRows}
                                    rowKeyGetter={(row: any) => row._key}
                                    style={{
                                        backgroundColor: colors.background,
                                        color: colors.text,
                                        fontFamily: fonts.content,
                                        height: '500px'
                                    }}
                                    rowClass={(row: any) =>
                                        row.__rowType === 'grandTotal'
                                            ? 'font-semibold bg-gray-100'
                                            : row.__rowType === 'subtotal'
                                                ? 'font-semibold bg-gray-50'
                                                : row.__rowType === 'groupHeader'
                                                    ? 'font-semibold bg-gray-50'
                                                    : undefined
                                    }
                                    className="rdg-light"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    No results generated.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex justify-between items-center gap-3">
                    <div className="flex gap-3">
                        {viewMode === 'result' ? (
                            <button
                                onClick={() => setViewMode('config')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 border"
                                style={{ color: colors.text, borderColor: '#e5e7eb' }}
                            >
                                <FaArrowLeft size={14} />
                                Back to Configuration
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
                                style={{ color: colors.text, backgroundColor: colors.buttonBackground }}
                            >
                                Cancel
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        {viewMode === 'result' && resultData && resultData.length > 0 && (
                            <>
                                <button
                                    onClick={exportToExcel}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border hover:bg-gray-50"
                                    style={{ color: colors.text, borderColor: '#e5e7eb' }}
                                    title="Export to Excel"
                                >
                                    <FaFileExcel size={16} className="text-green-600" />
                                    Excel
                                </button>
                                <button
                                    onClick={exportToPDF}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border hover:bg-gray-50"
                                    style={{ color: colors.text, borderColor: '#e5e7eb' }}
                                    title="Export to PDF"
                                >
                                    <FaFilePdf size={16} className="text-red-600" />
                                    PDF
                                </button>
                            </>
                        )}

                        {viewMode === 'config' && (
                            <button
                                onClick={calculateResults}
                                className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm text-white"
                                style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText || '#fff' }}
                            >
                                <FaCalculator size={14} />
                                Calculate Totals
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <style jsx global>{`
                .group-header-cell {
                    position: sticky;
                    top: var(--rdg-header-row-height);
                    z-index: 3;
                    background-color: #f9fafb;
                }
            `}</style>
        </div>,
        document.body
    );
};

export default GroupSumModal;
