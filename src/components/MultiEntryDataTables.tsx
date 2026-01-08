
import React, { useState } from 'react';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import moment from 'moment';

interface ValueBasedColor {
    key: string;
    checkNumber: number;
    lessThanColor: string;
    greaterThanColor: string;
    equalToColor: string;
}

interface DecimalColumn {
    key: string;
    decimalPlaces: number;
}

interface MultiEntryDataTablesProps {
    data: any[];
    settings?: {
        gridType?: string;
        gridDirection?: string;
        borderStyle?: string;
        fontSize?: number;
        hideColumnLabels?: string;
        hideEntireColumn?: string;
        textColors?: Array<{ key: string; value: string }>;
        valueBasedTextColor?: ValueBasedColor[];
        dateFormat?: { key: string; format: string };
        leftAlignedColums?: string;
        decimalColumns?: DecimalColumn[];
        [key: string]: any;
    };
}

// Helper functions (adapted from DataTable.tsx)
const formatDateValue = (value: string | number | Date, format: string = 'DD-MM-YYYY'): string => {
    if (!value) return '';
    try {
        const momentDate = moment(value.toString(), 'YYYYMMDD');
        if (!momentDate.isValid()) {
            const fallbackDate = moment(value);
            return fallbackDate.isValid() ? fallbackDate.format(format) : '';
        }
        return momentDate.format(format);
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

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

const getValueBasedColor = (
    value: number | string,
    colorRule: ValueBasedColor
): string => {
    if (value === null || value === undefined || value === '') {
        return '';
    }
    try {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue)) return '';

        if (numValue < colorRule.checkNumber) {
            return colorRule.lessThanColor;
        } else if (numValue > colorRule.checkNumber) {
            return colorRule.greaterThanColor;
        } else {
            return colorRule.equalToColor;
        }
    } catch (error) {
        console.error('Error determining value-based color:', error);
        return '';
    }
};

const MultiEntryDataTables: React.FC<MultiEntryDataTablesProps> = ({ data, settings }) => {
    const { colors, fonts } = useTheme();

    if (!data || data.length === 0) {
        return <div className="p-4 text-center">No nested data available.</div>;
    }

    // Top-level container
    return (
        <div style={{
            fontFamily: fonts.content,
             // Scroll logic moved to CustomRecursiveTable for sticky header support
        }} className="space-y-4">
            <CustomRecursiveTable data={data} colors={colors} fonts={fonts} settings={settings} />
        </div>
    );
};

const CustomRecursiveTable = ({ data, level = 0, colors, fonts, settings }: { data: any[]; level?: number; colors: any; fonts: any; settings?: any }) => {
    if (!data || data.length === 0) return null;

    // Detect structure from the first item
    const sampleItem = data[0];
    const keys = Object.keys(sampleItem);

    // Columns to hide
    const columnsToHide = settings?.hideEntireColumn
        ? settings.hideEntireColumn.split(',').map((col: string) => col.trim())
        : [];

    // Columns to hide labels
    const hiddenLabels = settings?.hideColumnLabels
        ? settings.hideColumnLabels.split(',').map((col: string) => col.trim())
        : [];

    // Separate primitive values (columns) from arrays (nested tables)
    const primitiveKeys = keys.filter(key =>
        (!Array.isArray(sampleItem[key]) && typeof sampleItem[key] !== 'object' || sampleItem[key] === null) &&
        key !== '_id' &&
        !columnsToHide.includes(key)
    );
    const arrayKeys = keys.filter(key => Array.isArray(sampleItem[key]) && !columnsToHide.includes(key));


    // Apply font size from settings if present
    const tableFontSize = settings?.fontSize ? `${settings.fontSize}px` : '12px'; // Default to text-xs equivalent
    
    // Grid type styling (basic support)
    const isOutline = settings?.borderStyle === 'outline';
    
    return (
        <div
            className={`overflow-x-auto ${level > 0 ? 'mt-2' : 'rounded-lg shadow-sm'}`}
            style={{
                border: isOutline || settings?.gridType === '2ColumnCard' ? `1px solid ${colors.textInputBorder}` : 'none', // Apply border if outline or 2ColumnCard
                marginLeft: level > 0 ? '8px' : '0', // Indent nested tables slightly
                ...(level === 0 ? { maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' } : {}) // Apply scroll to top level table
            }}
        >
            <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
                <thead style={{
                    backgroundColor: colors.primary,
                    color: colors.buttonText,
                    borderBottom: `1px solid ${colors.textInputBorder}`,
                    display: primitiveKeys.every(k => hiddenLabels.includes(k)) ? 'none' : 'table-header-group'
                }}>
                    <tr>
                        {arrayKeys.length > 0 && (
                            <th
                                className="px-4 py-2 w-10"
                                style={{
                                    borderRight: `1px solid ${colors.textInputBorder}`,
                                    ...(level === 0 ? { position: 'sticky', top: 0, zIndex: 10, backgroundColor: colors.primary } : {})
                                }}
                            ></th>
                        )}
                        {primitiveKeys.map((key, index) => (
                             !hiddenLabels.includes(key) && (
                                <th
                                    key={key}
                                    className="px-2 py-1 text-left font-semibold uppercase tracking-wider whitespace-nowrap"
                                    style={{
                                        fontSize: tableFontSize,
                                        color: colors.buttonText,
                                        borderRight: index === primitiveKeys.length - 1 ? 'none' : `1px solid ${colors.textInputBorder}`,
                                        ...(level === 0 ? { position: 'sticky', top: 0, zIndex: 10, backgroundColor: colors.primary } : {})
                                    }}
                                >
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                </th>
                             )
                        ))}
                    </tr>
                </thead>
                <tbody style={{ backgroundColor: colors.background }}>
                    {data.map((row, index) => (
                        <ExpandableRow
                            key={index}
                            index={index}
                            row={row}
                            primitiveKeys={primitiveKeys}
                            arrayKeys={arrayKeys}
                            level={level}
                            colors={colors}
                            fonts={fonts}
                            settings={settings}
                            tableFontSize={tableFontSize}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ExpandableRow = ({ row, primitiveKeys, arrayKeys, level, colors, fonts, index, settings, tableFontSize }: any) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    const toggleExpand = () => setIsExpanded(!isExpanded);

    const rowStyle = {
        backgroundColor: isHovered
            ? colors.color1
            : (index % 2 === 0 ? colors.evenCardBackground : colors.oddCardBackground),
        color: colors.text,
        cursor: 'default',
        transition: 'background-color 0.2s ease',
        fontSize: tableFontSize
    };

    // Helper to format individual cell values
    const getFormattedValue = (key: string, value: any) => {
        let formattedValue: React.ReactNode = value;
        const cellStyle: React.CSSProperties = { color: colors.text };

        // 1. Date Formatting
        if (settings?.dateFormat?.key) {
            const dateColumns = settings.dateFormat.key.split(',').map((k: string) => k.trim());
            if (dateColumns.includes(key)) {
                formattedValue = formatDateValue(value, settings.dateFormat.format);
            }
        }

        // 2. Decimal Formatting
        if (settings?.decimalColumns) {
            settings.decimalColumns.forEach((decimalSetting: DecimalColumn) => {
                 const decimalCols = decimalSetting.key.split(',').map((k: string) => k.trim());
                 if (decimalCols.includes(key)) {
                     formattedValue = formatDecimalValue(value, decimalSetting.decimalPlaces);
                 }
            });
        }
        
         // 3. Left Alignment Check
         const leftAlignedColumns = settings?.leftAlignedColumns || settings?.leftAlignedColums
         ? (settings?.leftAlignedColumns || settings?.leftAlignedColums).split(',').map((col: string) => col.trim())
         : [];
        //  const isLeftAligned = leftAlignedColumns.includes(key);


        // 4. Value Based Text Color
        if (settings?.valueBasedTextColor) {
            settings.valueBasedTextColor.forEach((colorRule: ValueBasedColor) => {
                const columns = colorRule.key ? colorRule.key.split(',').map((k: string) => k.trim()) : []; // Handle empty key if it means 'apply to all numeric'? No, usually key specific. 
                // Wait, user provided: "valueBasedTextColor": [ { "key": "Debit Qty", ... } ]
                // But one entry has "key": "" in "textColors"
                
                if (columns.includes(key)) {
                     const color = getValueBasedColor(value, colorRule);
                     if (color) {
                         cellStyle.color = color;
                     }
                }
            });
        }
        
        // 5. Global Text Colors (e.g. key="" for all?) or specific keys
        if (settings?.textColors) {
            settings.textColors.forEach((textColorRule: { key: string; value: string }) => {
                 if (textColorRule.key === key) {
                     cellStyle.color = textColorRule.value;
                 }
            });
        }


        // Wrap in div for styling
        return <div style={cellStyle}>{formattedValue}</div>;
    };


    return (
        <>
            <tr
                style={rowStyle}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {arrayKeys.length > 0 && (
                    <td
                        className="px-2 py-1 whitespace-nowrap w-8 text-center cursor-pointer"
                        onClick={toggleExpand}
                        style={{
                            color: colors.text,
                            borderRight: `1px solid ${colors.textInputBorder}`,
                            borderBottom: `1px solid ${colors.textInputBorder}`,
                             fontSize: tableFontSize
                        }}
                    >
                        {isExpanded ? <FaMinus size={10} /> : <FaPlus size={10} />}
                    </td>
                )}
                {primitiveKeys.map((key: string, colIndex: number) => (
                    <td
                        key={key}
                        className="px-2 py-1 whitespace-nowrap"
                        style={{
                            color: colors.text,
                            borderRight: colIndex === primitiveKeys.length - 1 ? 'none' : `1px solid ${colors.textInputBorder}`,
                            borderBottom: `1px solid ${colors.textInputBorder}`,
                            fontSize: tableFontSize
                        }}
                    >
                        {getFormattedValue(key, row[key])}
                    </td>
                ))}
            </tr>
            {isExpanded && arrayKeys.length > 0 && (
                <tr style={{ backgroundColor: colors.background }}>
                    <td
                        colSpan={primitiveKeys.length + (arrayKeys.length > 0 ? 1 : 0)}
                        className="p-2"
                        style={{
                            borderBottom: `1px solid ${colors.textInputBorder}`
                        }}
                    >
                        {arrayKeys.map((arrayKey: string) => (
                            row[arrayKey] && row[arrayKey].length > 0 && (
                                <div key={arrayKey} className="mb-2 last:mb-0">
                                    <div className="mb-2 font-semibold uppercase" style={{ color: colors.text, fontSize: tableFontSize }}>
                                        {arrayKey.replace(/([A-Z])/g, ' $1').trim()}
                                    </div>
                                    <CustomRecursiveTable data={row[arrayKey]} level={level + 1} colors={colors} fonts={fonts} settings={settings} />
                                </div>
                            )
                        ))}
                    </td>
                </tr>
            )}
        </>
    );
};

export default MultiEntryDataTables;
