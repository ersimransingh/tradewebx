
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

// Initialize pdfMake vfs
// @ts-ignore
if (pdfMake.vfs === undefined && pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
    // @ts-ignore
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else if (pdfMake.vfs === undefined && pdfFonts && pdfFonts.vfs) {
    // @ts-ignore
    pdfMake.vfs = pdfFonts.vfs;
}

// Helper: Convert BMP to PNG for PDF/Excel
export const convertBmpToPng = (bmpBase64: string): Promise<string> => {
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

// Helper: Recursive Search
export const recursiveSearch = (data: any[], searchTerm: string): any[] => {
    if (!searchTerm) return data;
    const lowerTerm = searchTerm.toLowerCase();

    return data.reduce((acc: any[], item: any) => {
        // Check if current item has primitive match
        const hasMatch = Object.entries(item).some(([value]) => {
            if (Array.isArray(value) || typeof value === 'object') return false;
            return String(value).toLowerCase().includes(lowerTerm);
        });

        // Check children recursively
        // const childMatch = false;
        const newItem = { ...item };
        let hasChildMatch = false;

        Object.keys(item).forEach(key => {
            if (Array.isArray(item[key])) {
                const filteredChildren = recursiveSearch(item[key], searchTerm);
                if (filteredChildren.length > 0) {
                    newItem[key] = filteredChildren;
                    hasChildMatch = true;
                }
            }
        });

        if (hasMatch || hasChildMatch) {
            acc.push(newItem);
        }

        return acc;
    }, []);
};

// --- PDF Generation ---

const processNodeForPdf = (data: any[], level = 0): any => {
    if (!data || data.length === 0) return null;

    // Detect structure
    const sample = data[0];
    const primitiveKeys = Object.keys(sample).filter(k => (!Array.isArray(sample[k]) && typeof sample[k] !== 'object' || sample[k] === null) && k !== '_id');
    const arrayKeys = Object.keys(sample).filter(k => Array.isArray(sample[k]));

    const tableBody = [];

    // Header Row
    tableBody.push(primitiveKeys.map(key => ({
        text: key.replace(/([A-Z])/g, ' $1').trim(),
        bold: true,
        fillColor: level === 0 ? '#cccccc' : '#eeeeee',
        style: 'tableHeader',
        fontSize: level === 0 ? 10 : 9
    })));

    // Data Rows
    data.forEach(row => {
        // 1. Render Current Level Row
        const rowData = primitiveKeys.map(key => {
             let val = row[key];
             if (val === null || val === undefined) val = "";
             return {
                 text: String(val),
                 fontSize: level === 0 ? 9 : 8
             };
        });
        tableBody.push(rowData);

        // 2. Render Nested Tables (if any)
        arrayKeys.forEach(arrayKey => {
            if (row[arrayKey] && Array.isArray(row[arrayKey]) && row[arrayKey].length > 0) {
                 const nestedContent = processNodeForPdf(row[arrayKey], level + 1);
                 if (nestedContent) {
                     tableBody.push([{
                         colSpan: primitiveKeys.length,
                         table: {
                             widths: ['*'],
                             body: [[
                                 {
                                     stack: [
                                         { text: arrayKey.replace(/([A-Z])/g, ' $1').trim(), bold: true, fontSize: 9, margin: [0, 5, 0, 2] },
                                         nestedContent
                                     ]
                                 }
                             ]]
                         },
                         layout: 'noBorders',
                         margin: [10, 0, 0, 5] // Indent
                     }, ...Array(primitiveKeys.length - 1).fill("")]);
                 }
            }
        });
    });

    return {
        table: {
            headerRows: 1,
            widths: primitiveKeys.map(() => 'auto'), // Adaptive widths
            body: tableBody
        },
        layout: 'lightHorizontalLines',
        marginBottom: 5
    };
};

export const generatePdf = async (data: any[], headerData: any, appMetadata: any) => {

    let logoImage = '';
    if (appMetadata?.companyLogo) {
        try {
            logoImage = await convertBmpToPng(appMetadata.companyLogo);
        } catch (err) {
            console.warn("Logo conversion failed:", err);
        }
    }

    const companyName = headerData?.CompanyName?.[0] || appMetadata?.companyName || "Company Name";
    const reportHeader = headerData?.ReportHeader?.[0] || "Report";
    const dateRange = "Report Date: " + dayjs().format('DD/MM/YYYY'); // Simplified for now

    const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        content: [
            {
                columns: [
                    logoImage ? {
                        image: logoImage,
                        width: 60,
                        height: 40
                    } : { text: '' },
                    {
                        stack: [
                            { text: companyName, style: 'header', alignment: 'center' },
                            { text: reportHeader, style: 'subheader', alignment: 'center', margin: [0, 5, 0, 0] },
                            { text: dateRange, style: 'small', alignment: 'center', margin: [0, 2, 0, 10] }
                        ],
                        width: '*'
                    }
                ],
                margin: [0, 0, 0, 10]
            },
            { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 760, y2: 5, lineWidth: 1 }] },
            { text: '', margin: [0, 0, 0, 10] },
            processNodeForPdf(data)
        ],
        styles: {
            header: { fontSize: 16, bold: true },
            subheader: { fontSize: 12, bold: true },
            tableHeader: { bold: true, color: 'black' },
            small: { fontSize: 8, italics: true }
        }
    };

    pdfMake.createPdf(docDefinition).download("MultiLevelReport.pdf");
};


// --- Excel Generation ---

const processNodeForExcel = (worksheet: ExcelJS.Worksheet, data: any[], level: number, startRow: number): number => {
    if (!data || data.length === 0) return startRow;

    let currentRow = startRow;
    const sample = data[0];
    const primitiveKeys = Object.keys(sample).filter(k => (!Array.isArray(sample[k]) && typeof sample[k] !== 'object' || sample[k] === null) && k !== '_id');
    const arrayKeys = Object.keys(sample).filter(k => Array.isArray(sample[k]));

    // Header
    const headerRow = worksheet.getRow(currentRow);
    primitiveKeys.forEach((key, colIndex) => {
        const cell = headerRow.getCell(level + 1 + colIndex); // Indent by level
        cell.value = key.replace(/([A-Z])/g, ' $1').trim();
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: level === 0 ? 'FF4F81BD' : 'FF808080' } // Blue for top, Grey for nested
        };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });
    currentRow++;

    // Data
    data.forEach(row => {
        const dataRow = worksheet.getRow(currentRow);
        primitiveKeys.forEach((key, colIndex) => {
            const cell = dataRow.getCell(level + 1 + colIndex);
            cell.value = row[key];
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            
            // Basic type formatting
            if (typeof row[key] === 'number') {
                cell.numFmt = '#,##0.00';
            }
        });
        currentRow++;

        // Nested Arrays
        arrayKeys.forEach(arrayKey => {
            if (row[arrayKey] && Array.isArray(row[arrayKey]) && row[arrayKey].length > 0) {
                // Section Title for Nested
                const titleRow = worksheet.getRow(currentRow);
                const titleCell = titleRow.getCell(level + 2);
                titleCell.value = `> ${arrayKey.replace(/([A-Z])/g, ' $1').trim()}`;
                titleCell.font = { italic: true, bold: true };
                currentRow++;

                // Recurse
                currentRow = processNodeForExcel(worksheet, row[arrayKey], level + 1, currentRow);
                currentRow++; // Spacing
            }
        });
    });

    return currentRow;
};

export const generateExcel = async (data: any[], headerData: any, appMetadata: any) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Logo
    if (appMetadata?.companyLogo) {
        try {
            const pngLogo = await convertBmpToPng(appMetadata.companyLogo);
            const imageId = workbook.addImage({
                base64: pngLogo,
                extension: 'png',
            });
            worksheet.addImage(imageId, {
                tl: { col: 0, row: 0 },
                ext: { width: 120, height: 60 }
            });
        } catch (e) { console.warn("Excel logo error", e); }
    }

    // Headers
    const companyName = headerData?.CompanyName?.[0] || appMetadata?.companyName || "Company Name";
    const reportHeader = headerData?.ReportHeader?.[0] || "Report Header";
    
    // Add some rows for header
    worksheet.mergeCells('C1:I1');
    worksheet.getCell('C1').value = companyName;
    worksheet.getCell('C1').font = { size: 16, bold: true };
    worksheet.getCell('C1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('C2:I2');
    worksheet.getCell('C2').value = reportHeader;
    worksheet.getCell('C2').font = { size: 12, bold: true };
    worksheet.getCell('C2').alignment = { horizontal: 'center' };

    const startRow = 5;
    processNodeForExcel(worksheet, data, 0, startRow);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "MultiLevelReport.xlsx");
};

// --- CSV Generation ---
const processNodeForCsv = (data: any[], level = 0): string => {
    if (!data || data.length === 0) return "";

    let csvContent = "";
    const sample = data[0];
    // Filter primitive keys for columns
    const primitiveKeys = Object.keys(sample).filter(k => 
        (!Array.isArray(sample[k]) && typeof sample[k] !== 'object' || sample[k] === null) &&
        k !== '_id'
    );
    const arrayKeys = Object.keys(sample).filter(k => Array.isArray(sample[k]));

    // Helper to escape CSV values
    const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return "";
        const stringVal = String(val);
        if (stringVal.includes(",") || stringVal.includes("\n") || stringVal.includes('"')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
    };

    // Header for this level (only if level 0, or maybe repeats? Let's just do it for level 0 for now to keep it simple, or maybe identifier)
    // For recursive CSV, it's tricky. Let's do a simple indented format.
    
    // Header Row
    const indent = "  ".repeat(level);
    if (data.length > 0) {
        csvContent += indent + primitiveKeys.map(k => escapeCsv(k.replace(/([A-Z])/g, ' $1').trim())).join(",") + "\n";
    }

    // Data Rows
    data.forEach(row => {
        const rowData = primitiveKeys.map(k => escapeCsv(row[k]));
        csvContent += indent + rowData.join(",") + "\n";

        // Nested Data
        arrayKeys.forEach(arrayKey => {
            if (row[arrayKey] && Array.isArray(row[arrayKey]) && row[arrayKey].length > 0) {
                 csvContent += indent + `> ${arrayKey}\n`; // Marker for nested section
                 csvContent += processNodeForCsv(row[arrayKey], level + 1);
            }
        });
    });

    return csvContent;
};

export const generateCsv = (data: any[], headerData: any) => {
    const companyName = headerData?.CompanyName?.[0] || "Company Name";
    const reportHeader = headerData?.ReportHeader?.[0] || "Report Header";
    
    let csvContent = `"${companyName}"\n"${reportHeader}"\n\n`;
    csvContent += processNodeForCsv(data);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "MultiLevelReport.csv");
};
