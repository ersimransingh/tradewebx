"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { selectAllMenuItems } from '@/redux/features/menuSlice';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import moment from 'moment';
import FilterModal from './FilterModal';
import { FaSync, FaFilter, FaDownload, FaFileCsv, FaFilePdf, FaPlus, FaEdit, FaFileExcel, FaEnvelope, FaSearch, FaTimes } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import DataTable, { exportTableToCsv, exportTableToPdf, exportTableToExcel, downloadOption } from './DataTable';
import { store } from "@/redux/store";
import { APP_METADATA_KEY } from "@/utils/constants";
import { useSearchParams } from 'next/navigation';
import EntryFormModal from './EntryFormModal';
import ConfirmationModal from './Modals/ConfirmationModal';
import { parseStringPromise } from 'xml2js';
import CaseConfirmationModal from './Modals/CaseConfirmationModal';
import EditTableRowModal from './EditTableRowModal';
import FormCreator from './FormCreator';
import Loader from './Loader';

// const { companyLogo, companyName } = useAppSelector((state) => state.common);

interface DynamicReportComponentProps {
    componentName: string;
    componentType: string;
}

// Add validation interfaces and functions
interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}

interface PageDataValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

// Utility function to safely access pageData properties
const safePageDataAccess = (pageData: any, validationResult: PageDataValidationResult | null) => {
    if (!validationResult?.isValid || !pageData?.[0]) {
        return {
            config: null,
            isValid: false,
            getCurrentLevel: () => null,
            hasFilters: () => false,
            getLevels: () => [],
            getSetting: () => null
        };
    }

    const config = pageData[0];

    return {
        config,
        isValid: true,
        getCurrentLevel: (currentLevel: number) => {
            if (!config.levels || !Array.isArray(config.levels) || currentLevel >= config.levels.length) {
                return null;
            }
            return config.levels[currentLevel];
        },
        hasFilters: () => {
            return config.filters && Array.isArray(config.filters) && config.filters.length > 0;
        },
        getLevels: () => {
            return config.levels && Array.isArray(config.levels) ? config.levels : [];
        },
        getSetting: (path: string) => {
            try {
                return path.split('.').reduce((obj, key) => obj?.[key], config);
            } catch {
                return null;
            }
        }
    };
};

// Page data validator function
const validatePageData = (pageData: any): PageDataValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
        // Check if pageData exists and is an array
        if (!pageData) {
            errors.push({
                field: 'pageData',
                message: 'Page data is not available. Please check your menu configuration.',
                severity: 'error'
            });
            return { isValid: false, errors, warnings };
        }

        if (!Array.isArray(pageData)) {
            errors.push({
                field: 'pageData',
                message: 'Page data should be an array structure.',
                severity: 'error'
            });
            return { isValid: false, errors, warnings };
        }

        if (pageData.length === 0) {
            errors.push({
                field: 'pageData',
                message: 'Page data array is empty. No configuration found.',
                severity: 'error'
            });
            return { isValid: false, errors, warnings };
        }

        const pageConfig = pageData[0];

        // Validate main page configuration
        if (!pageConfig || typeof pageConfig !== 'object') {
            errors.push({
                field: 'pageData[0]',
                message: 'Invalid page configuration structure.',
                severity: 'error'
            });
            return { isValid: false, errors, warnings };
        }

        // Validate levels array
        if (!pageConfig.levels) {
            errors.push({
                field: 'levels',
                message: 'Page levels configuration is missing.',
                severity: 'error'
            });
        } else if (!Array.isArray(pageConfig.levels)) {
            errors.push({
                field: 'levels',
                message: 'Page levels should be an array.',
                severity: 'error'
            });
        } else if (pageConfig.levels.length === 0) {
            errors.push({
                field: 'levels',
                message: 'At least one level configuration is required.',
                severity: 'error'
            });
        } else {
            // Validate each level
            pageConfig.levels.forEach((level: any, index: number) => {
                if (!level || typeof level !== 'object') {
                    errors.push({
                        field: `levels[${index}]`,
                        message: `Level ${index} configuration is invalid.`,
                        severity: 'error'
                    });
                } else {
                    // Validate J_Ui in each level
                    if (!level.J_Ui) {
                        warnings.push({
                            field: `levels[${index}].J_Ui`,
                            message: `Level ${index} is missing J_Ui configuration.`,
                            severity: 'warning'
                        });
                    }
                }
            });
        }

        // Validate filters if they exist
        if (pageConfig.filters !== undefined) {
            if (!Array.isArray(pageConfig.filters)) {
                errors.push({
                    field: 'filters',
                    message: 'Filters configuration should be an array.',
                    severity: 'error'
                });
            } else {
                // Validate nested filter structure
                pageConfig.filters.forEach((filterGroup: any, groupIndex: number) => {
                    if (!Array.isArray(filterGroup)) {
                        errors.push({
                            field: `filters[${groupIndex}]`,
                            message: `Filter group ${groupIndex} should be an array.`,
                            severity: 'error'
                        });
                    } else {
                        filterGroup.forEach((filter: any, filterIndex: number) => {
                            if (!filter || typeof filter !== 'object') {
                                errors.push({
                                    field: `filters[${groupIndex}][${filterIndex}]`,
                                    message: `Filter at position [${groupIndex}][${filterIndex}] is invalid.`,
                                    severity: 'error'
                                });
                            } else if (!filter.type) {
                                warnings.push({
                                    field: `filters[${groupIndex}][${filterIndex}].type`,
                                    message: `Filter at position [${groupIndex}][${filterIndex}] is missing type.`,
                                    severity: 'warning'
                                });
                            }
                        });
                    }
                });
            }
        }

        // Validate SQL if present
        if (pageConfig.Sql !== undefined && typeof pageConfig.Sql !== 'string') {
            warnings.push({
                field: 'Sql',
                message: 'SQL configuration should be a string.',
                severity: 'warning'
            });
        }

        // Validate other optional fields
        if (pageConfig.autoFetch !== undefined &&
            typeof pageConfig.autoFetch !== 'string' &&
            typeof pageConfig.autoFetch !== 'boolean') {
            warnings.push({
                field: 'autoFetch',
                message: 'autoFetch should be a string or boolean.',
                severity: 'warning'
            });
        }

    } catch (error) {
        errors.push({
            field: 'validation',
            message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error'
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

const DynamicReportComponent: React.FC<DynamicReportComponentProps> = ({ componentName, componentType }) => {
    const menuItems = useAppSelector(selectAllMenuItems);
    const searchParams = useSearchParams();
    const clientCode = searchParams.get('clientCode');
    const [currentLevel, setCurrentLevel] = useState(0);
    const [apiData, setApiData] = useState<any>(null);
    const [additionalTables, setAdditionalTables] = useState<Record<string, any[]>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [primaryKeyFilters, setPrimaryKeyFilters] = useState<Record<string, any>>({});
    const [rs1Settings, setRs1Settings] = useState<any>(null);
    const [jsonData, setJsonData] = useState<any>(null);
    const [jsonDataUpdated, setJsonDataUpdated] = useState<any>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ field: string; direction: string }>({
        field: '',
        direction: 'asc'
    });
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [downloadFilters, setDownloadFilters] = useState<Record<string, any>>({});
    const [levelStack, setLevelStack] = useState<number[]>([0]); // Track navigation stack
    const [areFiltersInitialized, setAreFiltersInitialized] = useState(false);
    const [apiResponseTime, setApiResponseTime] = useState<number | undefined>(undefined);
    const [autoFetch, setAutoFetch] = useState<boolean>(true);
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isEditTableRowModalOpen, setIsEditTableRowModalOpen] = useState<boolean>(false);

    const [entryFormData, setEntryFormData] = useState<any>(null);
    const [entryAction, setEntryAction] = useState<'edit' | 'delete' | 'view' | null>(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pdfParams, setPdfParams] = useState<
        [HTMLDivElement | null, any, any, any[], any, any, any, 'download' | 'email']
    >();
    const [hasFetchAttempted, setHasFetchAttempted] = useState(false);

    // Add validation state
    const [validationResult, setValidationResult] = useState<PageDataValidationResult | null>(null);
    const [showValidationDetails, setShowValidationDetails] = useState(false);

    const tableRef = useRef<HTMLDivElement>(null);
    const { colors, fonts } = useTheme();
    const hasFetchedRef = useRef(false);



    const appMetadata = (() => {
        try {
            return JSON.parse(localStorage.getItem(APP_METADATA_KEY))
        } catch (err) {
            return store.getState().common
        }
    })();

    const findPageData = () => {
        const searchInItems = (items: any[]): any => {
            for (const item of items) {
                if (item.componentName.toLowerCase() === componentName.toLowerCase() && item.pageData) {
                    return item.pageData;
                }

                if (item.subItems && item.subItems.length > 0) {
                    const foundInSubItems = searchInItems(item.subItems);
                    if (foundInSubItems) {
                        return foundInSubItems;
                    }
                }
            }
            return null;
        };

        return searchInItems(menuItems);
    };

    const pageData: any = findPageData();
    console.log(pageData, 'pageData');
    // Validate pageData whenever it changes
    useEffect(() => {
        if (pageData) {
            const validation = validatePageData(pageData);
            setValidationResult(validation);
            console.log('Page Data Validation Result:', validation);
        } else {
            setValidationResult({
                isValid: false,
                errors: [{
                    field: 'pageData',
                    message: 'No page data found for this component. Please check your menu configuration.',
                    severity: 'error'
                }],
                warnings: []
            });
        }
    }, [pageData]);

    // Helper functions for parsing XML settings
    const parseXmlList = (xmlString: string, tag: string): string[] => {
        const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'g');
        const matches = xmlString.match(regex);
        return matches ? matches.map((match: any) => match.replace(new RegExp(`</?${tag}>`, 'g'), '').split(',')) : [];
    };

    const parseXmlValue = (xmlString: string, tag: string): string => {
        const regex = new RegExp(`<${tag}>(.*?)</${tag}>`);
        const match = xmlString.match(regex);
        return match ? match[1] : '';
    };

    const parseHeadings = (xmlString: string): any => {
        // Implement heading parsing logic if needed
        return {};
    };




    function convertXmlToJson(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        const root = xmlDoc.documentElement;
        return xmlToJson(root);
    }

    async function convertXmlToJsonUpdated(rawXml: string): Promise<any> {
        try {
            // Sanitize common unescaped characters (only & in this case)
            const sanitizedXml = rawXml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[a-fA-F0-9]+;)/g, '&amp;');

            const result = await parseStringPromise(sanitizedXml, {
                explicitArray: false,
                trim: true,
                mergeAttrs: true,
            });

            return result;
        } catch (error) {
            console.error('Error parsing XML:', error);
            throw error;
        }
    }


    function xmlToJson(xml) {
        if (xml.nodeType !== 1) return null; // Only process element nodes

        const obj: any = {};

        if (xml.hasChildNodes()) {
            // Collect all child elements and text nodes
            const childElements = Array.from(xml.childNodes).filter((child: any) => child.nodeType === 1);
            const textNodes = Array.from(xml.childNodes).filter((child: any) => child.nodeType === 3);

            if (childElements.length > 0) {
                // Group child elements by name
                const childrenByName = {};
                childElements.forEach((child: any) => {
                    const childName = child.nodeName;
                    const childValue = xmlToJson(child);
                    if (!childrenByName[childName]) {
                        childrenByName[childName] = [];
                    }
                    childrenByName[childName].push(childValue);
                });

                // Assign all children as arrays, even if there's only one
                for (const [name, values] of Object.entries(childrenByName)) {
                    obj[name] = values; // Always keep as array
                }
            } else if (textNodes.length > 0) {
                // Handle pure text content
                const textContent = textNodes.map((node: any) => node.nodeValue.trim()).join('').trim();
                if (textContent) {
                    if (textContent.includes(',')) {
                        return textContent.split(',').map(item => item.trim());
                    }
                    return textContent;
                }
            }
        }

        // Return null for empty elements with no meaningful content
        return Object.keys(obj).length > 0 ? obj : null;
    }

    // Modified filter initialization useEffect with validation
    useEffect(() => {
        // Only proceed if pageData is valid
        if (!validationResult?.isValid) {
            setAreFiltersInitialized(true);
            return;
        }

        try {
            if (pageData?.[0]?.filters && Array.isArray(pageData[0].filters) && pageData[0].filters.length > 0) {
                const defaultFilters: Record<string, any> = {};

                // Handle the nested array structure with safe validation
                pageData[0].filters.forEach((filterGroup, groupIndex) => {
                    if (!Array.isArray(filterGroup)) {
                        console.warn(`Filter group at index ${groupIndex} is not an array, skipping...`);
                        return;
                    }

                    filterGroup.forEach((filter, filterIndex) => {
                        if (!filter || typeof filter !== 'object') {
                            console.warn(`Filter at position [${groupIndex}][${filterIndex}] is invalid, skipping...`);
                            return;
                        }

                        try {
                            if (filter.type === 'WDateRangeBox') {
                                if (!filter.wKey || !Array.isArray(filter.wKey) || filter.wKey.length < 2) {
                                    console.warn(`WDateRangeBox filter at [${groupIndex}][${filterIndex}] has invalid wKey`);
                                    return;
                                }

                                const [fromKey, toKey] = filter.wKey;

                                if (filter.wValue && Array.isArray(filter.wValue) && filter.wValue.length === 2) {
                                    // Use pre-selected values if provided
                                    const fromDate = moment(filter.wValue[0], 'YYYYMMDD');
                                    const toDate = moment(filter.wValue[1], 'YYYYMMDD');

                                    if (fromDate.isValid() && toDate.isValid()) {
                                        defaultFilters[fromKey] = fromDate.toDate();
                                        defaultFilters[toKey] = toDate.toDate();
                                    } else {
                                        console.warn(`Invalid date values in WDateRangeBox filter at [${groupIndex}][${filterIndex}]`);
                                    }
                                } else {
                                    // Fallback to financial year logic
                                    const currentDate = moment();
                                    let financialYearStart;

                                    if (currentDate.month() < 3) {
                                        financialYearStart = moment().subtract(1, 'year').month(3).date(1);
                                    } else {
                                        financialYearStart = moment().month(3).date(1);
                                    }

                                    defaultFilters[fromKey] = financialYearStart.toDate();
                                    defaultFilters[toKey] = moment().toDate();
                                }
                            }
                            // Add other filter type initializations if needed
                        } catch (filterError) {
                            console.error(`Error processing filter at [${groupIndex}][${filterIndex}]:`, filterError);
                        }
                    });
                });

                // Add client code to filters if present in query params
                if (clientCode) {
                    defaultFilters['ClientCode'] = clientCode;
                }

                setFilters(defaultFilters);
                setAreFiltersInitialized(true);
            } else {
                // No filters needed, mark as initialized
                setAreFiltersInitialized(true);
            }
        } catch (error) {
            console.error('Error initializing filters:', error);
            setAreFiltersInitialized(true); // Set to true to prevent blocking
        }
    }, [pageData, clientCode, validationResult]);

    // Set autoFetch based on pageData and clientCode with validation
    useEffect(() => {
        if (!validationResult?.isValid || !pageData?.[0]) {
            return;
        }

        try {
            if (pageData[0].autoFetch !== undefined) {
                const newAutoFetch = pageData[0].autoFetch === "true" || clientCode !== null;
                setAutoFetch(newAutoFetch);

                // If we have a client code, we want to fetch data regardless of autoFetch setting
                if (clientCode) {
                    fetchData();
                } else if (!newAutoFetch) {
                    return;
                }
                if (!hasFetchedRef.current) {
                    fetchData();
                    hasFetchedRef.current = true; // prevent second run
                }
            }
        } catch (error) {
            console.error('Error setting autoFetch:', error);
        }
    }, [pageData, clientCode, validationResult]);

    // Add new useEffect to handle level changes and manual fetching
    useEffect(() => {
        // If we're in a level > 0, we should always fetch data regardless of autoFetch
        if (pageLoaded) {
            if (currentLevel > 0) {
                console.log('Fetching data for level:', currentLevel);
                fetchData();
            }
            // If we're in level 0 and autoFetch is true, fetch data
            else if (autoFetch) {
                console.log('Auto-fetching data for level 0');
                fetchData();
            }
        }
    }, [currentLevel, autoFetch]);

    const fetchData = async (currentFilters = filters) => {
        // Validate pageData before proceeding
        if (!pageData || !validationResult?.isValid) {
            console.error('Cannot fetch data: Invalid page configuration');
            return;
        }

        // Additional safety checks
        if (!pageData[0] || !pageData[0].levels || !Array.isArray(pageData[0].levels) ||
            currentLevel >= pageData[0].levels.length || !pageData[0].levels[currentLevel]) {
            console.error('Cannot fetch data: Invalid level configuration');
            return;
        }

        setIsLoading(true);
        setHasFetchAttempted(true);
        const startTime = performance.now();

        try {
            let filterXml = '';

            // Always include client code in filters if present in URL
            if (clientCode) {
                filterXml += `<ClientCode>${clientCode}</ClientCode>`;
            }

            // Check if page has filters and if filters are initialized
            const hasFilters = pageData[0]?.filters && Array.isArray(pageData[0].filters) && pageData[0].filters.length > 0;

            // Only process filters if the page has filter configuration and filters are initialized
            if (hasFilters && areFiltersInitialized) {
                Object.entries(currentFilters).forEach(([key, value]) => {
                    if (value === undefined || value === null || value === '') {
                        return;
                    }

                    try {
                        if (value instanceof Date || moment.isMoment(value)) {
                            const formattedDate = moment(value).format('YYYYMMDD');
                            filterXml += `<${key}>${formattedDate}</${key}>`;
                        } else {
                            filterXml += `<${key}>${value}</${key}>`;
                        }
                    } catch (error) {
                        console.warn(`Error processing filter ${key}:`, error);
                    }
                });
            }

            // Add primary key filters for levels > 0
            if (currentLevel > 0 && Object.keys(primaryKeyFilters).length > 0) {
                Object.entries(primaryKeyFilters).forEach(([key, value]) => {
                    filterXml += `<${key}>${value}</${key}>`;
                });
            }

            // Safely get J_Ui data
            const currentLevelConfig = pageData[0].levels[currentLevel];
            const jUiData = currentLevelConfig.J_Ui || {};

            const xmlData = `<dsXml>
                <J_Ui>${JSON.stringify(jUiData).slice(1, -1)}</J_Ui>
                <Sql>${pageData[0].Sql || ''}</Sql>
                <X_Filter>${filterXml}</X_Filter>
                <X_GFilter></X_GFilter>
                <J_Api>"UserId":"${localStorage.getItem('userId')}", "UserType":"${localStorage.getItem('userType')}"</J_Api>
            </dsXml>`;

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                },
                timeout: 600000
            });

            const endTime = performance.now();
            setApiResponseTime(Math.round(endTime - startTime));
            const rawData = response.data.data.rs0 || [];
            const dataWithId = rawData.map((row: any, index: number) => ({
                ...row,
                _id: index
            }));
            setApiData(dataWithId);

            // Handle additional tables (rs3, rs4, etc.)
            const additionalTablesData: Record<string, any[]> = {};
            Object.entries(response.data.data).forEach(([key, value]) => {
                if (key !== 'rs0' && key !== 'rs1' && Array.isArray(value)) {
                    additionalTablesData[key] = value;
                }
            });
            setAdditionalTables(additionalTablesData);

            // Parse RS1 Settings if available
            if (response.data.data.rs1?.[0]?.Settings) {
                const xmlString = response.data.data.rs1[0].Settings;
                const settingsJson = {
                    totalList: parseXmlList(xmlString, 'TotalList'),
                    rightList: parseXmlList(xmlString, 'RightList'),
                    hideList: parseXmlList(xmlString, 'HideList'),
                    dateFormat: parseXmlValue(xmlString, 'DateFormat'),
                    dateFormatList: parseXmlList(xmlString, 'DateFormatList'),
                    dec2List: parseXmlList(xmlString, 'Dec2List'),
                    dec4List: parseXmlList(xmlString, 'Dec4List'),
                    drCRColorList: parseXmlList(xmlString, 'DrCRColorList'),
                    pnLColorList: parseXmlList(xmlString, 'PnLColorList'),
                    primaryKey: parseXmlValue(xmlString, 'PrimaryKey'),
                    companyName: parseXmlValue(xmlString, 'CompanyName'),
                    companyAdd1: parseXmlValue(xmlString, 'CompanyAdd1'),
                    companyAdd2: parseXmlValue(xmlString, 'CompanyAdd2'),
                    companyAdd3: parseXmlValue(xmlString, 'CompanyAdd3'),
                    reportHeader: parseXmlValue(xmlString, 'ReportHeader'),
                    pdfWidth: parseXmlValue(xmlString, 'PDFWidth'),
                    pdfHeight: parseXmlValue(xmlString, 'PDFHeight'),
                    mobileColumns: parseXmlList(xmlString, 'MobileColumns'),
                    tabletColumns: parseXmlList(xmlString, 'TabletColumns'),
                    webColumns: parseXmlList(xmlString, 'WebColumns'),
                    headings: parseHeadings(xmlString)
                };

                const json = convertXmlToJson(xmlString);
                const jsonUpdated = await convertXmlToJsonUpdated(xmlString);

                setJsonData(json);
                setJsonDataUpdated(jsonUpdated);
                setRs1Settings(settingsJson);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            if (error.response?.data) {
                console.error('Error response data:', error.response.data);
            }
            setApiResponseTime(undefined);
        } finally {
            setIsLoading(false);
        }
    };



    // Modify handleRecordClick
    const handleRecordClick = (record: any) => {
        if (currentLevel < (pageData?.[0].levels.length || 0) - 1) {
            // Get primary key from the current level's primaryHeaderKey or fallback to rs1Settings
            const primaryKey = pageData[0].levels[currentLevel].primaryHeaderKey ||
                rs1Settings?.primaryKey ||
                'id';

            // Set primary key filters based on the clicked record
            setPrimaryKeyFilters(prev => {
                const newFilters = {
                    ...prev,
                    [primaryKey]: record[primaryKey]
                };
                return newFilters;
            });

            // Update level stack and current level
            const nextLevel = currentLevel + 1;
            setLevelStack([...levelStack, nextLevel]);
            setCurrentLevel(nextLevel);
        }
    };

    const handleRowSelect = (record: any[]) => {
        const cleaned = record.map(({ _id, _select, _expanded, ...rest }) => rest);
        setSelectedRows(cleaned);
    }


    const [pageLoaded, setPageLoaded] = useState(false);
    // Add useEffect to handle data fetching when level changes
    useEffect(() => {
        // If we have page data, fetch for the current level
        if (pageData && pageLoaded) {
            // Add a small delay to ensure state updates are complete
            const timer = setTimeout(() => {
                fetchData();
            }, 0);

            return () => clearTimeout(timer);
        }

        setTimeout(() => {
            setPageLoaded(true);
        }, 1000);
    }, [currentLevel, primaryKeyFilters]);

    // Auto-open filter modal when autoFetch is false and filterType is not "onPage"
    useEffect(() => {
        if (pageData && pageLoaded && areFiltersInitialized && currentLevel === 0) {
            const autoFetchSetting = pageData[0]?.autoFetch;
            const filterType = pageData[0]?.filterType;
            const hasFilters = pageData[0]?.filters?.length > 0;

            // Check if autoFetch is false and filterType is not "onPage" and has filters
            if (autoFetchSetting === "false" && filterType !== "onPage" && hasFilters && !clientCode) {
                // Only auto-open if we haven't manually opened it yet
                if (!isFilterModalOpen) {
                    setIsFilterModalOpen(true);
                }
            }
        }
    }, [pageData, pageLoaded, areFiltersInitialized, currentLevel, clientCode]);


    // Add handleTabClick function
    const handleTabClick = (level: number, index: number) => {
        const newStack = levelStack.slice(0, index + 1);
        setLevelStack(newStack);

        // If going back to first level (index 0), clear primary key filters first
        if (index === 0) {
            setPrimaryKeyFilters({});
        }

        // Set the current level after clearing filters
        setCurrentLevel(level);
    };

    // Modified filter change handler
    const handleFilterChange = (newFilters: Record<string, any>) => {
        setFilters(newFilters);
        if (pageLoaded) {
            fetchData(newFilters); // Call API with new filters
        }
    };

    const handleDownloadFilterChange = (newFilters: Record<string, any>) => {
        if (JSON.stringify(downloadFilters) !== JSON.stringify(newFilters)) {
            setDownloadFilters(newFilters);
        }
    };


    // console.log(pageData[0].levels[currentLevel].settings?.EditableColumn,'editable');



    const deleteMasterRecord = async () => {
        try {

            const entry = pageData[0].Entry;
            const masterEntry = entry.MasterEntry;
            const pageName = pageData[0]?.wPage || "";

            // console.log(masterEntry,'masterEntry')

            const sql = Object.keys(masterEntry?.sql || {}).length ? masterEntry.sql : "";
            let X_Data = "";

            const jUi = Object.entries(masterEntry.J_Ui)
                .map(([key, value]) => {
                    if (key === 'Option') {
                        return `"${key}":"delete"`;
                    }
                    if (key === 'ActionName') {
                        return `"${key}":"${pageName}"`;
                    }
                    return `"${key}":"${value}"`

                })
                .join(',');

            const jApi = Object.entries(masterEntry.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            Object.entries(entryFormData).forEach(([key, value]) => {
                if (
                    value !== undefined &&
                    value !== null &&
                    !key.startsWith('_') // Skip internal fields
                ) {
                    X_Data += `<${key}>${value}</${key}>`;
                }
            });
            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${sql}</Sql>
                <X_Filter></X_Filter>
                <X_Data>${X_Data}</X_Data>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });
            if (response?.data?.success) {
                fetchData();
            }
            console.log("response of delete api", response)

        } catch (error) {
            console.error(`Error fetching options for   `);
        } finally {
            console.log("check delete record");
        }
    }

    // function to handle table actions
    const handleTableAction = (action: string, record: any) => {
        setEntryFormData(record);
        setEntryAction(action as 'edit' | 'delete' | 'view');
        if (action === "edit" || action === "view") {
            setIsEntryModalOpen(true);
        } else {
            setIsConfirmationModalOpen(true);
        }
    }

    const handleConfirmDelete = () => {
        deleteMasterRecord();
        setIsConfirmationModalOpen(false);
    };

    const handleCancelDelete = () => {
        setIsConfirmationModalOpen(false);
    };

    // Add search state variables
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredApiData, setFilteredApiData] = useState<any[]>([]);

    // Add search filtering logic
    useEffect(() => {
        if (!apiData) {
            setFilteredApiData([]);
            return;
        }

        if (!searchTerm.trim()) {
            setFilteredApiData(apiData);
            return;
        }

        const filtered = apiData.filter((row: any) => {
            return Object.values(row).some((value: any) => {
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(searchTerm.toLowerCase());
            });
        });

        setFilteredApiData(filtered);
    }, [apiData, searchTerm]);

    // Add search handlers
    const handleSearchToggle = () => {
        setIsSearchActive(!isSearchActive);
        if (isSearchActive) {
            setSearchTerm('');
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchClear = () => {
        setSearchTerm('');
    };

    // Close search box when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const searchContainer = document.querySelector('.search-container');
            if (isSearchActive && searchContainer && !searchContainer.contains(event.target as Node)) {
                setIsSearchActive(false);
                setSearchTerm('');
            }
        };

        if (isSearchActive) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSearchActive]);

    // Show validation errors if pageData is invalid
    if (validationResult && !validationResult.isValid) {
        return (
            <div className="p-6">
                <div
                    className="border rounded-lg p-4 mb-4"
                    style={{
                        backgroundColor: '#fee2e2',
                        borderColor: '#fca5a5',
                        color: '#991b1b'
                    }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Configuration Error
                        </h3>
                        <button
                            onClick={() => setShowValidationDetails(!showValidationDetails)}
                            className="text-sm underline hover:no-underline"
                        >
                            {showValidationDetails ? 'Hide Details' : 'Show Details'}
                        </button>
                    </div>

                    <p className="mb-3">
                        The page configuration for <strong>{componentName}</strong> contains errors that prevent it from loading properly.
                    </p>

                    {showValidationDetails && (
                        <div className="space-y-3">
                            {/* Errors */}
                            {validationResult.errors.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Errors ({validationResult.errors.length}):</h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        {validationResult.errors.map((error, index) => (
                                            <li key={index}>
                                                <strong>{error.field}:</strong> {error.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Warnings */}
                            {validationResult.warnings.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Warnings ({validationResult.warnings.length}):</h4>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        {validationResult.warnings.map((warning, index) => (
                                            <li key={index}>
                                                <strong>{warning.field}:</strong> {warning.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Debug Information */}
                            <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
                                <h5 className="font-medium mb-2">Debug Information:</h5>
                                <p><strong>Component Name:</strong> {componentName}</p>
                                <p><strong>Component Type:</strong> {componentType}</p>
                                <p><strong>Page Data Available:</strong> {pageData ? 'Yes' : 'No'}</p>
                                {pageData && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer font-medium">Raw Page Data (Click to expand)</summary>
                                        <pre className="mt-2 text-xs overflow-auto max-h-40 bg-white p-2 rounded border">
                                            {JSON.stringify(pageData, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 text-blue-800">
                        <h4 className="font-medium mb-1">What you can do:</h4>
                        <ul className="text-sm list-disc list-inside space-y-1">
                            <li>Contact your system administrator</li>
                            <li>Check the menu configuration for this component</li>
                            <li>Verify that the page data structure matches expected format</li>
                            <li>Try refreshing the page</li>
                        </ul>
                    </div>
                </div>

                {/* Retry Button */}
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded text-white font-medium"
                    style={{
                        backgroundColor: colors.buttonBackground || '#3b82f6'
                    }}
                >
                    Retry / Refresh Page
                </button>
            </div>
        );
    }

    if (!pageData) {
        return <div>Loading report data...</div>;
    }

    // Safe access to pageData properties with validation
    const safePageData = safePageDataAccess(pageData, validationResult);
    const showTypeList = safePageData.getSetting('levels.0.settings.showTypstFlag') || false;
    const showFilterHorizontally = safePageData.getSetting('filterType') === "onPage";

    return (
        <div className=""
            style={{
                fontFamily: `${fonts.content} !important`
            }}
        >
            {/* Tabs - Only show if there are multiple levels */}
            {safePageData.isValid && safePageData.getLevels().length > 1 && (
                <div className="flex  border-b border-gray-200">
                    <div className="flex flex-1 gap-2">
                        {levelStack.map((level, index) => (
                            <button
                                key={index}
                                style={{ backgroundColor: colors.cardBackground }}
                                className={`px-4 py-2 text-sm rounded-t-lg font-bold ${currentLevel === level
                                    ? `bg-${colors.primary} text-${colors.buttonText}`
                                    : `bg-${colors.tabBackground} text-${colors.tabText}`
                                    }`}
                                onClick={() => handleTabClick(level, index)}
                            >
                                {level === 0
                                    ? safePageData.getSetting('level') || 'Main'
                                    : safePageData.getCurrentLevel(level)?.name || `Level ${level}`
                                }
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {selectedRows.length > 0 && safePageData.getCurrentLevel(currentLevel)?.settings?.EditableColumn && (
                            <button
                                className="p-2 rounded"
                                onClick={() => setIsEditTableRowModalOpen(true)}
                                style={{ color: colors.text }}
                            >
                                <FaEdit size={20} />
                            </button>

                        )}
                        {(componentType === 'entry' || componentType === "multientry") && (
                            <button
                                className="p-2 rounded"
                                onClick={() => {
                                    console.log('Plus button clicked, componentType:', componentType);
                                    console.log('pageData available:', !!pageData);
                                    console.log('pageData structure:', pageData);
                                    setIsEntryModalOpen(true);
                                }}
                                style={{ color: colors.text }}
                            >
                                <FaPlus size={20} />
                            </button>
                        )}
                        <button
                            className="p-2 rounded"
                            onClick={() => exportTableToExcel(tableRef.current, jsonData, apiData, pageData, appMetadata)}
                            style={{ color: colors.text }}
                        >
                            <FaFileExcel size={20} />
                        </button>
                        <button
                            className="p-2 rounded"
                            onClick={() => {
                                setPdfParams([tableRef.current, jsonData, appMetadata, apiData, pageData, filters, currentLevel, 'email']);
                                setIsConfirmModalOpen(true);
                            }}
                            style={{ color: colors.text }}
                        >
                            <FaEnvelope size={20} />
                        </button>
                        {showTypeList && (
                            <button
                                className="p-2 rounded"
                                onClick={() => downloadOption(jsonData, appMetadata, apiData, pageData, filters, currentLevel)}
                                style={{ color: colors.text }}
                            >
                                <FaDownload size={20} />
                            </button>
                        )}
                        {Object.keys(additionalTables).length == 0 && (
                            <>
                                <button
                                    className="p-2 rounded"
                                    onClick={() => exportTableToCsv(tableRef.current, jsonData, apiData, pageData)}
                                    style={{ color: colors.text }}
                                >
                                    <FaFileCsv size={20} />
                                </button>

                                <button
                                    className="p-2 rounded"
                                    onClick={() => exportTableToPdf(tableRef.current, jsonData, appMetadata, apiData, pageData, filters, currentLevel, 'download')}
                                    style={{ color: colors.text }}
                                >
                                    <FaFilePdf size={20} />
                                </button>
                            </>
                        )}
                        {apiData && apiData.length > 0 && (
                            <div className="relative search-container">
                                <button
                                    className="p-2 rounded"
                                    onClick={handleSearchToggle}
                                    style={{ color: colors.text }}
                                >
                                    <FaSearch size={20} />
                                </button>

                                {/* Absolute Search Box */}
                                {isSearchActive && (
                                    <div
                                        className="absolute top-full right-0 mt-1 w-80 p-2 rounded border shadow-lg z-50"
                                        style={{
                                            backgroundColor: colors.cardBackground,
                                            borderColor: '#e5e7eb'
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={handleSearchChange}
                                                    placeholder="Search across all columns..."
                                                    className="w-full px-2 py-1.5 text-sm rounded border focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    style={{
                                                        backgroundColor: colors.textInputBackground || '#ffffff',
                                                        borderColor: '#d1d5db',
                                                        color: colors.text
                                                    }}
                                                    autoFocus
                                                />
                                                {searchTerm && (
                                                    <button
                                                        onClick={handleSearchClear}
                                                        className="absolute right-1.5 top-1/2 transform -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded"
                                                        style={{ color: colors.text }}
                                                    >
                                                        <FaTimes size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {searchTerm && (
                                            <div className="text-xs text-gray-500 mt-1 text-right">
                                                {filteredApiData.length} of {apiData?.length || 0} records
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            className="p-2 rounded"
                            onClick={() => fetchData()}
                            style={{ color: colors.text }}
                        >
                            <FaSync size={20} />
                        </button>
                        {!showFilterHorizontally && safePageData.hasFilters() && (
                            <button
                                className="p-2 rounded"
                                onClick={() => setIsFilterModalOpen(true)}
                                style={{ color: colors.text }}
                            >
                                <FaFilter size={20} />
                            </button>
                        )}
                    </div>
                </div>
            )}



            {/* Filter Modals */}
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                title="Filters"
                filters={safePageData.config?.filters || [[]]}
                onFilterChange={handleFilterChange}
                initialValues={filters}
                sortableFields={apiData ? Object.keys(apiData[0] || {}).map(key => ({
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                    value: key
                })) : []}
                currentSort={sortConfig}
                onSortChange={setSortConfig}
                isSortingAllowed={safePageData.getCurrentLevel(currentLevel)?.isShortAble !== "false"}
                onApply={() => { }}
            />
            <ConfirmationModal
                isOpen={isConfirmationModalOpen}
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
            />

            <CaseConfirmationModal
                isOpen={isConfirmModalOpen}
                type="M"
                message="Do you want to send mail?"
                onConfirm={() => {
                    exportTableToPdf(...pdfParams);
                    setIsConfirmModalOpen(false);
                }}
                onCancel={() => setIsConfirmModalOpen(false)}
            />

            {/* Download Modal */}
            <FilterModal
                isOpen={isDownloadModalOpen}
                onClose={() => setIsDownloadModalOpen(false)}
                title="Download Options"
                filters={safePageData.config?.downloadFilters || []}
                onFilterChange={handleDownloadFilterChange}
                initialValues={downloadFilters}
                isDownload={true}
                onApply={() => { }}
            />

            {isEditTableRowModalOpen && <EditTableRowModal
                isOpen={isEditTableRowModalOpen}
                onClose={() => setIsEditTableRowModalOpen(false)}
                title={safePageData.getCurrentLevel(currentLevel)?.name || 'Edit'}
                tableData={selectedRows}
                wPage={safePageData.getSetting('wPage') || ''}
                settings={{
                    ...safePageData.getCurrentLevel(currentLevel)?.settings,
                    hideMultiEditColumn: safePageData.getCurrentLevel(currentLevel)?.settings?.hideMultiEditColumn
                }}
                showViewDocument={safePageData.getCurrentLevel(currentLevel)?.settings?.ShowViewDocument}
            />}

            {/* Loading State */}


            {/* Horizontal Filters */}
            {showFilterHorizontally && safePageData.hasFilters() && (
                <div className="mb-2 px-3 py-1 rounded-lg border" style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: '#e5e7eb'
                }}>
                    <div className="flex items-center justify-between mb-0">
                        <div
                            className="flex flex-wrap gap-4 items-start"
                            style={{
                                background: 'none'
                            }}
                        >
                            <FormCreator
                                formData={safePageData.config?.filters || [[]]}
                                onFilterChange={handleFilterChange}
                                initialValues={filters}
                                isHorizontal={true}
                            />
                        </div>
                        <div className="flex gap-2">

                            <button
                                className="px-3 py-1 text-sm rounded"
                                style={{
                                    backgroundColor: colors.buttonBackground,
                                    color: colors.buttonText
                                }}
                                onClick={() => fetchData(filters)}
                            >
                                Apply
                            </button>
                            <button
                                className="px-3 py-1 text-sm rounded"
                                style={{
                                    backgroundColor: colors.buttonBackground,
                                    color: colors.buttonText
                                }}
                                onClick={() => {
                                    const emptyValues = {};
                                    setFilters(emptyValues);
                                    handleFilterChange(emptyValues);
                                }}
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                </div>
            )}
            {isLoading &&
                <div className="flex inset-0 flex items-center justify-center z-[200] h-[100vh]">
                    <Loader />
                </div>
            }
            {!apiData && !isLoading && hasFetchAttempted && <div>No Data Found</div>}
            {/* Data Display */}

            {!isLoading && apiData && (
                <div className="space-y-0">
                    <div className="text-sm text-gray-500">
                        <div className="flex flex-col sm:flex-row justify-between">
                            <div className="flex flex-col gap-2 my-1">
                                {/* Report Header */}
                                {/* {jsonDataUpdated?.XmlData?.ReportHeader && (
                                    <div className="text-lg font-bold mb-2" style={{ color: colors.text }}>
                                        {jsonDataUpdated.XmlData.ReportHeader}
                                    </div>
                                )} */}

                                {/* Headings */}
                                <div className="flex flex-wrap gap-2">
                                    {jsonDataUpdated?.XmlData?.Headings?.Heading ? (
                                        Array.isArray(jsonDataUpdated.XmlData.Headings.Heading) ? (
                                            jsonDataUpdated.XmlData.Headings.Heading.map((headingText, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                                    style={{
                                                        backgroundColor: colors.cardBackground,
                                                        color: colors.text
                                                    }}
                                                >
                                                    {headingText}
                                                </span>
                                            ))
                                        ) : (
                                            <span
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                                style={{
                                                    backgroundColor: colors.cardBackground,
                                                    color: colors.text
                                                }}
                                            >
                                                {jsonDataUpdated.XmlData.Headings.Heading}
                                            </span>
                                        )
                                    ) : null}
                                </div>
                            </div>
                            <div className="text-xs">
                                {searchTerm ?
                                    `Showing ${filteredApiData.length} of ${apiData.length} records` :
                                    `Total Records: ${apiData.length}`
                                } | Response Time: {(apiResponseTime / 1000).toFixed(2)}s
                            </div>
                        </div>
                    </div>
                    <DataTable
                        data={filteredApiData}
                        settings={{
                            ...safePageData.getCurrentLevel(currentLevel)?.settings,
                            mobileColumns: rs1Settings?.mobileColumns?.[0] || [],
                            tabletColumns: rs1Settings?.tabletColumns?.[0] || [],
                            webColumns: rs1Settings?.webColumns?.[0] || [],
                            // Add level-specific settings
                            ...(currentLevel > 0 ? {
                                // Override responsive columns for second level if needed
                                mobileColumns: rs1Settings?.mobileColumns?.[0] || [],
                                tabletColumns: rs1Settings?.tabletColumns?.[0] || [],
                                webColumns: rs1Settings?.webColumns?.[0] || []
                            } : {})
                        }}
                        summary={safePageData.getCurrentLevel(currentLevel)?.summary}
                        onRowClick={handleRecordClick}
                        onRowSelect={handleRowSelect}
                        tableRef={tableRef}
                        isEntryForm={componentType === "entry" || componentType === "multientry"}
                        handleAction={handleTableAction}
                        fullHeight={Object.keys(additionalTables).length > 0 ? false : true}
                        showViewDocument={safePageData.getCurrentLevel(currentLevel)?.settings?.ShowViewDocument}
                    />
                    {Object.keys(additionalTables).length > 0 && (
                        <div>
                            {Object.entries(additionalTables).map(([tableKey, tableData]) => {
                                // Get the title from jsonData based on the table key
                                const tableTitle = jsonData?.TableHeadings?.[0]?.[tableKey]?.[0] || tableKey.toUpperCase();
                                return (
                                    <div key={tableKey} className="mt-3">
                                        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
                                            {tableTitle}
                                        </h3>
                                        <DataTable
                                            data={tableData}
                                            settings={{
                                                ...safePageData.getCurrentLevel(currentLevel)?.settings,
                                                mobileColumns: rs1Settings?.mobileColumns?.[0] || [],
                                                tabletColumns: rs1Settings?.tabletColumns?.[0] || [],
                                                webColumns: rs1Settings?.webColumns?.[0] || [],
                                                // Add level-specific settings
                                                ...(currentLevel > 0 ? {
                                                    // Override responsive columns for second level if needed
                                                    mobileColumns: rs1Settings?.mobileColumns?.[0] || [],
                                                    tabletColumns: rs1Settings?.tabletColumns?.[0] || [],
                                                    webColumns: rs1Settings?.webColumns?.[0] || []
                                                } : {})
                                            }}
                                            summary={safePageData.getCurrentLevel(currentLevel)?.summary}
                                            tableRef={tableRef}
                                            fullHeight={false}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {(componentType === 'entry' || componentType === "multientry") && safePageData.isValid && (
                <EntryFormModal
                    isOpen={isEntryModalOpen}
                    onClose={() => setIsEntryModalOpen(false)}
                    pageData={pageData}
                    editData={entryFormData}
                    action={entryAction}
                    isTabs={componentType === "multientry" ? true : false}
                    setEntryEditData={setEntryFormData}
                    refreshFunction={() => fetchData()}
                />
            )}
        </div>
    );
};

export default DynamicReportComponent; 