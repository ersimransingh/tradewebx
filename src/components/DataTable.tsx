"use client";
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { BASE_URL } from '@/utils/constants';
import { buildFilterXml,  getLocalStorage, getTextWidthSize, sendEmailMultiCheckbox } from '@/utils/helper';
import { toast } from "react-toastify";
import TableStyling from './ui/table/TableStyling';
import apiService from '@/utils/apiService';
import { useLocalStorage } from '@/hooks/useLocalListner';
import Loader from './Loader';
import { handleDownloadZipByFormat, handleSendEmailByFormat } from '@/utils/dataTableHelper';
import { ensureContrastColor,getReadableTextColor } from '@/utils/helper';


// Column Filter Component
const ColumnFilterDropdown: React.FC<{
    column: string;
    filter: ColumnFilter | null;
    onFilterChange: (column: string, filter: ColumnFilter | null) => void;
    data: any[];
}> = ({ column, filter, onFilterChange, data }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [localFilter, setLocalFilter] = useState<ColumnFilter>(
        filter || { type: 'text', operator: 'equals', value: null }
    );
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    // Enhanced data type detection
    const columnDataType = useMemo(() => {
        console.log('Column Type Detection for:', column);

        // Force date type for columns with "date" in the name
        if (column.toLowerCase().includes('date')) {
            console.log('Detected as date column (name contains date)');
            return 'date';
        }

        if (!data || data.length === 0) {
            console.log('No data, defaulting to text');
            return 'text';
        }

        // Sample first 10 rows to determine data type
        const sampleSize = Math.min(10, data.length);
        const sample = data.slice(0, sampleSize);

        let numericCount = 0;
        let dateCount = 0;
        let pureTextCount = 0;
        let validValuesCount = 0;

        console.log('Analyzing sample data for column:', column, 'Sample size:', sampleSize);

        for (const row of sample) {
            const value = row[column];

            // Handle React elements (styled values)
            const actualValue = React.isValidElement(value)
                ? (value as StyledValue).props.children
                : value;

            // Skip null/undefined/empty values
            if (actualValue === null || actualValue === undefined || actualValue === '') {
                continue;
            }

            validValuesCount++;
            const strValue = String(actualValue).trim();

            console.log('Sample value:', strValue, 'from row:', row[column]);

            // Check if it's a date (but this is now secondary to name-based detection)
            const momentDate = moment(strValue, ['YYYYMMDD', 'DD-MM-YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], true);
            const isValidDate = momentDate.isValid();

            if (isValidDate) {
                dateCount++;
                continue;
            }

            // Check if it's numeric (including decimals, formatted numbers, currency)
            const cleanValue = strValue.replace(/[,\s₹$€£¥]/g, ''); // Remove commas, spaces, and currency symbols
            const numValue = parseFloat(cleanValue);

            // More comprehensive numeric pattern that handles currency and formatting
            const numericPattern = /^[₹$€£¥]?-?[\d,]+\.?\d*[₹$€£¥]?$/;

            if (!isNaN(numValue) && isFinite(numValue) && numericPattern.test(strValue.replace(/\s/g, ''))) {
                console.log('Detected as numeric:', strValue, '-> parsed:', numValue);
                numericCount++;
                continue;
            }

            // Check for alphanumeric content - distinguish between codes vs regular data
            // Complex codes that shouldn't have filters (longer, complex patterns)
            const isComplexCode = /^[a-zA-Z]{2,}[\d]{3,}$/.test(strValue) || // NS250123 type (2+ letters, 3+ digits)
                /^[\d]{3,}[a-zA-Z]{2,}$/.test(strValue) || // 12345AB type (3+ digits, 2+ letters)  
                /^[a-zA-Z]+\d+[a-zA-Z]+/.test(strValue) || // ABC123DEF type (mixed)
                strValue.length >= 8; // Very long strings are likely codes

            // Simple alphanumeric that should have text filters (shorter, simpler patterns)
            const isSimpleAlphanumeric = /^[a-zA-Z]{1,3}[\d]{1,3}$/.test(strValue) || // ABP289, A12 type
                /^[\d]{1,3}[a-zA-Z]{1,3}$/.test(strValue);   // 12A, 123AB type

            // Check for pure text or complex codes that shouldn't have filters
            if (/^[a-zA-Z\s]+$/.test(strValue) || // Pure alphabetic text
                isComplexCode || // Complex alphanumeric codes
                strValue.length < 3) { // Very short strings
                pureTextCount++;
            }
        }

        // Determine data type based on majority
        if (validValuesCount === 0) {
            console.log('No valid values, returning none');
            return 'none'; // No valid data - no filter
        }

        const numericPercentage = numericCount / validValuesCount;
        const datePercentage = dateCount / validValuesCount;
        const pureTextPercentage = pureTextCount / validValuesCount;

        console.log('Column analysis results:', {
            column,
            validValuesCount,
            numericCount,
            dateCount,
            pureTextCount,
            numericPercentage,
            datePercentage,
            pureTextPercentage
        });

        // If 70% or more is dates, treat as date column
        if (datePercentage >= 0.7) {
            console.log('Detected as date column');
            return 'date';
        }

        // If 70% or more is numeric, treat as numeric column
        if (numericPercentage >= 0.7) {
            console.log('Detected as number column');
            return 'number';
        }

        // For text columns (including pure text), allow text filtering with "contains/like" option
        console.log('Detected as text column');
        return 'text';
    }, [data, column]);

    const isNumericColumn = columnDataType === 'number';
    const isDateColumn = columnDataType === 'date';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const updatePosition = () => {
            if (buttonRef.current && isOpen) {
                const rect = buttonRef.current.getBoundingClientRect();
                const dropdownWidth = 256; // w-64 = 16rem = 256px
                const viewportWidth = window.innerWidth;
                const spaceOnRight = viewportWidth - rect.right;
                const spaceOnLeft = rect.left;

                let left = rect.left + window.scrollX;

                // If dropdown would go off-screen on the right, position it to the left
                if (spaceOnRight < dropdownWidth && spaceOnLeft >= dropdownWidth) {
                    // Position dropdown to the right edge of the button, extending leftward
                    left = rect.right + window.scrollX - dropdownWidth;
                }

                // Ensure dropdown doesn't go off-screen on the left
                if (left < window.scrollX) {
                    left = window.scrollX + 8; // 8px margin from edge
                }

                setDropdownPosition({
                    top: rect.bottom + window.scrollY + 4,
                    left: left
                });
            }
        };

        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    // Debug: Track isOpen state changes
    useEffect(() => {
        // console.log('📊 isOpen state changed for column', column, ':', isOpen);
    }, [isOpen, column]);

    // Don't render filter dropdown if data type is 'none'
    if (columnDataType === 'none') {
        return null;
    }

    const handleApplyFilter = () => {
        console.log('Apply Filter Debug:', {
            column,
            filterType,
            columnDataType,
            isNumericColumn,
            localFilterValue: localFilter.value,
            localFilterOperator: localFilter.operator,
            localFilterFromDate: localFilter.fromDate,
            localFilterToDate: localFilter.toDate
        });

        // Check if filter has valid values
        const hasValue = localFilter.operator === 'dateRange'
            ? (localFilter.fromDate && localFilter.toDate) // Date range needs both dates
            : (localFilter.value !== null && localFilter.value !== '' && localFilter.value !== undefined); // Other filters need value

        if (!hasValue) {
            console.log('No valid filter values, clearing filter');
            onFilterChange(column, null);
        } else {
            // For number filters, ensure the value is stored as a number for comparison
            const filterToApply = { ...localFilter };

            // Override type based on detected column type, but preserve dateRange logic
            if (localFilter.operator === 'dateRange') {
                // Date range always needs type: 'date' regardless of column detection
                filterToApply.type = 'date';
            } else {
                // For other operators, use the detected column type
                filterToApply.type = filterType as 'number' | 'text' | 'date';
            }

            console.log('Final filter being applied:', filterToApply);

            if (filterType === 'number' && localFilter.value !== '' && localFilter.operator !== 'dateRange') {
                const numValue = parseFloat(localFilter.value as string);
                if (!isNaN(numValue)) {
                    filterToApply.value = numValue;
                }
            }
            console.log('About to call onFilterChange with:', column, filterToApply);
            onFilterChange(column, filterToApply);
        }
        setIsOpen(false);
    };

    const handleClearFilter = () => {
        setLocalFilter({ type: 'text', operator: 'equals', value: null });
        onFilterChange(column, null);
        setIsOpen(false);
    };

    const getFilterType = () => {
        if (isDateColumn) return 'date';
        if (isNumericColumn) return 'number';
        return 'text';
    };

    const filterType = getFilterType();

    // console.log('🔧 ColumnFilterDropdown render for column:', column, 'isOpen:', isOpen, 'filter:', filter);

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                className={`ml-1 p-1 rounded hover:bg-gray-200 ${filter ? 'text-black' : 'text-gray-400'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsOpen(prev => !prev);
                }}
                title="Filter column"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z" />
                </svg>
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="w-64 bg-white border border-gray-300 rounded shadow-lg p-3"
                    style={{
                        position: 'fixed',
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        zIndex: 999999,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}
                >
                    <div className="space-y-3">
                        {filterType === 'date' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Filter Type
                                    </label>
                                    <select
                                        value={localFilter.operator}
                                        onChange={(e) => setLocalFilter({
                                            ...localFilter,
                                            operator: e.target.value as ColumnFilter['operator']
                                        })}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    >
                                        <option value="equals">Equals</option>
                                        <option value="dateRange">Date Range</option>
                                    </select>
                                </div>

                                {localFilter.operator === 'dateRange' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                From Date
                                            </label>
                                            <input
                                                type="date"
                                                value={localFilter.fromDate || ''}
                                                onChange={(e) => setLocalFilter({
                                                    ...localFilter,
                                                    fromDate: e.target.value
                                                })}
                                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                To Date
                                            </label>
                                            <input
                                                type="date"
                                                value={localFilter.toDate || ''}
                                                onChange={(e) => setLocalFilter({
                                                    ...localFilter,
                                                    toDate: e.target.value
                                                })}
                                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date Value
                                        </label>
                                        <input
                                            type="date"
                                            value={localFilter.value as string || ''}
                                            onChange={(e) => setLocalFilter({
                                                ...localFilter,
                                                value: e.target.value
                                            })}
                                            className="w-full p-2 border border-gray-300 rounded text-sm"
                                        />
                                    </div>
                                )}
                            </>
                        ) : filterType === 'text' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Filter Type
                                    </label>
                                    <select
                                        value={localFilter.operator}
                                        onChange={(e) => setLocalFilter({
                                            ...localFilter,
                                            operator: e.target.value as ColumnFilter['operator']
                                        })}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    >
                                        <option value="contains">Contains</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Value
                                    </label>
                                    <input
                                        type="text"
                                        value={localFilter.value as string || ''}
                                        onChange={(e) => {
                                            setLocalFilter({
                                                ...localFilter,
                                                value: e.target.value
                                            });
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        placeholder="Enter text to search"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Filter Type
                                    </label>
                                    <select
                                        value={localFilter.operator}
                                        onChange={(e) => setLocalFilter({
                                            ...localFilter,
                                            operator: e.target.value as ColumnFilter['operator']
                                        })}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    >
                                        <option value="equals">Equals</option>
                                        <option value="gte">Greater than or equal to</option>
                                        <option value="lte">Less than or equal to</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Value
                                    </label>
                                    <input
                                        type="text"
                                        value={localFilter.value as string || ''}
                                        onChange={(e) => {
                                            const inputValue = e.target.value;

                                            if (filterType === 'number') {
                                                // Allow empty string, numbers, negative numbers, and decimals
                                                if (inputValue === '' || /^-?\d*\.?\d*$/.test(inputValue)) {
                                                    setLocalFilter({
                                                        ...localFilter,
                                                        value: inputValue === '' ? '' : inputValue
                                                    });
                                                }
                                                // If invalid number pattern, don't update the state
                                            } else {
                                                // For text filters, allow any input
                                                setLocalFilter({
                                                    ...localFilter,
                                                    value: inputValue
                                                });
                                            }
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        placeholder={`Enter ${filterType === 'number' ? 'number (e.g., 500, -500, 0)' : 'text'} value`}
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex space-x-2">
                            <button
                                onClick={handleApplyFilter}
                                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                                Apply
                            </button>
                            <button
                                onClick={handleClearFilter}
                                className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// Interface for Selectable_Buttons setting
export interface SelectableButton {
    name: string;
    type?: string;
    API: {
        J_Ui: {
            ActionName: string;
            Option: string;
            RequestFrom: string;
            [key: string]: any;
        };
        [key: string]: any;
    };
}

interface SelectableButtonsSetting {
    isCheckbox: boolean;
    buttons: SelectableButton[];
}

interface DataTableProps {
    data: any[];
    filtersCheck?: any;
    pageData?: any
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
        Selectable_Buttons?: SelectableButtonsSetting;
        [key: string]: any;
    };
    onRowClick?: (record: any) => void;
    onRowSelect?: (selectedRows: any[]) => void;
    onSelectableButtonClick?: (button: SelectableButton, selectedRows: any[]) => void;
    tableRef?: React.RefObject<HTMLDivElement>;
    summary?: any;
    isEntryForm?: boolean;
    handleAction?: (action: string, record: any) => void;
    fullHeight?: boolean;
    showViewDocument?: boolean;
    buttonConfig?: Array<{
        ButtonType: string;
        EnabledTag: string;
    }>;
    // Props for detail column click functionality
    detailColumns?: Array<{
        Srno: number;
        wKey: string;
        showLabel: boolean;
        DetailAPI: any;
    }>;
    onDetailColumnClick?: (columnKey: string, rowData: any) => void;
    frozenColumns?: string[];
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

interface ColumnFilter {
    type: 'number' | 'text' | 'date';
    operator: 'gte' | 'lte' | 'equals' | 'dateRange' | 'contains';
    value: string | number | null;
    fromDate?: string;
    toDate?: string;
}

interface FilterState {
    [columnKey: string]: ColumnFilter;
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

const DataTable: React.FC<DataTableProps> = ({ data, settings, onRowClick, onRowSelect, onSelectableButtonClick, tableRef, summary, isEntryForm = false, handleAction = () => { }, fullHeight = true, showViewDocument = false, buttonConfig, filtersCheck, pageData, detailColumns, onDetailColumnClick, frozenColumns = [] }) => {

    // 🆕 ADDITION: Multi-checkbox toggle handler
    const toggleRowSelection = (row: any, checked: boolean) => {
        const updated = checked
            ? [...selectedRows, row]
            : selectedRows.filter(r => r._id !== row._id);

        setSelectedRows(updated);
        onRowSelect?.(updated);
    };





    // Helper function to check if a button is enabled
    const isButtonEnabled = (buttonType: string): boolean => {
        if (!buttonConfig) return true; // Default to enabled if no config
        const config = buttonConfig.find((config: any) => config.ButtonType === buttonType);
        return config?.EnabledTag === "true";
    };
    const { colors, fonts } = useTheme();
    const bgColor = colors?.color3 || "#f0f0f0";
    const [sortColumns, setSortColumns] = useState<any[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [filters, setFilters] = useState<FilterState>({});

    const { tableStyle } = useAppSelector((state: RootState) => state.common);

    const rowHeight = tableStyle === 'small' ? 30 : tableStyle === 'medium' ? 40 : 50;
    const screenSize = useScreenSize();
    const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
    const [userId] = useLocalStorage('userId', null);
    const [userType] = useLocalStorage('userType', null);
    const [isLoading, setIsLoading] = useState(false);

    const fundLogic = settings.FundRequestOTP
    
    // 🆕 Auto-select all rows on load if multiCheckBox is enabled
    useEffect(() => {
        if (settings?.multiCheckBox && data?.length > 0) {
            setSelectedRows(data.map((row, index) => ({
                ...row,
                _id: row.id || index
            })));
        }
    }, [settings?.multiCheckBox, data]);


    // Filter functions
    const handleFilterChange = useCallback((columnKey: string, filter: ColumnFilter | null) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            if (filter === null) {
                delete newFilters[columnKey];
            } else {
                newFilters[columnKey] = filter;
            }
            return newFilters;
        });
    }, []);

    const applyFilters = useCallback((data: any[]) => {
        if (Object.keys(filters).length === 0) return data;

        return data.filter(row => {
            return Object.entries(filters).every(([columnKey, filter]) => {
                const cellValue = row[columnKey];

                // Handle React elements (from value-based text color formatting)
                const actualValue = React.isValidElement(cellValue)
                    ? (cellValue as StyledValue).props.children
                    : cellValue;

                if (actualValue === null || actualValue === undefined || actualValue === '') {
                    return false;
                }

                const stringValue = String(actualValue).trim();

                switch (filter.operator) {
                    case 'equals':
                        console.log('EQUALS Filter Debug:', {
                            columnKey,
                            filterType: filter.type,
                            filterValue: filter.value,
                            stringValue
                        });

                        // Runtime date detection: if column name contains 'date' or value looks like a date, treat as date
                        const isDateColumn = columnKey.toLowerCase().includes('date');
                        const cellLooksLikeDate = moment(stringValue, ['DD-MM-YYYY', 'YYYYMMDD', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'], true).isValid();
                        const filterLooksLikeDate = moment(filter.value as string, ['DD-MM-YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'], true).isValid();

                        const treatAsDate = filter.type === 'date' || isDateColumn || (cellLooksLikeDate && filterLooksLikeDate);

                        if (treatAsDate) {
                            // Parse cell date in multiple formats
                            const cellDate = moment(stringValue, ['DD-MM-YYYY', 'YYYYMMDD', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'], true);
                            const filterDate = moment(filter.value as string, ['DD-MM-YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'], true);

                            const result = cellDate.isValid() && filterDate.isValid() &&
                                cellDate.isSame(filterDate, 'day');
                            return result;
                        } else if (filter.type === 'number') {
                            // Handle formatted numbers (with commas, spaces, currency symbols)
                            const cleanCellValue = stringValue.replace(/[,\s₹$€£¥]/g, '');
                            const cleanFilterValue = String(filter.value).replace(/[,\s₹$€£¥]/g, '');

                            const numValue = parseFloat(cleanCellValue);
                            const filterValue = parseFloat(cleanFilterValue);

                            // Check if both are valid numbers
                            if (isNaN(numValue) || isNaN(filterValue)) {
                                return false;
                            }

                            // For equals, always use exact number comparison
                            const result = numValue === filterValue;
                            return result;
                        } else {
                            // Text search - case insensitive contains
                            return stringValue.toLowerCase().includes(String(filter.value).toLowerCase());
                        }

                    case 'gte':
                        if (filter.type === 'number') {
                            const cleanCellValue = stringValue.replace(/[,\s₹$€£¥]/g, '');
                            const cleanFilterValue = String(filter.value).replace(/[,\s₹$€£¥]/g, '');
                            const numValue = parseFloat(cleanCellValue);
                            const filterValue = parseFloat(cleanFilterValue);

                            // Temporary debug for number filtering issue
                            console.log('GTE Number filter:', {
                                original: stringValue,
                                cleaned: cleanCellValue,
                                numValue,
                                filterInput: filter.value,
                                filterCleaned: cleanFilterValue,
                                filterValue,
                                comparison: `${numValue} >= ${filterValue}`,
                                result: numValue >= filterValue
                            });

                            return !isNaN(numValue) && !isNaN(filterValue) && numValue >= filterValue;
                        } else {
                            return stringValue.toLowerCase() >= String(filter.value).toLowerCase();
                        }

                    case 'lte':
                        if (filter.type === 'number') {
                            const cleanCellValue = stringValue.replace(/[,\s₹$€£¥]/g, '');
                            const cleanFilterValue = String(filter.value).replace(/[,\s₹$€£¥]/g, '');
                            const numValue = parseFloat(cleanCellValue);
                            const filterValue = parseFloat(cleanFilterValue);
                            return !isNaN(numValue) && !isNaN(filterValue) && numValue <= filterValue;
                        } else {
                            return stringValue.toLowerCase() <= String(filter.value).toLowerCase();
                        }

                    case 'dateRange':
                        console.log('📅 DATE RANGE FILTER STARTING');
                        const cellDate = moment(stringValue, ['DD-MM-YYYY', 'YYYYMMDD', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'], true);
                        console.log('📅 Cell date parsing:', {
                            stringValue,
                            cellDate: cellDate.isValid() ? cellDate.format('YYYY-MM-DD') : 'Invalid',
                            isValid: cellDate.isValid()
                        });

                        if (!cellDate.isValid()) {
                            console.log('❌ Cell date invalid, filtering out');
                            return false;
                        }

                        const fromDate = filter.fromDate ? moment(filter.fromDate, ['DD-MM-YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'], true) : null;
                        const toDate = filter.toDate ? moment(filter.toDate, ['DD-MM-YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'], true) : null;

                        // Debug logging for date range filtering
                        console.log('📅 Date range filter debug:', {
                            cellValue: stringValue,
                            cellDate: cellDate.isValid() ? cellDate.format('YYYY-MM-DD') : 'Invalid',
                            fromDate: fromDate && fromDate.isValid() ? fromDate.format('YYYY-MM-DD') : 'Invalid/Null',
                            toDate: toDate && toDate.isValid() ? toDate.format('YYYY-MM-DD') : 'Invalid/Null',
                            filterFromDate: filter.fromDate,
                            filterToDate: filter.toDate
                        });

                        let rangeResult = false;
                        if (fromDate && toDate) {
                            rangeResult = cellDate.isBetween(fromDate, toDate, 'day', '[]');
                            console.log('📅 Between check:', rangeResult, `(${cellDate.format('YYYY-MM-DD')} between ${fromDate.format('YYYY-MM-DD')} and ${toDate.format('YYYY-MM-DD')})`);
                        } else if (fromDate) {
                            rangeResult = cellDate.isSameOrAfter(fromDate, 'day');
                            console.log('📅 Same or after check:', rangeResult, `(${cellDate.format('YYYY-MM-DD')} >= ${fromDate.format('YYYY-MM-DD')})`);
                        } else if (toDate) {
                            rangeResult = cellDate.isSameOrBefore(toDate, 'day');
                            console.log('📅 Same or before check:', rangeResult, `(${cellDate.format('YYYY-MM-DD')} <= ${toDate.format('YYYY-MM-DD')})`);
                        } else {
                            rangeResult = true;
                            console.log('📅 No date range specified, returning true');
                        }

                        console.log('📅 Date range final result:', rangeResult);
                        return rangeResult;

                    case 'contains':
                        // Text "like" filter - case insensitive contains search
                        return stringValue.toLowerCase().includes(String(filter.value).toLowerCase());

                    default:
                        return true;
                }
            });
        });
    }, [filters]);

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

    const decimalColumnMap = useMemo(() => {
        const map: Record<string, number> = {};
        if (settings?.decimalColumns && Array.isArray(settings.decimalColumns)) {
            settings.decimalColumns.forEach((decimalSetting: DecimalColumn) => {
                if (!decimalSetting.key) return;
                const columns = decimalSetting.key.split(',').map((key) => key.trim());
                columns.forEach((column) => {
                    if (column) {
                        map[column] = decimalSetting.decimalPlaces;
                    }
                });
            });
        }
        return map;
    }, [settings?.decimalColumns]);

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
            // Determine unique row ID
            let rowId = row.id || index;
            if (settings?.primaryKey && newRow[settings.primaryKey]) {
                rowId = newRow[settings.primaryKey];
            } else if (!row.id) {
                 rowId = index;
            }

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
                            // const color = getValueBasedColor(newRow[column], colorRule);
                            // if (color) {
                            //     newRow[column] = <div style={{ color }}>{newRow[column]}</div>;
                            // }
                            const rawColor = getValueBasedColor(newRow[column], colorRule);
                             if (rawColor) {
                             const accessibleColor = ensureContrastColor(rawColor, "#e3f0ff");
                            newRow[column] = (
                                <div style={{ color: accessibleColor }}>
                                    {newRow[column]}
                                </div>
                            );
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
    }, [data, settings?.dateFormat, settings?.decimalColumns, settings?.valueBasedTextColor, expandedRows, selectedRows, settings?.primaryKey]);

    // Apply filters to the formatted data
    const filteredData = useMemo(() => {
        return applyFilters(formattedData);
    }, [formattedData, filters]);

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

        //this function is used for multiCheckBoxColumn in income report and Selectable_Buttons
        const showMultiCheckBox = settings?.multiCheckBox || settings?.Selectable_Buttons?.isCheckbox;
        const multiCheckBoxColumn = showMultiCheckBox
            ? [{
                key: "_multiSelect",
                name: "",
                width: 35,
                renderHeaderCell: () => {
                    const allIds = rows.map(r => r._id);
                    const allSelected = allIds.length > 0 && allIds.every(id => selectedRows.some(r => r._id === id));

                    return (
                        <input
                            type="checkbox"
                            checked={allSelected}
                            aria-label="Select all rows"
                            onChange={(e) => {
                                const newSelection = e.target.checked ? [...rows] : [];
                                setSelectedRows(newSelection);
                                onRowSelect?.(newSelection);
                            }}
                        />
                    );
                },
                renderCell: ({ row }: any) => (
                    <input
                        type="checkbox"
                        checked={selectedRows.some(r => r._id === row._id)}
                        aria-label={`Select row with ID ${row._id}`}
                        onChange={(e) => toggleRowSelection(row, e.target.checked)}
                    />
                )
            }]
            : [];


        console.log(selectedRows, 'selectedRows');



        const baseColumns: any = [
            ...multiCheckBoxColumn,
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
                        if (showViewDocument || (fundLogic && userType === 'branch')) {
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
                                    aria-label="Select row"
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
                            type={(fundLogic && userType === 'branch') ?  "radio" : showViewDocument ? "radio" : "checkbox"}
                            name={(fundLogic && userType === 'branch') ?  "singleSelection" :showViewDocument ? "singleSelection" : undefined}
                            checked={selectedRows.some(r => r._id === row._id)}
                            onChange={(e) => {
                                if (showViewDocument || fundLogic) {
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
                                                         // Ensure WCAG contrast against background
                                                const contrastTextColor = ensureContrastColor(textColor, '#e3f0ff'); 

                                                    formattedValue = <div style={{ color: contrastTextColor }}>{formattedNumber}</div>;
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

                // Enhanced numeric column detection
                const isNumericColumn = !isLeftAligned && (() => {
                    // Sample first 10 rows to determine if column is numeric
                    const sampleSize = Math.min(10, formattedData.length);
                    const sample = formattedData.slice(0, sampleSize);

                    let numericCount = 0;
                    let validValuesCount = 0;

                    for (const row of sample) {
                        const value = row[key];
                        const rawValue = React.isValidElement(value) ? (value as StyledValue).props.children : value;

                        if (rawValue === null || rawValue === undefined || rawValue === '') {
                            continue;
                        }

                        validValuesCount++;
                        const strValue = String(rawValue).trim();

                        // Check if it's numeric (including decimals, formatted numbers, currency)
                        const cleanValue = strValue.replace(/[,\s₹$€£¥]/g, ''); // Remove commas, spaces, and currency symbols
                        const numValue = parseFloat(cleanValue);

                        // More comprehensive numeric pattern that handles currency and formatting
                        const numericPattern = /^[₹$€£¥]?-?[\d,]+\.?\d*[₹$€£¥]?$/;

                        if (!isNaN(numValue) && isFinite(numValue) && numericPattern.test(strValue.replace(/\s/g, ''))) {
                            numericCount++;
                        }
                    }

                    // If 70% or more values are numeric, treat as numeric column
                    return validValuesCount > 0 && (numericCount / validValuesCount) >= 0.7;
                })();

                const shouldShowTotal = summary?.columnsToShowTotal?.some(
                    (col: any) => col.key === key
                );

                // Check if this column is a detail column (clickable)
                const isDetailColumn = detailColumns?.some(
                    (col: any) => col.wKey === key && col.DetailAPI
                );

                // Get custom width for this column if specified
                const customWidth = columnWidthMap[key];
                const columnConfig: any = {
                    key,
                    name: key,
         
                    sortable: true,
                    resizable: true,
                    frozen: frozenColumns.includes(key) || (settings?.frozenColumns && settings.frozenColumns.includes(key)),
                };

                // Apply custom width or use default min/max width
                if (customWidth) {
                    columnConfig.width = customWidth;
                    columnConfig.minWidth = Math.min(50, Math.floor(customWidth * 0.5)); // Allow resizing down to 50% of custom width or minimum 50px
                    columnConfig.maxWidth = Math.max(600, Math.floor(customWidth * 2)); // Allow resizing up to 200% of custom width or minimum 600px
                } else if (settings?.isAutoWidth ?? columnsToShow.length > 7) {
                    // Auto-fit logic using text measurement
                    // 1. Measure Header
                    const font = "600 14px 'Inter', sans-serif"; // Slightly larger to be safe
                    const headerWidth = getTextWidthSize(key, font) + 70; // +70 for sorting icon, filter icon & padding

                    // 2. Measure Content (Sample first 200 rows for performance)
                    let maxContentWidth = 0;
                    const sampleRows = formattedData.slice(0, 200); 
                    
                    for (const row of sampleRows) {
                        const value = row[key];
                        let text = '';
                        
                        if (React.isValidElement(value)) {
                            // Try to extract text from React element if simple
                            if ((value as any).props?.children) {
                                text = String((value as any).props.children);
                            }
                        } else if (value !== null && value !== undefined) {
                            text = String(value);
                        }

                        if (text) {
                            const width = getTextWidthSize(text, "14px 'Inter', sans-serif"); // Match header font size
                            if (width > maxContentWidth) maxContentWidth = width;
                        }
                    }

                    // 3. Set Width (Header vs Content, with limits)
                    const optimalWidth = Math.max(headerWidth, maxContentWidth + 36); // Increased padding for safety
                    columnConfig.minWidth = Math.min(Math.max(optimalWidth, 80), 800); // Min 80px, Max 800px cap
                    columnConfig.width = columnConfig.minWidth; // Set width explicitly
                } else {
                    columnConfig.minWidth = 80;
                    columnConfig.maxWidth = 400;
                }

                return {
                    ...columnConfig,
                    headerCellClass: isNumericColumn ? 'numeric-column-header' : '',
                    cellClass: `${isNumericColumn ? 'numeric-column-cell' : ''} ${isDetailColumn ? 'detail-column-cell' : ''}`.trim(),
                    renderHeaderCell: () => {
                        return (
                            <div className="flex items-center justify-between w-full">
                                <span className={`truncate flex-1 ${isDetailColumn ? 'detail-column-header' : ''}`} title={key}>
                                    {key}
                                    {isDetailColumn && <span className="ml-1 text-xs opacity-70">🔗</span>}
                                </span>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <ColumnFilterDropdown
                                        column={key}
                                        filter={filters[key] || null}
                                        onFilterChange={handleFilterChange}
                                        data={formattedData}
                                    />
                                </div>
                            </div>
                        );
                    },
                    renderSummaryCell: (props: any) => {
                        if (key === 'totalCount' || shouldShowTotal) {
                            return <div className={isNumericColumn ? "numeric-value font-bold" : "font-bold"} style={{ color: colors.text }}>{props.row[key]}</div>;
                        }
                        return <div></div>;
                    },
                    // Use renderCell for detail columns to make them clickable
                    renderCell: isDetailColumn
                        ? ({ row }: any) => {
                            const value = row[key];
                            let displayValue: React.ReactNode = value;

                            if (React.isValidElement(value)) {
                                displayValue = value;
                            } else {
                                const decimalPlaces = decimalColumnMap[key];
                                if (decimalPlaces !== undefined && !isLeftAligned) {
                                    const rawValue = typeof value === 'string' ? value.replace(/,/g, '') : value;
                                    const numValue = typeof rawValue === 'string' ? parseFloat(rawValue) : rawValue;
                                    if (!isNaN(numValue)) {
                                        displayValue = new Intl.NumberFormat('en-IN', {
                                            minimumFractionDigits: decimalPlaces,
                                            maximumFractionDigits: decimalPlaces
                                        }).format(numValue);
                                    }
                                }
                            }

                            return (
                                <div
                                    className="detail-column-value"
                                    style={{
                                        color: '#2563eb',
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onDetailColumnClick) {
                                            onDetailColumnClick(key, row);
                                        }
                                    }}
                                    role="button"
                                    aria-label={`Click to view ${key} details`}
                                >
                                    {displayValue}
                                </div>
                            );
                        }
                        : undefined,
                    formatter: !isDetailColumn
                        ? (props: any) => {
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
                        : undefined
                };
            }),
        ];
        if (isEntryForm) {
            baseColumns.push(
                {
                    key: "actions",
                    name: "Actions",
                    width: 220,

                    //  REQUIRED for renderEditCell to show buttons when cell is focused
                    editable: true,
                    editorOptions: { editOnClick: true },

                    //  ALWAYS VISIBLE BUTTONS
                    renderCell: ({ row }) => (
                        <div className="flex gap-4"
                            aria-label="The Actions column, press Enter, then Tab to reach the View button. Press Enter to open the popup, and use Tab to move to the Edit and Delete buttons."
                        >
                            <button
                                tabIndex={-1}
                                role="button"
                                aria-label={`View details for ${row.Name || "this record"}`}
                                onClick={() => handleAction("view", row)}
                                onKeyDown={(e) => e.key === "Enter" && handleAction("view", row)}
                                className="view-button"
                            >
                                View
                            </button>

                            <button
                                tabIndex={-1}
                                role="button"
                                aria-label={`Edit details for ${row.Name || "this record"}`}
                                disabled={row?.isUpdated === "true"}
                                onClick={() => handleAction("edit", row)}
                                onKeyDown={(e) => e.key === "Enter" && handleAction("edit", row)}
                                className="edit-button"
                            >
                                Edit
                            </button>

                            <button
                                tabIndex={-1}
                                role="button"
                                aria-label={`Delete ${row.Name || "this record"}`}
                                disabled={row?.isDeleted === "true"}
                                onClick={() => handleAction("delete", row)}
                                onKeyDown={(e) => e.key === "Enter" && handleAction("delete", row)}
                                className="delete-button"
                            >
                                Delete
                            </button>
                        </div>
                    ),

                    //  FOCUSABLE BUTTONS FOR NVDA + KEYBOARD
                    renderEditCell: ({ row }) => (
                        <div className="flex gap-4">

                            {/* VIEW */}
                            <button
                                tabIndex={0}
                                role="button"
                                aria-label={`View details for ${row.Name || "this record"}`}
                                onClick={() => handleAction("view", row)}
                                onKeyDown={(e) => e.key === "Enter" && handleAction("view", row)}
                                className="view-button"
                            >
                                View
                            </button>

                            {/* EDIT */}
                            <button
                                tabIndex={0}
                                role="button"
                                aria-label={`Edit details for ${row.Name || "this record"}`}
                                disabled={row?.isUpdated === "true"}
                                onClick={() => handleAction("edit", row)}
                                onKeyDown={(e) => e.key === "Enter" && handleAction("edit", row)}
                                className="edit-button"
                            >
                                Edit
                            </button>

                            {/* DELETE */}
                            <button
                                tabIndex={0}
                                role="button"
                                aria-label={`Delete ${row.Name || "this record"}`}
                                disabled={row?.isDeleted === "true"}
                                onClick={() => handleAction("delete", row)}
                                onKeyDown={(e) => e.key === "Enter" && handleAction("delete", row)}
                                className="delete-button"
                            >
                                Delete
                            </button>

                        </div>
                    )
                }
            )
        }
        return baseColumns;

    }, [formattedData, colors.text, settings?.hideEntireColumn, settings?.leftAlignedColumns, settings?.leftAlignedColums, summary?.columnsToShowTotal, screenSize, settings?.mobileColumns, settings?.tabletColumns, settings?.webColumns, settings?.columnWidth, decimalColumnMap, expandedRows, selectedRows, filters, detailColumns, onDetailColumnClick]);

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
        return sortRows(filteredData, sortColumns);
    }, [filteredData, sortColumns]);

    // ✅ Add this near your top-level state
    const [failedRowIds, setFailedRowIds] = useState<number[]>([]);




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
                            // const color = getValueBasedColor(formattedSum, colorRule);
                            let color = getValueBasedColor(formattedSum, colorRule);
                            if (color) {
                                color = ensureContrastColor(color, "#e3f0ff");
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

    function announce(message: string) {
        const old = document.getElementById("nvdaLiveRegion");
        if (old) old.remove();

        const region = document.createElement("div");
        region.id = "nvdaLiveRegion";
        region.setAttribute("role", "status");
        region.setAttribute("aria-live", "assertive");
        region.setAttribute("aria-atomic", "true");
        region.style.position = "absolute";
        region.style.left = "-9999px";
        region.style.height = "1px";
        region.style.overflow = "hidden";

        document.body.appendChild(region);

        setTimeout(() => {
            region.textContent = message;
        }, 20);
    }

    const [formatType, setFormatType] = useState('Pdf'); // 'Pdf' or 'Excel'
    
    return (
        <div
            ref={tableRef}
            style={{ height: fullHeight ? 'calc(100vh - 170px)' : 'auto', width: '100%' }}
        >
            {isLoading && (
                <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
                    <Loader />
                </div>
            )}
            
            {/* Show Selected Count */}
            {selectedRows.length > 0 && (
                <div className="px-4 py-2 font-medium text-blue-700 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                    <span>
                        <span className="font-bold">{selectedRows.length}</span> record{selectedRows.length !== 1 ? 's' : ''} selected
                    </span>
                    {/* Optional: Clear selection button could go here */}
                     <button
                        onClick={() => {
                            setSelectedRows([]);
                            onRowSelect?.([]);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                        Clear Selection
                    </button>
                </div>
            )}

            {settings.multiCheckBox &&
                <>
                    {/* <div className='flex'>
                        <button
                            style={{
                                background: colors.buttonBackground,
                                color: getReadableTextColor(bgColor),  // If background is light → black text, else white text
                            }}
                            onClick={() => handleLoopThroughMultiSelectKeyHandler2(setIsLoading, filtersCheck, userId, pageData, selectedRows, userType, sendEmailMultiCheckbox, setSelectedRows)}
                            className="bg-[#00732F] text-white py-2 px-8 rounded-md shadow-lg transform transition-transform duration-200 ease-in-out active:scale-95 w-auto font-medium flex items-center m-4 mr-2"
                        >
                            Send PDF/XLS Mail
                        </button>

                        {/* <button
                            style={{
                                background: colors.buttonBackground,
                                color: getReadableTextColor(buttonBgColor),
                              }}
                            onClick={() => handleLoopThroughMultiSelectKeyHandlerExcel(setIsLoading, filtersCheck, userId, pageData, selectedRows, userType, sendEmailMultiCheckbox, setSelectedRows)}
                            className="bg-[#00732F] text-white py-2 px-8 rounded-md shadow-lg transform transition-transform duration-200 ease-in-out active:scale-95 w-auto font-medium flex items-center m-4 mr-2"
                        >
                            Send Excel Mail
                        </button> */}

                        {/* <button
                            style={{
                                background: colors.buttonBackground,
                                color: getReadableTextColor(bgColor),  // If background is light → black text, else white text
                            }}
                            onClick={() => handleLoopThroughMultiSelectKeyHandlerDownloadZip2(selectedRows, setIsLoading, filtersCheck, userId, userType, setSelectedRows)}
                            className="bg-[#00732F] text-white py-2 px-8 rounded-md shadow-lg transform transition-transform duration-200 ease-in-out active:scale-95 w-auto font-medium flex items-center m-4 mr-2"
                        >
                            Download PDF/XLS Zip
                        </button> */}
                        {/* handleLoopThroughMultiSelectKeyHandlerDownloadExcel */}
                        {/* <button
                            style={{
                                background: colors?.color3 || "#f0f0f0",
                                color: getReadableTextColor(bgColor),  // If background is light → black text, else white text
                            }}
                            onClick={() => handleLoopThroughMultiSelectKeyHandlerDownloadZipExcel(selectedRows, setIsLoading, filtersCheck, userId, userType, setSelectedRows)}
                            className="bg-[#00732F] text-white py-2 px-8 rounded-md shadow-lg transform transition-transform duration-200 ease-in-out active:scale-95 w-auto font-medium flex items-center m-4 mr-2"
                        >
                            Download Excel Zip
                        </button> */}
                    {/* </div> */} 

                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border rounded-xl">
                      {/* ComboBox: PDF or Excel */}
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Format:</label>
                        <select
                          value={formatType}
                          onChange={(e) => setFormatType(e.target.value)}
                          className="w-full h-[40px] pl-4 pr-10 py-1.5 text-sm font-medium rounded border border-gray-400 bg-white text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#3EB489]"
                          style={{
                            backgroundColor: colors?.textInputBackground || 'white',
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.05)',
                            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                          }}
                        >
                          <option value="Pdf">📄 PDF</option>
                          <option value="Excel">📊 Excel</option>
                        </select>
                      </div>
                      
                      {/* 2 Buttons */}
                      <div className="flex gap-2">
                        {/* Button 1: Send Email (based on ComboBox selection) */}
                        <button
                          style={{
                            background: colors.buttonBackground,
                            color: getReadableTextColor(bgColor),  // If background is light → black text, else white text
                        }}
                          onClick={() => handleSendEmailByFormat(setIsLoading, filtersCheck, userId, pageData, selectedRows, userType, sendEmailMultiCheckbox, setSelectedRows, formatType)}
                          disabled={selectedRows.length === 0}
                          className={`px-6 py-2 rounded-md shadow-lg transform transition-all duration-200 ease-in-out active:scale-95 font-medium flex items-center gap-2 text-sm ${
                            selectedRows.length === 0
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          📧 Send Email ({formatType})
                        </button>
                      
                        {/* Button 2: Download Zip (based on ComboBox selection) */}
                        <button
                            style={{
                                background: colors.buttonBackground,
                                color: getReadableTextColor(bgColor),  // If background is light → black text, else white text
                            }}
                          onClick={() => handleDownloadZipByFormat(selectedRows, setIsLoading, filtersCheck, userId, userType, setSelectedRows, formatType)}
                          disabled={selectedRows.length === 0}
                          className={`px-6 py-2 rounded-md shadow-lg transform transition-all duration-200 ease-in-out active:scale-95 font-medium flex items-center gap-2 text-sm ${
                            selectedRows.length === 0
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          💾 Download Zip ({formatType})
                        </button>
                      </div>
                    </div>
                </>}

            {/* Selectable_Buttons: Render dynamic buttons when isCheckbox is true */}
            {settings?.Selectable_Buttons?.isCheckbox && settings?.Selectable_Buttons?.buttons?.length > 0 && (
                <div className='flex flex-wrap gap-2 p-4'>
                    {settings.Selectable_Buttons.buttons.map((button, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                if (selectedRows.length === 0) {
                                    toast.warning("Please select at least one row");
                                    return;
                                }
                                if (button.type === 'download' && selectedRows.length > 1) {
                                    toast.warning("Please select only one entry for download");
                                    return;
                                }
                                onSelectableButtonClick?.(button, selectedRows);
                            }}
                            disabled={selectedRows.length === 0}
                            className={`py-2 px-6 rounded-md text-sm font-medium transition-all duration-200 ease-in-out ${
                                selectedRows.length === 0
                                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                            }`}
                        >
                            {button.name}
                        </button>
                    ))}
                </div>
            )}

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
                    // Skip row click for detail columns (they have their own click handler)
                    const isDetailColumnClicked = detailColumns?.some(
                        (col: any) => col.wKey === props.column.key && col.DetailAPI
                    );

                    if (onRowClick && !props.column.key.startsWith('_') && !isEntryForm && !isDetailColumnClicked) {
                        const { _id, _expanded, ...rowData } = rows[props.rowIdx];
                        onRowClick(rowData);
                    }
                }}

                /** NVDA + KEYBOARD USERS */
                onCellKeyDown={(props: any, event: any) => {
                    // Skip row click for detail columns
                    const isDetailColumnClicked = detailColumns?.some(
                        (col: any) => col.wKey === props.column.key && col.DetailAPI
                    );

                    if (
                        (event.key === "Enter" || event.key === " ") &&
                        onRowClick &&
                        !props.column.key.startsWith("_") &&
                        !isEntryForm &&
                        !isDetailColumnClicked
                    ) {
                        event.preventDefault();

                        const { _id, _expanded, ...rowData } = rows[props.rowIdx];

                        //  ONLY trigger row click. NO ANNOUNCE here.
                        onRowClick(rowData);

                        //  Announce only a simple action, not row count
                        announce("Details opening...");
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
    appMetadata: any,
    textColumns: string[] = []
) => {
    if (!apiData || apiData.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    const levelData = pageData[0]?.levels[0] || {};
    const settings = levelData.settings || {};
    const columnsToShowTotal = levelData.summary?.columnsToShowTotal || [];
    const dateFormatMap: Record<string, string> = {};

    // Date format mapping
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

    const companyName = headerData?.CompanyName?.[0] || "Company Name";
    const reportHeader = headerData?.ReportHeader?.[0] || "Report Header";
    const rightList: string[] = headerData?.RightList?.[0] || [];
    const normalizedRightList = rightList.map(k => k.replace(/\s+/g, ''));
    const normalizedTextColumns = textColumns.map(col =>
    col.replace(/\s+/g, ''));

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

    // ===== HEADER ROW =====
    const headerRow = worksheet.getRow(rowCursor);
    headerRow.height = 25; // Increased height
    filteredHeaders.forEach((header, colIdx) => {
        const normKey = header.replace(/\s+/g, '');
        const cell = headerRow.getCell(colIdx + 1);
        cell.value = header;
        cell.alignment = { horizontal: normalizedRightList.includes(normKey) ? 'right' : 'left' };
    });
    headerRow.commit();
    rowCursor++;

    // ===== DATA ROWS =====
    apiData.forEach(row => {
        const currentRow = worksheet.getRow(rowCursor);

        filteredHeaders.forEach((header, colIdx) => {
            const normKey = header.replace(/\s+/g, '');
            const originalKey = Object.keys(row).find(k => k.replace(/\s+/g, '') === normKey);
            let value = originalKey ? row[originalKey] : "";

            const cell = currentRow.getCell(colIdx + 1);

            // Decimal handling (keep number, apply numFmt)
            if (decimalColumnsMap[normKey] !== undefined && !isNaN(parseFloat(value))) {
                const decimalPlaces = decimalColumnsMap[normKey];
                const fixedNum = Number(parseFloat(value).toFixed(decimalPlaces));
                if (totals.hasOwnProperty(normKey)) {
                    totals[normKey] += fixedNum;
                }
                value = fixedNum;
                cell.numFmt = `0.${'0'.repeat(decimalPlaces)}`;
            }

            // Date handling (store as Date)
            if (dateFormatMap[normKey] && value) {
                const parsedDate = dayjs(value);
                if (parsedDate.isValid()) {
                    value = parsedDate.toDate();
                    cell.numFmt = dateFormatMap[normKey]
                        .replace(/d/g, 'dd')
                        .replace(/y/g, 'yyyy');
                }
            }

            // Assign value & alignment
           // ===== TEXT COLUMN HANDLING (DYNAMIC) =====
            if (normalizedTextColumns.includes(normKey) && value !== null && value !== undefined) {
                cell.value = String(value); // always store as string
                cell.numFmt = '@';           // Number should behaves as text
            } else if (!isNaN(value) && value !== '' && typeof value !== 'object') {
                cell.value = Number(value);
                cell.alignment = { horizontal: 'right' }; // default numeric right align
            } else {
                cell.value = value;
                cell.alignment = {
                    horizontal: normalizedRightList.includes(normKey) ? 'right' : 'left'
                };
            }
        });

        currentRow.commit();
        rowCursor++;
    });

    // ===== TOTAL ROW =====
    const totalRow = worksheet.getRow(rowCursor);
    totalRow.height = 20; // Slightly taller for emphasis
    filteredHeaders.forEach((header, colIdx) => {
        const normKey = header.replace(/\s+/g, '');
        const cell = totalRow.getCell(colIdx + 1);

        if (colIdx === 0) {
            cell.value = 'Total';
            cell.alignment = { horizontal: 'left' };
        } else if (totals.hasOwnProperty(normKey)) {
            const decimalPlaces = decimalColumnsMap[normKey] ?? 0;
            const totalValue = Number(totals[normKey].toFixed(decimalPlaces));
            cell.value = totalValue;
            cell.numFmt = `0.${'0'.repeat(decimalPlaces)}`;
            cell.alignment = { horizontal: 'right' };
        } else {
            cell.value = '';
            cell.alignment = {
                horizontal: normalizedRightList.includes(normKey) ? 'right' : 'left'
            };
        }

        cell.font = { bold: true };
        cell.fill = { // Light green background
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9D9D9' }
        };
    });
    totalRow.commit();

    // ===== EXPORT FILE =====
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
    const companyName = headerData?.CompanyName?.[0] || "Company Name";
    const reportHeader = headerData?.ReportHeader?.[0] || "Report Header";

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
pdfMake.vfs = (pdfFonts as any).vfs;

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
    console.log(reportHeader, 'reportHeaderreportHeader');

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
        const userId = getLocalStorage('userId') || '';
        const userType = getLocalStorage('userType') || '';

        const filterXml = buildFilterXml(filters, userId);
        console.log(filterXml, 'filterXml email');


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
            console.log(filterXml, 'filterXml typst');

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
    const userId = getLocalStorage('userId') || '';

    const filterXml = buildFilterXml(filters, userId);
    console.log(filterXml, 'filterXml');

    const xmlData1 = ` 
    <dsXml>
    <J_Ui>${JSON.stringify(pageData[0].levels[currentLevel].J_Ui).slice(1, -1)},"ReportDisplay":"D"</J_Ui>
    <Sql></Sql>
    <X_Filter>
    ${filterXml}
    </X_Filter>
        <J_Api>"UserId":"${userId}","UserType":"${getLocalStorage('userType')}","AccYear":24,"MyDbPrefix":"SVVS","MemberCode":"undefined","SecretKey":"undefined"</J_Api>
    </dsXml>`;

    try {
        const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData1);

        // Safely check response structure first [web:7][cite:1]
        const data = response.data?.data || response.data;
        if (!data) {
            toast.error('Invalid response structure');
            return;
        }

        const rs0 = data.rs0;
        
        // Check for error flag BEFORE processing data [web:9]
        if (Array.isArray(rs0) && rs0.length > 0 && rs0[0].ErrorFlag === 'E') {
            toast.error(rs0[0].ErrorMessage || 'Report generation failed');
            return;  // Exit early on business error
        }

        // Now process success case
        if (Array.isArray(rs0) && rs0.length > 0) {
            const { PDFName, Base64PDF } = rs0[0];
            if (PDFName && Base64PDF) {
                downloadPdf(PDFName, Base64PDF);
            } else {
                toast.error('PDF data missing in response');
            }
        } else {
            toast.error('No report data returned');
        }
    } catch (err) {
        console.error('Download error:', err);
        toast.error('Download not available');  // Fixed typo: "Donwload" → "Download"
    }
};


export default DataTable;
