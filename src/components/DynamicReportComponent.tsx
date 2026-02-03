"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { selectAllMenuItems } from '@/redux/features/menuSlice';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import moment from 'moment';
import FilterModal from './FilterModal';
import { FaSync, FaFilter, FaDownload, FaFileCsv, FaFilePdf, FaPlus, FaEdit, FaFileExcel, FaEnvelope, FaSearch, FaTimes, FaEllipsisV, FaRegEnvelope, FaArrowsAltH, FaColumns, FaCalculator, FaSpinner } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import DataTable, { exportTableToCsv, exportTableToPdf, exportTableToExcel, downloadOption } from './DataTable';
import { store } from "@/redux/store";
import { APP_METADATA_KEY } from "@/utils/constants";
import { useSearchParams } from 'next/navigation';
import EntryFormModal from './EntryFormModal';
import CustomizeTableModal from './CustomizeTableModal';
import GroupSumModal from './GroupSumModal';
import ConfirmationModal from './Modals/ConfirmationModal';
import { parseStringPromise } from 'xml2js';
import CaseConfirmationModal from './Modals/CaseConfirmationModal';
import ErrorModal from './Modals/ErrorModal';
import EditTableRowModal from './EditTableRowModal';
import FormCreator from './FormCreator';
import Loader from './Loader';
import apiService from '@/utils/apiService';
import { decryptData, displayAndDownloadFile, getLocalStorage, parseSettingsFromXml } from '@/utils/helper';
import { toast } from "react-toastify";
import MultiEntryDataTables from './MultiEntryDataTables';
import { recursiveSearch, generatePdf, generateExcel, generateCsv } from '@/utils/multiEntryUtils';
import MultiFileUploadQueue from './upload/MultiFileUploadQueue';
import TradeSplit from '@/apppages/TradeSplit';

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
            // Handle string "[]" case - this is valid and will be normalized
            if (typeof pageConfig.filters === 'string' && pageConfig.filters.trim() === '[]') {
                // This is valid, no error needed
            } else if (!Array.isArray(pageConfig.filters)) {
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
    console.log("check comp names", componentName, componentType)
    const menuItems = useAppSelector(selectAllMenuItems);
    const searchParams = useSearchParams();
    const clientCodeParam = searchParams.get('clientCode');
    const clientCode = clientCodeParam ? decryptData(clientCodeParam) : null;
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
    const [pageLoaded, setPageLoaded] = useState(false);
    const [isPageLoaded, setIsPageLoaded] = useState(false);
    const [isAutoWidth, setIsAutoWidth] = useState(false);

    // Error handling state
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    // Download loading state
    const [isDownloadLoading, setIsDownloadLoading] = useState(false);

    // State for tracking enabled file records for auto-import
    const [enabledFileRecords, setEnabledFileRecords] = useState<Set<string>>(new Set());

    // Add validation state
    const [validationResult, setValidationResult] = useState<PageDataValidationResult | null>(null);
    const [showValidationDetails, setShowValidationDetails] = useState(false);
    const [announceMsg, setAnnounceMsg] = useState("");

    // State for Detail Column Click functionality
    const [detailApiData, setDetailApiData] = useState<any>(null);
    const [detailColumnInfo, setDetailColumnInfo] = useState<{
        columnKey: string;
        rowData: any;
        tabName: string;
    } | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    // State for Customize Table
    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
    const [frozenColumns, setFrozenColumns] = useState<string[]>([]);
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);
    const [textColumns, setTextColumns] = useState<string[]>([]);
    const [isGroupSumModalOpen, setIsGroupSumModalOpen] = useState(false);
    const handleCustomizeSave = (data: {
        frozenColumns: string[];
        textColumns: string[];
    }) => {
        setFrozenColumns(data.frozenColumns);
        setTextColumns(data.textColumns);
    };

    useEffect(() => {
        if (!announceMsg) return;

        let region = document.getElementById("nvdaLiveRegion");
        if (!region) {
            region = document.createElement("div");
            region.id = "nvdaLiveRegion";
            region.setAttribute("role", "status");
            region.setAttribute("aria-live", "assertive");
            region.setAttribute("aria-atomic", "true");
            region.style.position = "absolute";
            region.style.left = "-9999px";
            document.body.appendChild(region);
        }

        region.textContent = announceMsg;
    }, [announceMsg]);

    // Add comprehensive cache for different filter combinations and levels
    const [dataCache, setDataCache] = useState<Record<string, {
        data: any[] | null;
        additionalTables: Record<string, any[]>;
        rs1Settings: any;
        jsonData: any;
        jsonDataUpdated: any;
        responseTime: number | undefined;
        timestamp: number;
    }>>({});

    console.log("check level stack", levelStack)

    // Function to generate cache key based on current state
    const generateCacheKey = (level: number, filters: Record<string, any>, primaryFilters: Record<string, any>) => {
        const filterString = JSON.stringify(filters);
        const primaryFilterString = JSON.stringify(primaryFilters);
        return `level_${level}_filters_${btoa(filterString)}_primary_${btoa(primaryFilterString)}`;
    };

    // Function to clean up old cache entries (keep last 10 entries)
    const cleanupCache = (newCache: typeof dataCache) => {
        const cacheEntries = Object.entries(newCache);
        if (cacheEntries.length > 10) {
            // Sort by timestamp and keep only the 10 most recent
            const sortedEntries = cacheEntries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            return Object.fromEntries(sortedEntries.slice(0, 10));
        }
        return newCache;
    };

    const tableRef = useRef<HTMLDivElement>(null);
    const { colors, fonts } = useTheme();
    const hasFetchedRef = useRef(false);
    const ongoingRequestRef = useRef<string | null>(null); // Track ongoing API requests
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For debouncing



    const appMetadata = (() => {
        try {
            return JSON.parse(getLocalStorage(APP_METADATA_KEY))
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
    const OpenedPageName = pageData?.length ? pageData[0]?.level : "Add Master From Details"
    const uploadFilters = useMemo(() => {
        const payload: Record<string, any> = {};

        if (clientCode) {
            payload.ClientCode = clientCode;
        }

        const hasFiltersConfigured = pageData?.[0]?.filters && Array.isArray(pageData[0].filters) && pageData[0].filters.length > 0;

        if (hasFiltersConfigured && areFiltersInitialized) {
            Object.entries(filters || {}).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') {
                    return;
                }

                if (value instanceof Date || moment.isMoment(value)) {
                    payload[key] = moment(value).format('YYYYMMDD');
                } else {
                    payload[key] = value;
                }
            });
        }

        if (currentLevel > 0 && Object.keys(primaryKeyFilters).length > 0) {
            Object.entries(primaryKeyFilters).forEach(([key, value]) => {
                payload[key] = value;
            });
        }

        return payload;
    }, [clientCode, pageData, filters, areFiltersInitialized, currentLevel, primaryKeyFilters]);

    // Validate pageData whenever it changes
    useEffect(() => {
        if (pageData) {
            const validation = validatePageData(pageData);
            setValidationResult(validation);
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

    // Helper functions for button configuration
    const isMasterButtonEnabled = (buttonType: string): boolean => {
        if (!pageData?.[0]?.MasterbuttonConfig) return true; // Default to enabled if no config
        const buttonConfig = pageData[0].MasterbuttonConfig.find(
            (config: any) => config.ButtonType === buttonType
        );

        return buttonConfig?.EnabledTag === "true";
    };

    const isRowButtonEnabled = (buttonType: string): boolean => {
        if (!pageData?.[0]?.buttonConfig) return true; // Default to enabled if no config
        const buttonConfig = pageData[0].buttonConfig.find(
            (config: any) => config.ButtonType === buttonType
        );
        return buttonConfig?.EnabledTag === "true";
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
            // Handle filters field - normalize string "[]" to actual array
            let filters = pageData?.[0]?.filters;
            if (typeof filters === 'string' && filters.trim() === '[]') {
                filters = [];
            }

            if (filters && Array.isArray(filters) && filters.length > 0) {
                const defaultFilters: Record<string, any> = {};

                // Handle the nested array structure with safe validation
                filters.forEach((filterGroup, groupIndex) => {
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

                // Check if there are filters that need to be configured
                let filters = pageData[0]?.filters;
                if (typeof filters === 'string' && filters.trim() === '[]') {
                    filters = [];
                }
                const hasFilters = filters && Array.isArray(filters) && filters.length > 0;

                // If we have a client code, we want to fetch data regardless of autoFetch setting
                if (clientCode) {
                    fetchData();
                } else if (!newAutoFetch && hasFilters) {
                    // Only skip fetch if autoFetch is false AND there are filters to configure
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

    // Initialize enabled file records when apiData changes (for import type)
    useEffect(() => {
        if (componentType === 'import' && apiData && apiData.length > 0) {
            // Enable all records by default - use FileName or FileSerialNo as unique identifier
            const allRecordIds = new Set<string>(
                apiData.map((record: any) => String(record.FileName || record.FileSerialNo || record.id))
            );
            setEnabledFileRecords(allRecordIds);
        }
    }, [apiData, componentType]);

    // Add new useEffect to handle level changes and manual fetching
    useEffect(() => {
        // Only run after page is loaded and when level or primary filters change
        if (pageLoaded) {
            if (currentLevel > 0) {
                console.log('Fetching data for level:', currentLevel);
                fetchData();
            }
            // For level 0, fetchData will handle cache checking internally
            else if (autoFetch) {
                console.log('Auto-fetching data for level 0');
                fetchData();
            }
        }
    }, [currentLevel, primaryKeyFilters, pageLoaded]); // Removed excessive dependencies

    // Debounced fetch function to prevent rapid successive calls
    const debouncedFetchData = (currentFilters = filters, delay = 100) => {
        // Clear any existing timeout
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        // Set new timeout
        fetchTimeoutRef.current = setTimeout(() => {
            fetchData(currentFilters);
        }, delay);
    };

    const fetchData = async (currentFilters = filters, cacheRequired = true) => {
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

        // Generate cache key for current request
        const cacheKey = generateCacheKey(currentLevel, currentFilters, primaryKeyFilters);

        // Check if we have cached data for this exact combination
        if (dataCache[cacheKey] && cacheRequired) {
            console.log('Using cached data for:', cacheKey);
            const cachedData = dataCache[cacheKey];
            setApiData(cachedData.data);
            setAdditionalTables(cachedData.additionalTables);
            setRs1Settings(cachedData.rs1Settings);
            setJsonData(cachedData.jsonData);
            setJsonDataUpdated(cachedData.jsonDataUpdated);
            setApiResponseTime(cachedData.responseTime);
            setHasFetchAttempted(true);
            return; // Exit early with cached data
        }

        // Check if there's already an ongoing request for this cache key
        if (ongoingRequestRef.current === cacheKey && cacheRequired) {
            console.log('Request already in progress for:', cacheKey);
            return; // Exit early to prevent duplicate requests
        }

        console.log('Making API call for:', cacheKey);
        ongoingRequestRef.current = cacheKey; // Mark request as ongoing
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
            let filters = pageData[0]?.filters;
            if (typeof filters === 'string' && filters.trim() === '[]') {
                filters = [];
            }
            const hasFilters = filters && Array.isArray(filters) && filters.length > 0;

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
                <J_Api>"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            const endTime = performance.now();
            setApiResponseTime(Math.round(endTime - startTime));
            const rawData = response?.data?.data?.rs0 || [];

            // Check for error flag in the response
            if (rawData.length > 0 && rawData[0].ErrorFlag === 'E' && rawData[0].ErrorMessage) {
                setErrorMessage(rawData[0].ErrorMessage);
                setIsErrorModalOpen(true);
                setApiData([]); // Don't show any data in table
                return; // Exit early to prevent further processing
            }

            const dataWithId = rawData.map((row: any, index: number) => ({
                ...row,
                _id: index
            }));
            setApiData(dataWithId);

            // NVDA ANNOUNCEMENT (correct place)
            if (dataWithId.length >= 0) {
                const msg = dataWithId.length > 0
                    ? `Total records available are ${dataWithId.length}.`
                    : "No data available.";

                setAnnounceMsg(msg);
            }

            // Handle additional tables (rs3, rs4, etc.)
            const additionalTablesData: Record<string, any[]> = {};
            Object.entries(response.data.data).forEach(([key, value]) => {
                if (key !== 'rs0' && key !== 'rs1' && Array.isArray(value)) {
                    additionalTablesData[key] = value;
                }
            });
            setAdditionalTables(additionalTablesData);

            // Parse RS1 Settings if available
            let parsedJsonData = null;
            let parsedJsonUpdated = null;
            let parsedRs1Settings = null;

            if (response?.data?.data?.rs1?.[0]?.Settings) {
                const xmlString = response?.data?.data?.rs1[0].Settings;
                parsedRs1Settings = parseSettingsFromXml(xmlString);

                parsedJsonData = convertXmlToJson(xmlString);
                parsedJsonUpdated = await convertXmlToJsonUpdated(xmlString);

                setJsonData(parsedJsonData);
                setJsonDataUpdated(parsedJsonUpdated);
                setRs1Settings(parsedRs1Settings);
            }

            // Cache data for future use with current filter combination
            const cacheKey = generateCacheKey(currentLevel, currentFilters, primaryKeyFilters);
            setDataCache(prevCache => {
                const newCache = {
                    ...prevCache,
                    [cacheKey]: {
                        data: dataWithId,
                        additionalTables: additionalTablesData,
                        rs1Settings: parsedRs1Settings,
                        jsonData: parsedJsonData,
                        jsonDataUpdated: parsedJsonUpdated,
                        responseTime: Math.round(endTime - startTime),
                        timestamp: Date.now()
                    }
                };
                return cleanupCache(newCache);
            });

        } catch (error) {
            console.error('Error fetching data:', error);
            if (error.response?.data) {
                console.error('Error response data:', error.response.data);
            }
            setApiResponseTime(undefined);
        } finally {
            setIsLoading(false);
            ongoingRequestRef.current = null; // Clear ongoing request reference
        }
    };
    // Modify handleRecordClick
    const handleRecordClick = (record: any) => {
        // Handle import type - do nothing, upload interface is shown directly on page
        if (componentType === 'import') {
            return;
        }

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

    // Handle Selectable_Buttons click - calls API with selected rows as X_Data
    const handleSelectableButtonClick = async (button: any, selectedRows: any[]) => {
        try {
            setIsLoading(true);

            const userId = getLocalStorage('userId');
            const userType = getLocalStorage('userType');
            const pageName = pageData?.[0]?.wPage || "";

            // Build J_Ui from button API config
            const jUiConfig = button.API?.J_Ui || {};
            const jUi = Object.entries(jUiConfig)
                .map(([key, value]) => {
                    if (key === 'ActionName' && !value) {
                        return `"${key}":"${pageName}"`;
                    }
                    return `"${key}":"${value}"`;
                })
                .join(',');

            // Build J_Api
            const jApi = `"UserId":"${userId}","UserType":"${userType}"`;

            // Build X_Filter from current filters
            let filterXml = '';

            // Include client code if present
            if (clientCode) {
                filterXml += `<ClientCode>${clientCode}</ClientCode>`;
            }

            // Process current filters
            Object.entries(filters).forEach(([key, value]) => {
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

            // Add primary key filters for levels > 0
            if (currentLevel > 0 && Object.keys(primaryKeyFilters).length > 0) {
                Object.entries(primaryKeyFilters).forEach(([key, value]) => {
                    filterXml += `<${key}>${value}</${key}>`;
                });
            }

            // Build X_Data from selected rows
            let xDataItems = '';
            selectedRows.forEach((row, index) => {
                let itemXml = '<item>';
                Object.entries(row).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && !key.startsWith('_')) {
                        // Escape XML special characters
                        const escapedValue = String(value)
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&apos;');
                        itemXml += `<${key}>${escapedValue}</${key}>`;
                    }
                });
                itemXml += '</item>';
                xDataItems += itemXml;
            });

            const X_Data = `<items>${xDataItems}</items>`;

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql></Sql>
                <X_Filter>${filterXml}</X_Filter>
                <X_Filter_Multiple></X_Filter_Multiple>
                <X_Data>${X_Data}</X_Data>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            console.log('Selectable Button API Request:', xmlData);

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            const rs0 = response?.data?.data?.rs0;

            // Handle download type buttons
            if (button.type === 'download') {
                const fileData = rs0?.[0];
                if (fileData?.Base64PDF) {
                    displayAndDownloadFile(fileData.Base64PDF, fileData.PDFName);
                } else {
                    toast.error('No file content received from server');
                }
                return;
            }

            // Handle non-download type buttons - show toasts based on MessageType
            if (rs0?.length) {
                let hasSuccess = false;
                rs0.forEach((item: any) => {
                    if (item.MessageType === 'SUCCESS' && item.MessageText?.trim()) {
                        toast.success(item.MessageText.trim());
                        hasSuccess = true;
                    } else if (item.MessageType === 'ERROR' && item.MessageText?.trim()) {
                        toast.error(item.MessageText.trim());
                    }
                });
                if (hasSuccess) {
                    fetchData(filters, false);
                }
            } else if (response?.data?.success === false) {
                const errorMessage = response?.data?.message || 'Operation failed';
                toast.error(errorMessage);
            }

        } catch (error) {
            console.error('Error in handleSelectableButtonClick:', error);
            toast.error('An error occurred while processing your request');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle click on columns with DetailAPI configuration
    const handleDetailColumnClick = async (columnKey: string, rowData: any) => {
        console.log('Detail Column Click:', columnKey, rowData);

        // Get the current level settings
        const currentLevelSettings = pageData?.[0]?.levels?.[currentLevel]?.settings;
        if (!currentLevelSettings?.DetailColumn) {
            console.log('No DetailColumn configuration found');
            return;
        }

        // Find the DetailColumn configuration for this column
        const detailConfig = currentLevelSettings.DetailColumn.find(
            (config: any) => config.wKey === columnKey
        );

        if (!detailConfig?.DetailAPI) {
            console.log('No DetailAPI configuration found for column:', columnKey);
            return;
        }

        setIsDetailLoading(true);

        try {
            const dsXml = detailConfig.DetailAPI.dsXml;

            // Build J_Ui string
            const jUiData = dsXml.J_Ui || {};
            const jUiString = Object.entries(jUiData)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            // Build X_Filter with placeholder substitution
            let filterXml = '';
            const xFilter = dsXml.X_Filter || {};
            Object.entries(xFilter).forEach(([key, value]) => {
                let actualValue = value as string;

                // Replace ##ColumnName## placeholders with actual row values
                const placeholderMatch = actualValue.match(/##(.+?)##/);
                if (placeholderMatch) {
                    const placeholderKey = placeholderMatch[1];
                    actualValue = rowData[placeholderKey] || '';
                }

                filterXml += `<${key}>${actualValue}</${key}>`;
            });

            // Add date filters from the current filters state
            Object.entries(filters).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') {
                    return;
                }
                if (value instanceof Date || moment.isMoment(value)) {
                    const formattedDate = moment(value).format('YYYYMMDD');
                    filterXml += `<${key}>${formattedDate}</${key}>`;
                } else {
                    filterXml += `<${key}>${value}</${key}>`;
                }
            });

            // Build J_Api with placeholder substitution
            const jApiData = dsXml.J_Api || {};
            const jApiString = Object.entries(jApiData)
                .map(([key, value]) => {
                    let actualValue = value as string;
                    if (actualValue === '<<USERID>>') {
                        actualValue = getLocalStorage('userId') || '';
                    }
                    return `"${key}":"${actualValue}"`;
                })
                .join(',');

            const xmlData = `<dsXml>
                <J_Ui>${jUiString}</J_Ui>
                <Sql>${dsXml.Sql || ''}</Sql>
                <X_Filter>${filterXml}</X_Filter>
                <X_GFilter></X_GFilter>
                <J_Api>${jApiString}, "UserType":"${getLocalStorage('userType')}"</J_Api>
            </dsXml>`;

            console.log('Detail API Request:', xmlData);

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            console.log('Detail API Response:', response);

            const rawData = response?.data?.data?.rs0 || [];

            // Check for error flag in the response
            if (rawData.length > 0 && rawData[0].ErrorFlag === 'E' && rawData[0].ErrorMessage) {
                setErrorMessage(rawData[0].ErrorMessage);
                setIsErrorModalOpen(true);
                return;
            }

            const dataWithId = rawData.map((row: any, index: number) => ({
                ...row,
                _id: index
            }));

            // Store detail data and info
            setDetailApiData(dataWithId);
            setDetailColumnInfo({
                columnKey,
                rowData,
                tabName: `${columnKey} Details`
            });

            // Add a new tab for detail view (using -1 as special level identifier)
            setLevelStack(prev => [...prev, -1]);

        } catch (error) {
            console.error('Error fetching detail column data:', error);
            toast.error('Failed to fetch details');
        } finally {
            setIsDetailLoading(false);
        }
    };

    // Handle closing detail view
    const handleDetailTabClose = () => {
        setDetailApiData(null);
        setDetailColumnInfo(null);
        // Remove the detail level (-1) from stack
        setLevelStack(prev => prev.filter(level => level !== -1));
    };

    // Handler for toggling file record enabled/disabled for auto-import
    const handleToggleFileRecord = (record: any) => {
        const recordId = String(record.FileName || record.FileSerialNo || record.id);
        setEnabledFileRecords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(recordId)) {
                newSet.delete(recordId);
            } else {
                newSet.add(recordId);
            }
            return newSet;
        });
    };

    // Handler for toggling all file records
    const handleToggleAllFileRecords = (checked: boolean) => {
        if (checked && apiData) {
            const allRecordIds = new Set<string>(
                apiData.map((record: any) => String(record.FileName || record.FileSerialNo || record.id))
            );
            setEnabledFileRecords(allRecordIds);
        } else {
            setEnabledFileRecords(new Set());
        }
    };


    // Simple useEffect to set pageLoaded after component mounts
    useEffect(() => {
        const timer = setTimeout(() => {
            setPageLoaded(true);
        }, 1000);
        const timer2 = setTimeout(() => {
            setIsPageLoaded(true);
        }, 5000);
        return () => {
            clearTimeout(timer);
            clearTimeout(timer2);
        };
    }, []);

    // Cleanup effect to clear any pending timeouts on unmount
    useEffect(() => {
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, []);

    // Initialize upload success counter for this component instance
    useEffect(() => {
        if (componentType === 'import') {
            // Reset the upload success counter when component mounts
            (window as any).__prevUploadSuccess = 0;
        }
        return () => {
            // Cleanup on unmount
            if (componentType === 'import') {
                delete (window as any).__prevUploadSuccess;
            }
        };
    }, [componentType]);

    // Auto-open filter modal when autoFetch is false and filterType is not "onPage"
    useEffect(() => {
        if (pageData && pageLoaded && areFiltersInitialized && currentLevel === 0) {
            const autoFetchSetting = pageData[0]?.autoFetch;
            const filterType = pageData[0]?.filterType;
            let filters = pageData[0]?.filters;
            if (typeof filters === 'string' && filters.trim() === '[]') {
                filters = [];
            }
            const hasFilters = filters && Array.isArray(filters) && filters.length > 0;

            // Check if autoFetch is false and filterType is not "onPage" and has filters
            if (autoFetchSetting === "false" && filterType !== "onPage" && hasFilters && !clientCode && !isPageLoaded) {
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

        // If going back to first level (index 0), clear primary filters and check cache
        if (index === 0) {
            const newPrimaryFilters = {};
            setPrimaryKeyFilters(newPrimaryFilters);

            // Generate cache key for level 0 with current filters and empty primary filters
            const cacheKey = generateCacheKey(level, filters, newPrimaryFilters);

            // Restore cached data if available for this exact combination
            if (dataCache[cacheKey]) {
                console.log('Restoring cached data for first tab:', cacheKey);
                const cachedData = dataCache[cacheKey];
                setApiData(cachedData.data);
                setAdditionalTables(cachedData.additionalTables);
                setRs1Settings(cachedData.rs1Settings);
                setJsonData(cachedData.jsonData);
                setJsonDataUpdated(cachedData.jsonDataUpdated);
                setApiResponseTime(cachedData.responseTime);

                // Set the current level after restoring data
                setCurrentLevel(level);
                return; // Exit early to prevent data fetching
            }
        }

        // Set the current level (this will trigger useEffect to fetch data if not cached)
        setCurrentLevel(level);
    };

    // Modified filter change handler
    const handleFilterChange = (newFilters: Record<string, any>) => {
        setFilters(newFilters);
        if (pageLoaded) {
            // Use debounced fetch to prevent rapid successive calls
            debouncedFetchData(newFilters);
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

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            if (response?.data?.success) {
                fetchData(filters, false);
                const rawMessage = response?.data?.message
                const deleteMsg = rawMessage.replace(/<\/?Message>/g, "");
                toast.success(deleteMsg)
            }
            console.log("response of delete api", response)

        } catch (error) {
            console.error(`Error fetching options for   `);
        } finally {
            console.log("check delete record");
        }
    }

    // function to handle table actions
    // const handleTableAction = (action: string, record: any) => {
    //     setEntryFormData(record);
    //     setEntryAction(action as 'edit' | 'delete' | 'view');
    //     if (action === "edit" || action === "view") {
    //         setIsEntryModalOpen(true);
    //     } else {
    //         setIsConfirmationModalOpen(true);
    //     }
    // }

    const handleTableAction = (action: string, record: any) => {
        setEntryFormData(record);
        setEntryAction(action as "edit" | "delete" | "view");

        const alertBox = document.getElementById("sr-alert");

        // Announce Edit + View + Delete
        if (alertBox) {
            const readableAction =
                action === "edit"
                    ? "Edit"
                    : action === "view"
                        ? "View"
                        : "Delete";

            alertBox.textContent = `${OpenedPageName} ${readableAction}. model page opened`;
        }

        // EDIT + VIEW → Open entry modal

        if (action === "edit" || action === "view") {
            setIsEntryModalOpen(true);

            // Focus the modal heading AFTER modal is visible
            setTimeout(() => {
                const modalHeading = document.getElementById("entry-modal-heading");
                modalHeading?.focus();
            }, 50);

            return;
        }


        // DELETE → Open delete modal
        if (action === "delete") {
            setIsConfirmationModalOpen(true);

            setTimeout(() => {
                const deleteHeading = document.getElementById("delete-modal-heading");
                deleteHeading?.focus();
            }, 50);
        }
    };

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

    // Add mobile menu state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

        if (componentType === "multireport") {
            const filtered = recursiveSearch(apiData, searchTerm);
            setFilteredApiData(filtered);
        } else {
            const filtered = apiData.filter((row: any) => {
                return Object.values(row).some((value: any) => {
                    if (value === null || value === undefined) return false;
                    return String(value).toLowerCase().includes(searchTerm.toLowerCase());
                });
            });
            setFilteredApiData(filtered);
        }
    }, [apiData, searchTerm, componentType]);

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

    const handleDownloadOption = async () => {
        setIsDownloadLoading(true);
        toast.info("File is being downloaded in the background...", { autoClose: 500 });
        try {
            await downloadOption(jsonData, appMetadata, apiData, pageData, filters, currentLevel);
        } catch (error) {
            console.error("Download error:", error);
            toast.error("An error occurred during download.");
        } finally {
            setIsDownloadLoading(false);
        }
    };

    // Close search box when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const searchContainer = document.querySelector('.search-container');
            if (isSearchActive && searchContainer && !searchContainer.contains(event.target as Node)) {
                setIsSearchActive(false);
                // setSearchTerm('');
            }
        };

        if (isSearchActive) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSearchActive]);

    // Close mobile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const mobileMenu = document.querySelector('.mobile-menu-container');
            if (isMobileMenuOpen && mobileMenu && !mobileMenu.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };

        if (isMobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMobileMenuOpen]);

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
        return (
            <div className="flex items-center justify-center py-8 border rounded-lg" style={{
                backgroundColor: colors.cardBackground,
                borderColor: '#e5e7eb',
                minHeight: '200px'
            }}>
                <div className="text-center">
                    <div className="text-lg font-medium mb-2" style={{ color: colors.text }}>
                        Component Not Found
                    </div>
                    <div className="text-sm text-gray-500">
                        No configuration found for component: <strong>{componentName}</strong>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                        This might be a static component that should be handled differently.
                    </div>
                </div>
            </div>
        );
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
            {/* Tabs and Action Buttons */}
            {safePageData.isValid && (
                <div className="flex border-b border-gray-200">
                    {/* Tabs - Always show tab name, even for single level */}
                    <div className="flex flex-1 gap-2">
                        {levelStack.map((level, index) => (
                            <button
                                key={index}
                                style={{ backgroundColor: colors.cardBackground }}
                                className={`px-4 py-2 text-sm rounded-t-lg font-bold ${level === -1
                                    ? `bg-${colors.primary} text-${colors.buttonText}`
                                    : currentLevel === level
                                        ? `bg-${colors.primary} text-${colors.buttonText}`
                                        : `bg-${colors.tabBackground} text-${colors.tabText}`
                                    }`}
                                onClick={() => {
                                    if (level === -1) {
                                        // Clicking on detail tab closes it
                                        handleDetailTabClose();
                                    } else {
                                        // Also close any open detail view when switching to other tabs
                                        if (detailApiData) {
                                            handleDetailTabClose();
                                        }
                                        handleTabClick(level, index);
                                    }
                                }}
                            >
                                {level === -1
                                    ? (
                                        <span className="flex items-center gap-2">
                                            {detailColumnInfo?.tabName || 'Details'}
                                            <span className="text-xs opacity-70">✕</span>
                                        </span>
                                    )
                                    : level === 0
                                        ? safePageData.getSetting('level') || safePageData.getCurrentLevel(level)?.name || 'Main'
                                        : safePageData.getCurrentLevel(level)?.name || `Level ${level}`
                                }
                            </button>
                        ))}
                    </div>

                    {/* Action Icons - Always show */}
                    <div className="flex gap-2">
                        {/* Mobile View - Show essential buttons and More menu */}
                        <div className="flex gap-2 md:hidden">
                            {/* Essential buttons for mobile */}
                            <div className="relative group">
                                <button
                                    className="p-2 rounded hover:bg-gray-100 transition-colors"
                                    onClick={() => {
                                        // Clear cache for current filter combination when manually refreshing
                                        const cacheKey = generateCacheKey(currentLevel, filters, primaryKeyFilters);
                                        setDataCache(prevCache => {
                                            const newCache = { ...prevCache };
                                            delete newCache[cacheKey];
                                            return newCache;
                                        });
                                        fetchData();
                                    }}
                                    style={{ color: colors.text }}
                                    aria-label='Refresh Data'
                                >
                                    <FaSync size={20} />
                                </button>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    Refresh Data
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                </div>
                            </div>

                            {(componentType === 'entry' || componentType === "multientry") && isRowButtonEnabled('Add') && (
                                <div className="relative group">
                                    <button
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        onClick={() => setIsEntryModalOpen(true)}
                                        style={{ color: colors.text }}
                                        aria-label='Add New Entry'
                                    >
                                        <FaPlus size={20} />
                                    </button>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Add New Entry
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                    </div>
                                </div>
                            )}

                            {!showFilterHorizontally && safePageData.hasFilters() && (
                                <div className="relative group">
                                    <button
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        onClick={() => setIsFilterModalOpen(true)}
                                        style={{ color: colors.text }}
                                        aria-label='Apply Filters'
                                    >
                                        <FaFilter size={20} />
                                    </button>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Apply Filters
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                    </div>
                                </div>
                            )}

                            {/* More menu for mobile */}
                            <div className="relative mobile-menu-container">
                                <button
                                    className="p-2 rounded hover:bg-gray-100 transition-colors"
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                    style={{ color: colors.text }}
                                    aria-label='Click enter for expanded export buttons'
                                >
                                    <FaEllipsisV size={20} />
                                </button>

                                {isMobileMenuOpen && (
                                    <div
                                        className="absolute top-full right-0 mt-1 w-48 rounded border shadow-lg z-50"
                                        style={{
                                            backgroundColor: colors.cardBackground,
                                            borderColor: '#e5e7eb'
                                        }}
                                    >
                                        <div className="py-1">
                                            {(componentType === 'entry' || componentType === "multientry") && isRowButtonEnabled('Add') && (
                                                <button
                                                    onClick={() => {
                                                        setIsEntryModalOpen(true);
                                                        setIsMobileMenuOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                                    style={{ color: colors.text }}
                                                    aria-label="Add New Entry"
                                                >
                                                    <FaPlus size={16} />
                                                    Add New Entry
                                                </button>
                                            )}

                                            {/* Customize Table Button (Mobile) */}
                                            <button
                                                onClick={() => {
                                                    // Calculate available columns logic
                                                    if (apiData && apiData.length > 0) {
                                                        const currentSettings = safePageData.getCurrentLevel(currentLevel)?.settings;
                                                        const columnsToHide = currentSettings?.hideEntireColumn
                                                            ? currentSettings.hideEntireColumn.split(',').map((col: string) => col.trim())
                                                            : [];

                                                        const allColumns = Object.keys(apiData[0]).filter(key =>
                                                            !key.startsWith('_') && !columnsToHide.includes(key)
                                                        );
                                                        setAvailableColumns(allColumns);
                                                        setIsCustomizeModalOpen(true);
                                                        setIsMobileMenuOpen(false);
                                                    } else {
                                                        toast.info("No data available to customize columns.");
                                                    }
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                                style={{ color: colors.text }}
                                                aria-label="Freeze Columns"
                                            >
                                                <FaColumns size={16} />
                                                Freeze Columns
                                            </button>
                                            {selectedRows.length > 0 && safePageData.getCurrentLevel(currentLevel)?.settings?.EditableColumn && isRowButtonEnabled('Edit') && (
                                                <button
                                                    onClick={() => {
                                                        setIsEditTableRowModalOpen(true);
                                                        setIsMobileMenuOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                                    style={{ color: colors.text }}
                                                    aria-label="Edit Selected Row"
                                                >
                                                    <FaEdit size={16} />
                                                    Edit Selected Rows
                                                </button>
                                            )}
                                            {isMasterButtonEnabled('Excel') && (
                                                <button
                                                    onClick={() => {
                                                        exportTableToExcel(tableRef.current, jsonData, apiData, pageData, appMetadata, textColumns);
                                                        setIsMobileMenuOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                                    style={{ color: colors.text }}
                                                    aria-label="Export to Excel"
                                                >
                                                    <FaFileExcel size={16} />
                                                    Export to Excel
                                                </button>
                                            )}
                                            {isMasterButtonEnabled('Email') && (
                                                <button
                                                    onClick={() => {
                                                        setPdfParams([tableRef.current, jsonData, appMetadata, apiData, pageData, filters, currentLevel, 'email']);
                                                        setIsConfirmModalOpen(true);
                                                        setIsMobileMenuOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                                    style={{ color: colors.text }}
                                                    aria-label="Email Report"
                                                >
                                                    <FaEnvelope size={16} />
                                                    Email Report
                                                </button>
                                            )}
                                            {showTypeList && isMasterButtonEnabled('Download') && (
                                                <button
                                                    onClick={() => {
                                                        if (!isDownloadLoading) {
                                                            handleDownloadOption();
                                                            setIsMobileMenuOpen(false);
                                                        }
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${isDownloadLoading ? 'cursor-wait opacity-70' : ''}`}
                                                    style={{ color: colors.text }}
                                                    aria-label="Download Options"
                                                    disabled={isDownloadLoading}
                                                >
                                                    {isDownloadLoading ? <FaSpinner size={16} className="animate-spin" /> : <FaDownload size={16} />}
                                                    Download Options
                                                </button>
                                            )}
                                            {Object.keys(additionalTables).length == 0 && (
                                                <>
                                                    {isMasterButtonEnabled('CSV') && (
                                                        <button
                                                            onClick={() => {
                                                                exportTableToCsv(tableRef.current, jsonData, apiData, pageData);
                                                                setIsMobileMenuOpen(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                                            style={{ color: colors.text }}
                                                            aria-label="Export to CSV"
                                                        >
                                                            <FaFileCsv size={16} />
                                                            Export to CSV
                                                        </button>
                                                    )}
                                                    {!showTypeList && isMasterButtonEnabled('PDF') && (
                                                        <button
                                                            onClick={() => {
                                                                exportTableToPdf(tableRef.current, jsonData, appMetadata, apiData, pageData, filters, currentLevel, 'download');
                                                                setIsMobileMenuOpen(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                                            style={{ color: colors.text }}
                                                            aria-label="Export to PDF"
                                                        >
                                                            <FaFilePdf size={16} />
                                                            Export to PDF
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {apiData && apiData?.length > 0 && (
                                                <button
                                                    onClick={() => {
                                                        handleSearchToggle();
                                                        setIsMobileMenuOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                                    style={{ color: colors.text }}
                                                    aria-label='Search Records'
                                                >
                                                    <FaSearch size={16} />
                                                    Search Records
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Search box for mobile */}
                            {apiData && apiData?.length > 0 && isSearchActive && (
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
                                                    aria-label="Close Button"
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

                        {/* Desktop View - Show all buttons */}
                        <div className="hidden md:flex gap-2">
                            {selectedRows.length > 0 && safePageData.getCurrentLevel(currentLevel)?.settings?.EditableColumn && isRowButtonEnabled('Edit') && (
                                <div className="relative group">
                                    <button
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        onClick={() => setIsEditTableRowModalOpen(true)}
                                        style={{ color: colors.text }}
                                        aria-label='Edit Selected Rows'
                                    >
                                        <FaEdit size={20} />
                                    </button>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Edit Selected Rows
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                    </div>
                                </div>
                            )}
                            {(componentType === 'entry' || componentType === "multientry") && isRowButtonEnabled('Add') && (
                                <div className="relative group">
                                    <button
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        onClick={() => {
                                            console.log('Plus button clicked, componentType:', componentType);
                                            console.log('pageData available:', !!pageData);
                                            console.log('pageData structure:', pageData);
                                            setIsEntryModalOpen(true);
                                        }}
                                        style={{ color: colors.text }}
                                        aria-label="Add New Entry"
                                    >
                                        <FaPlus size={20} />
                                    </button>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Add New Entry
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                    </div>
                                </div>
                            )}

                            {/* Customize Table Button (Desktop) */}
                            <div className="relative group">
                                <button
                                    className="p-2 rounded hover:bg-gray-100 transition-colors"
                                    onClick={() => {
                                        if (apiData && apiData.length > 0) {
                                            const currentSettings = safePageData.getCurrentLevel(currentLevel)?.settings;
                                            const columnsToHide = currentSettings?.hideEntireColumn
                                                ? currentSettings.hideEntireColumn.split(',').map((col: string) => col.trim())
                                                : [];

                                            const allColumns = Object.keys(apiData[0]).filter(key =>
                                                !key.startsWith('_') && !columnsToHide.includes(key)
                                            );
                                            setAvailableColumns(allColumns);
                                            setIsCustomizeModalOpen(true);
                                        } else {
                                            toast.info("No data available to customize columns.");
                                        }
                                    }}
                                    style={{ color: colors.text }}
                                    aria-label="Customize Table"
                                >
                                    <FaColumns size={20} />
                                </button>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    Customize Table
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                </div>
                            </div>

                            {/* Group & Sum Button */}
                            <div className="relative group">
                                <button
                                    className="p-2 rounded hover:bg-gray-100 transition-colors"
                                    onClick={() => {
                                        if (apiData && apiData.length > 0) {
                                            const currentSettings = safePageData.getCurrentLevel(currentLevel)?.settings;
                                            const columnsToHide = currentSettings?.hideEntireColumn
                                                ? currentSettings.hideEntireColumn.split(',').map((col: string) => col.trim())
                                                : [];

                                            const allColumns = Object.keys(apiData[0]).filter(key =>
                                                !key.startsWith('_') && !columnsToHide.includes(key)
                                            );
                                            setAvailableColumns(allColumns);
                                            setIsGroupSumModalOpen(true);
                                        } else {
                                            toast.info("No data available for grouping.");
                                        }
                                    }}
                                    style={{ color: colors.text }}
                                    aria-label="Group & Sum"
                                >
                                    <FaCalculator size={20} />
                                </button>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    Group & Sum
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                </div>
                            </div>

                            {isMasterButtonEnabled('Email') && (
                                <div className="relative group">
                                    <button
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        onClick={() => {
                                            setPdfParams([tableRef.current, jsonData, appMetadata, apiData, pageData, filters, currentLevel, 'email']);
                                            setIsConfirmModalOpen(true);
                                        }}
                                        style={{ color: colors.text }}
                                        aria-label="Email Report"
                                    >
                                        <FaEnvelope size={20} />
                                    </button>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Email Report
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                    </div>
                                </div>
                            )}

                            <div className="relative group">
                                <button
                                    className="p-2 rounded hover:bg-gray-100 transition-colors"
                                    onClick={() => setIsAutoWidth(!isAutoWidth)}
                                    style={{ color: isAutoWidth ? '#3b82f6' : colors.text }}
                                    aria-label="Toggle Auto Width"
                                >
                                    <FaArrowsAltH size={20} />
                                </button>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    {isAutoWidth ? "Reset Column Widths" : "Fit Columns to Width"}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                </div>
                            </div>

                            {isMasterButtonEnabled('ExportEmail') && (
                                <div className="relative group">
                                    <button
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        onClick={() => {
                                            setPdfParams([tableRef.current, jsonData, appMetadata, apiData, pageData, filters, currentLevel, 'email']);
                                            setIsConfirmModalOpen(true);
                                        }}
                                        style={{ color: colors.text }}
                                        aria-label="Export Email"
                                    >
                                        <FaRegEnvelope size={20} />
                                    </button>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Export Email
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                    </div>
                                </div>
                            )}

                            {showTypeList && isMasterButtonEnabled('Download') && (
                                <div className="relative group">
                                    <button
                                        className={`p-2 rounded hover:bg-gray-100 transition-colors ${isDownloadLoading ? 'cursor-wait opacity-70' : ''}`}
                                        onClick={() => !isDownloadLoading && handleDownloadOption()}
                                        style={{ color: colors.text }}
                                        aria-label="Download Options"
                                        disabled={isDownloadLoading}
                                    >
                                        {isDownloadLoading ? <FaSpinner size={20} className="animate-spin" /> : <FaDownload size={20} />}
                                    </button>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Download Options
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                    </div>
                                </div>
                            )}
                            {Object.keys(additionalTables).length == 0 && (
                                <>
                                    {isMasterButtonEnabled('CSV') && (
                                        <div className="relative group">
                                            <button
                                                className="p-2 rounded hover:bg-gray-100 transition-colors"
                                                onClick={() => {
                                                    if (componentType === "multireport") {
                                                        generateCsv(filteredApiData, jsonData);
                                                    } else {
                                                        exportTableToCsv(tableRef.current, jsonData, apiData, pageData)
                                                    }
                                                }}
                                                style={{ color: colors.text }}
                                                aria-label="Export to CSV"
                                            >
                                                <FaFileCsv size={20} />
                                            </button>
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                                Export to CSV
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                            </div>
                                        </div>
                                    )}
                                    {isMasterButtonEnabled('Excel') && (
                                        <div className="relative group">
                                            <button
                                                className="p-2 rounded hover:bg-gray-100 transition-colors"
                                                onClick={() => {
                                                    if (componentType === "multireport") {
                                                        generateExcel(filteredApiData, jsonData, appMetadata);
                                                    } if (apiData?.length > 25000) {
                                                        toast.warning(`Excel export allowed up to 25,000 records. You have ${apiData?.length} records.`);
                                                        return; // stop here, don't export
                                                    }
                                                    else {
                                                        exportTableToExcel(tableRef.current, jsonData, apiData, pageData, appMetadata, textColumns);
                                                    }
                                                }}
                                                style={{ color: colors.text }}
                                                aria-label="Export to Excel"
                                            >
                                                <FaFileExcel size={20} className="text-green-600" />
                                            </button>
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                                Export to Excel
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                            </div>
                                        </div>
                                    )}

                                    {!showTypeList && isMasterButtonEnabled('PDF') && (
                                        <div className="relative group">
                                            <button
                                                onClick={() => {
                                                    if (componentType === "multireport") {
                                                        generatePdf(filteredApiData, jsonData, appMetadata);
                                                        return;
                                                    }
                                                    if (apiData?.length > 8000) {
                                                        toast.warning(`PDF export allowed up to 8,000 records. You have ${apiData?.length} records.`);
                                                        return; // stop here
                                                    }
                                                    exportTableToPdf(tableRef.current, jsonData, appMetadata, apiData, pageData, filters, currentLevel, 'download'
                                                    );
                                                }}
                                                className="p-2 rounded transition-colors flex items-center hover:bg-gray-100"
                                                style={{ color: colors.text }}
                                                aria-label="Export to PDF"
                                            >
                                                <FaFilePdf size={20} className='text-red-600' />
                                            </button>
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                                Export to PDF
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            {apiData && apiData?.length > 0 && (
                                <div className="relative search-container group">
                                    <button
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        onClick={handleSearchToggle}
                                        style={{ color: colors.text }}
                                        aria-label="Search Records"
                                    >
                                        <FaSearch size={20} />
                                    </button>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Search Records
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                    </div>

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
                            <div className="relative group">
                                <button
                                    className="p-2 rounded hover:bg-gray-100 transition-colors"
                                    aria-label="Refresh Data"
                                    onClick={() => {
                                        // Clear cache for current filter combination when manually refreshing
                                        const cacheKey = generateCacheKey(currentLevel, filters, primaryKeyFilters);
                                        setDataCache(prevCache => {
                                            const newCache = { ...prevCache };
                                            delete newCache[cacheKey];
                                            return newCache;
                                        });
                                        fetchData();
                                    }}
                                    style={{ color: colors.text }}
                                >
                                    <FaSync size={20} />
                                </button>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                    Refresh Data
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                </div>
                            </div>
                            {!showFilterHorizontally && safePageData.hasFilters() && (
                                <div className="relative group">
                                    <button
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        onClick={() => setIsFilterModalOpen(true)}
                                        style={{ color: colors.text }}
                                        aria-label="Apply Filters"
                                    >
                                        <FaFilter size={20} />
                                    </button>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Apply Filters
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                    </div>
                                </div>
                            )}
                        </div>
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
                totalRecords={apiData?.length}   // <-- REQUIRED
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

            <ErrorModal
                isOpen={isErrorModalOpen}
                onClose={() => setIsErrorModalOpen(false)}
                message={errorMessage}
            />

            <CustomizeTableModal
                isOpen={isCustomizeModalOpen}
                onClose={() => setIsCustomizeModalOpen(false)}
                availableColumns={availableColumns}
                frozenColumns={frozenColumns}
                textColumns={textColumns}
                onSave={handleCustomizeSave}
            />

            <GroupSumModal
                isOpen={isGroupSumModalOpen}
                onClose={() => setIsGroupSumModalOpen(false)}
                availableColumns={availableColumns}
                data={filteredApiData || []}
                rightList={jsonData?.RightList?.[0] || []}
                leftAlignedColumns={
                    safePageData.getCurrentLevel(currentLevel)?.settings?.leftAlignedColumns ||
                    safePageData.getCurrentLevel(currentLevel)?.settings?.leftAlignedColums
                        ? (safePageData.getCurrentLevel(currentLevel)?.settings?.leftAlignedColumns ||
                            safePageData.getCurrentLevel(currentLevel)?.settings?.leftAlignedColums)
                            .split(',')
                            .map((col: string) => col.trim())
                        : []
                }
                pageName={OpenedPageName}
                appMetadata={appMetadata}
                companyName={jsonData?.CompanyName?.[0] || ''}
                reportHeader={jsonData?.ReportHeader?.[0] || ''}
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
                onClose={() => {
                    setIsEditTableRowModalOpen(false)
                    fetchData(filters, false);
                }}
                title={safePageData.getCurrentLevel(currentLevel)?.name || 'Edit'}
                tableData={selectedRows}
                pageName={OpenedPageName}
                isTabs={componentType === "multientry" ? true : false}
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
            {(isLoading || isDetailLoading) &&
                <div className="flex inset-0 flex items-center justify-center z-[200] h-[100vh]">
                    <Loader />
                </div>
            }

            {/* Detail Column Data Display - Show when detail tab is active */}
            {!isLoading && !isDetailLoading && detailApiData && detailColumnInfo && levelStack.includes(-1) && (
                <div className="space-y-0">
                    <div className="text-sm text-gray-500 mb-2">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div className="flex flex-col gap-1">
                                <div className="text-lg font-semibold" style={{ color: colors.text }}>
                                    {detailColumnInfo.tabName}
                                </div>
                                <div className="text-xs text-gray-400">
                                    Viewing details for: {detailColumnInfo.columnKey} = {detailColumnInfo.rowData[detailColumnInfo.columnKey]}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-xs">
                                    Total Records: {detailApiData?.length || 0}
                                </div>
                                <button
                                    className="px-3 py-1 text-sm rounded hover:opacity-80 transition-opacity"
                                    style={{
                                        backgroundColor: colors.buttonBackground,
                                        color: colors.buttonText
                                    }}
                                    onClick={handleDetailTabClose}
                                >
                                    ← Back
                                </button>
                            </div>
                        </div>
                    </div>
                    <DataTable
                        data={detailApiData}
                        settings={{
                            ...safePageData.getCurrentLevel(currentLevel)?.settings,
                            mobileColumns: rs1Settings?.mobileColumns?.[0] || [],
                            tabletColumns: rs1Settings?.tabletColumns?.[0] || [],
                            webColumns: rs1Settings?.webColumns?.[0] || [],
                        }}
                        tableRef={tableRef}
                        fullHeight={true}
                        buttonConfig={pageData?.[0]?.buttonConfig}
                        pageData={pageData}
                        frozenColumns={frozenColumns}
                    />
                </div>
            )}

            {/* Main Data Display - only show when not viewing detail data */}
            {!isLoading && !isDetailLoading && !levelStack.includes(-1) && (
                componentType === 'import' ? (
                    // Show batch upload interface with records table for import type
                    <div className="space-y-4">
                        {/* Info Card at Top */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg" style={{
                            backgroundColor: colors.primary ? `${colors.primary}15` : '#eff6ff',
                        }}>
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-blue-900 mb-1">
                                        Automatic File Upload
                                    </h3>
                                    <p className="text-sm text-blue-800 mb-2">
                                        Files uploaded here will be automatically matched with the records shown below based on their filename.
                                        {apiData && apiData.length > 0 ? (
                                            <> Currently, <strong>{apiData.length} record(s)</strong> are available for automatic matching.</>
                                        ) : (
                                            <> No records available yet - files can still be uploaded manually.</>
                                        )}
                                    </p>
                                    <p className="text-xs text-blue-700">
                                        Supported formats: CSV, TXT, Excel (XLS, XLSX) • Max size: 3GB per file
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Upload Interface */}
                        <div className="p-6 border rounded-lg" style={{
                            backgroundColor: colors.cardBackground,
                            borderColor: '#e5e7eb'
                        }}>
                            <div className="mb-6">
                                <h2 className="text-2xl font-semibold mb-2" style={{ color: colors.text }}>
                                    {safePageData.getSetting('level') || 'Batch File Upload'}
                                </h2>
                                <p className="text-sm mb-4" style={{ color: colors.text, opacity: 0.7 }}>
                                    Upload multiple files simultaneously. Files will be automatically matched with records by filename.
                                </p>
                            </div>
                            <MultiFileUploadQueue
                                apiRecords={(apiData || []).filter((record: any) => {
                                    const recordId = String(record.FileName || record.FileSerialNo || record.id);
                                    return enabledFileRecords.has(recordId);
                                })}
                                allRecords={apiData || []}
                                filters={uploadFilters}
                                maxFileSize={3 * 1024 * 1024 * 1024}
                                allowedFileTypes={['csv', 'txt', 'xls', 'xlsx']}
                                onQueueUpdate={(stats) => {
                                    console.log('Queue stats:', stats);
                                    // Only refetch if we have new successful uploads
                                    const prevSuccess = (window as any).__prevUploadSuccess || 0;
                                    if (stats.success > prevSuccess && stats.success > 0) {
                                        (window as any).__prevUploadSuccess = stats.success;
                                        // Add a small delay and error handling
                                        setTimeout(() => {
                                            try {
                                                // Validate that all required data is available before fetching
                                                if (pageData && pageData.length > 0 && validationResult?.isValid) {
                                                    fetchData(filters, false);
                                                } else {
                                                    console.log('Skipping refetch: page configuration not ready yet');
                                                }
                                            } catch (err) {
                                                console.error('Error refetching data after upload:', err);
                                            }
                                        }, 500);
                                    }
                                }}
                            />
                        </div>

                        {/* Available Records Table */}
                        {apiData && apiData.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                                        Available File Records ({enabledFileRecords.size}/{apiData.length} enabled)
                                    </h3>
                                    <button
                                        onClick={() => handleToggleAllFileRecords(enabledFileRecords.size !== apiData.length)}
                                        className="px-3 py-1 text-sm rounded border"
                                        style={{
                                            backgroundColor: colors.cardBackground,
                                            borderColor: colors.primary,
                                            color: colors.primary
                                        }}
                                    >
                                        {enabledFileRecords.size === apiData.length ? 'Uncheck All' : 'Check All'}
                                    </button>
                                </div>

                                <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: colors.cardBackground }}>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead style={{ backgroundColor: colors.cardBackground, opacity: 0.9 }}>
                                                <tr>
                                                    <th className="px-4 py-3 text-left">
                                                        <input
                                                            type="checkbox"
                                                            checked={enabledFileRecords.size === apiData.length}
                                                            onChange={(e) => handleToggleAllFileRecords(e.target.checked)}
                                                            className="w-4 h-4 rounded"
                                                        />
                                                    </th>
                                                    {(() => {
                                                        const columns = rs1Settings?.webColumns?.[0] ||
                                                            (apiData[0] ? Object.keys(apiData[0]).filter(k => !k.startsWith('_')).map(k => ({ name: k, displayName: k })) : []);
                                                        return columns.map((col: any, idx: number) => (
                                                            <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                                                {col.displayName || col.name || col}
                                                            </th>
                                                        ));
                                                    })()}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {(searchTerm ? filteredApiData : apiData).map((record: any, rowIdx: number) => {
                                                    const recordId = String(record.FileName || record.FileSerialNo || record.id);
                                                    const isEnabled = enabledFileRecords.has(recordId);
                                                    const columns = rs1Settings?.webColumns?.[0] ||
                                                        Object.keys(record).filter(k => !k.startsWith('_')).map(k => ({ name: k }));

                                                    return (
                                                        <tr
                                                            key={rowIdx}
                                                            className="hover:bg-gray-50"
                                                            style={{ opacity: isEnabled ? 1 : 0.5 }}
                                                        >
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isEnabled}
                                                                    onChange={() => handleToggleFileRecord(record)}
                                                                    className="w-4 h-4 rounded"
                                                                />
                                                            </td>
                                                            {columns.map((col: any, colIdx: number) => (
                                                                <td key={colIdx} className="px-4 py-3 text-sm" style={{ color: colors.text }}>
                                                                    {record[col.name || col] || '-'}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (!apiData || apiData?.length === 0) && hasFetchAttempted ? (
                    <div className="flex items-center justify-center py-8 border rounded-lg" style={{
                        backgroundColor: colors.cardBackground,
                        borderColor: '#e5e7eb'
                    }}>
                        <div className="text-center">
                            <div className="text-lg font-medium mb-2" style={{ color: colors.text }}>No Records Found</div>
                            <div className="text-sm text-gray-500">
                                No data matches your current criteria. Try adjusting your filters or search terms.
                            </div>
                        </div>
                    </div>
                ) : apiData && (
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
                                        `Showing ${filteredApiData.length} of ${apiData?.length} records` :
                                        `Total Records: ${apiData?.length}`
                                    } | Response Time: {(apiResponseTime / 1000).toFixed(2)}s
                                </div>
                            </div>
                            {componentType === "tradesplit" ?
                                (<TradeSplit
                                    data={filteredApiData}
                                    settings={safePageData.getCurrentLevel(currentLevel)?.settings}
                                    filters={filters}
                                    isAutoWidth={isAutoWidth}
                                />) :
                                componentType === "multireport" ? (
                                    <MultiEntryDataTables
                                        data={filteredApiData}
                                        settings={safePageData.getCurrentLevel(currentLevel)?.settings}
                                    />
                                ) : (
                                    <>
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
                                                } : {}),
                                                ...(isAutoWidth ? { columnWidth: undefined, isAutoWidth: true } : {})
                                            }}
                                            summary={safePageData.getCurrentLevel(currentLevel)?.summary}
                                            onRowClick={handleRecordClick}
                                            onRowSelect={handleRowSelect}
                                            onSelectableButtonClick={handleSelectableButtonClick}
                                            tableRef={tableRef}
                                            isEntryForm={componentType === "entry" || componentType === "multientry"}
                                            handleAction={handleTableAction}
                                            fullHeight={Object.keys(additionalTables).length > 0 ? false : true}
                                            showViewDocument={safePageData.getCurrentLevel(currentLevel)?.settings?.ShowViewDocument}
                                            buttonConfig={pageData?.[0]?.buttonConfig}
                                            filtersCheck={filters}
                                            pageData={pageData}
                                            detailColumns={safePageData.getCurrentLevel(currentLevel)?.settings?.DetailColumn}
                                            onDetailColumnClick={handleDetailColumnClick}
                                            frozenColumns={frozenColumns}
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
                                                                    } : {}),
                                                                    ...(isAutoWidth ? { columnWidth: undefined, isAutoWidth: true } : {})
                                                                }}
                                                                summary={safePageData.getCurrentLevel(currentLevel)?.summary}
                                                                tableRef={tableRef}
                                                                fullHeight={false}
                                                                buttonConfig={pageData?.[0]?.buttonConfig}
                                                                filtersCheck={filters}
                                                                pageData={pageData}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                        </div>
                    </div>
                ))}


            {(componentType === 'entry' || componentType === "multientry") && safePageData.isValid && (
                <EntryFormModal
                    isOpen={isEntryModalOpen}
                    onClose={() => setIsEntryModalOpen(false)}
                    pageData={pageData}
                    editData={entryFormData}
                    action={entryAction}
                    pageName={OpenedPageName}
                    isTabs={componentType === "multientry" ? true : false}
                    setEntryEditData={setEntryFormData}
                    refreshFunction={() => {
                        // added extra parm if want to skip cache check  send second param as false
                        fetchData(filters, false);
                    }}
                />
            )}

        </div>
    );
};

export default DynamicReportComponent; 
