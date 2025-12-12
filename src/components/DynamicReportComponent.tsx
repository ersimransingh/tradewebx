"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { selectAllMenuItems } from '@/redux/features/menuSlice';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import moment from 'moment';
import FilterModal from './FilterModal';
import { FaSync, FaFilter, FaDownload, FaFileCsv, FaFilePdf, FaPlus, FaEdit, FaFileExcel, FaEnvelope, FaSearch, FaTimes, FaEllipsisV, FaRegEnvelope, FaArrowsAltH } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import DataTable, { exportTableToCsv, exportTableToPdf, exportTableToExcel, downloadOption } from './DataTable';
import { store } from "@/redux/store";
import { APP_METADATA_KEY } from "@/utils/constants";
import { useSearchParams } from 'next/navigation';
import EntryFormModal from './EntryFormModal';
import ConfirmationModal from './Modals/ConfirmationModal';
import { parseStringPromise } from 'xml2js';
import CaseConfirmationModal from './Modals/CaseConfirmationModal';
import ErrorModal from './Modals/ErrorModal';
import EditTableRowModal from './EditTableRowModal';
import FormCreator from './FormCreator';
import Loader from './Loader';
import apiService from '@/utils/apiService';
import { decryptData, getLocalStorage, parseSettingsFromXml } from '@/utils/helper';
import { toast } from "react-toastify";

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
const safePageDataAccess = (pageData: any, validationResult: PageDataValidationResult | null, dynamicLevels: any[] = []) => {
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
    const allLevels = [...(config.levels || []), ...dynamicLevels];

    return {
        config,
        isValid: true,
        getCurrentLevel: (currentLevel: number) => {
            if (!allLevels || !Array.isArray(allLevels) || currentLevel >= allLevels.length) {
                return null;
            }
            return allLevels[currentLevel];
        },
        hasFilters: () => {
            return config.filters && Array.isArray(config.filters) && config.filters.length > 0;
        },
        getLevels: () => {
            return allLevels;
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
    const menuItems = useAppSelector(selectAllMenuItems);
    const searchParams = useSearchParams();
    const clientCodeParam = searchParams.get('clientCode');
    const clientCode = clientCodeParam ? decryptData(clientCodeParam) : null;
    const [currentLevel, setCurrentLevel] = useState(0);
    const [dynamicLevels, setDynamicLevels] = useState<any[]>([]);
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

    // Add validation state
    const [validationResult, setValidationResult] = useState<PageDataValidationResult | null>(null);
    const [showValidationDetails, setShowValidationDetails] = useState(false);
    const [announceMsg, setAnnounceMsg] = useState("");

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

    // Safe access to pageData properties with validation
    const safePageData = safePageDataAccess(pageData, validationResult, dynamicLevels);

    // Create merged page data for DataTable to support dynamic levels in exports
    const mergedPageData = React.useMemo(() => {
        if (!pageData?.[0]) return pageData;
        return [{
            ...pageData[0],
            levels: [...(pageData[0].levels || []), ...dynamicLevels]
        }];
    }, [pageData, dynamicLevels]);

    const showTypeList = safePageData.getSetting('levels.0.settings.showTypstFlag') || false;
    const showFilterHorizontally = safePageData.getSetting('filterType') === "onPage";

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
    
    // Trigger fetch when currentLevel or related dependencies change
    useEffect(() => {
        if (!areFiltersInitialized) return;

        if (currentLevel > 0) {
             console.warn('▶️ Fetching data for level:', currentLevel);
             fetchData();
        } else if (currentLevel === 0 && hasFetchedRef.current) {
             console.warn('▶️ Refreshing main level data (Using Cache)');
             // Use cache if available (true), otherwise fetch
             fetchData(undefined, true);
        }
    }, [currentLevel, primaryKeyFilters, areFiltersInitialized]);


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

                // Initial fetch logic
                if (clientCode) {
                    } else if (!newAutoFetch && hasFilters) {
                    // Only skip fetch if autoFetch is false AND there are filters to configure
                    return;
                }
                
                if (!hasFetchedRef.current && areFiltersInitialized) {
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
        // We need to check against ALL levels (static + dynamic)
        const allLevels = [...(pageData[0].levels || []), ...dynamicLevels];

        if (!allLevels || !Array.isArray(allLevels) ||
            currentLevel >= allLevels.length || !allLevels[currentLevel]) {
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
            const allLevels = [...(pageData[0].levels || []), ...dynamicLevels];
            const currentLevelConfig = allLevels[currentLevel];
            
            if (!currentLevelConfig) {
                 console.error('Invalid level configuration in fetchData', currentLevel);
                 setIsLoading(false);
                 return;
            }

            // Determine the configuration source (handle nested dsXml if present)
            const configSource = currentLevelConfig?.dsXml || currentLevelConfig || {};

            let jUiData = configSource.J_Ui;
            
            // Fallback for Level 0: Use MasterEntry J_Ui if not defined in level config
            if (!jUiData && currentLevel === 0) {
                console.warn("⚠️ Level 0 J_Ui missing, using MasterEntry fallback");
                jUiData = pageData[0]?.Entry?.MasterEntry?.J_Ui;
            }
            
            jUiData = jUiData || {};
            
            console.log("✅ Final J_Ui Data:", jUiData);

            const sqlQuery = configSource.Sql || pageData[0].Sql || '';

            // Construct J_Api
            let jApiStr = `"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"`;
            
            if (configSource.J_Api && typeof configSource.J_Api === 'object') {
                 // Replace placeholders like <<USERID>>
                 const apiConfig = JSON.parse(JSON.stringify(configSource.J_Api)); // clone
                 
                 Object.keys(apiConfig).forEach(key => {
                     if (apiConfig[key] === '<<USERID>>') {
                         apiConfig[key] = getLocalStorage('userId');
                     }
                     // Add other replacements if needed
                 });

                 const configJApi = JSON.stringify(apiConfig).slice(1, -1);
                 jApiStr = `${configJApi}`;  
                }

            const xmlData = `<dsXml>
                <J_Ui>${JSON.stringify(jUiData).slice(1, -1)}</J_Ui>
                <Sql>${sqlQuery}</Sql>
                <X_Filter>${filterXml}</X_Filter>
                <X_GFilter></X_GFilter>
                <J_Api>${jApiStr}</J_Api>
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

            if (response?.data?.data?.rs1?.[0]) {
                 console.log("🔍 RS1 RAW:", response.data.data.rs1[0]);
            }

            if (response?.data?.data?.rs1?.[0]?.Settings) {
                const xmlString = response?.data?.data?.rs1[0].Settings;
                parsedRs1Settings = parseSettingsFromXml(xmlString);

                parsedJsonData = convertXmlToJson(xmlString);
                parsedJsonUpdated = await convertXmlToJsonUpdated(xmlString);
            }
            
            setJsonData(parsedJsonData);
            setJsonDataUpdated(parsedJsonUpdated);
            setRs1Settings(parsedRs1Settings);

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
            hasFetchedRef.current = true;

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
        // If going back to first level (index 0), perform full reset
        if (index === 0) {
            console.log("🔄 Resetting to Main Tab (Level 0)");
            
            // 1. Reset Navigation State
            setLevelStack([0]);
            setCurrentLevel(0);
            setDynamicLevels([]); // Clear dynamic detail levels
            
            // 2. Clear Data State to ensure clean slate
            setApiData(null); // Show loading/empty
            setJsonData(null);
            setRs1Settings(null); // Clear dynamic columns
            setAdditionalTables({});
            setApiResponseTime(undefined);
            
            // 3. Clear Detail Filters (keep main filters)
            setPrimaryKeyFilters({});

            // 4. Force Fresh Fetch
            // We set hasFetchedRef to true to allow useEffect to trigger.
            // We DO NOT call fetchData() here directly, because standard state updates are async/batched.
            // Calling it here would use the OLD currentLevel (e.g. 1), ensuring a wrong API call.
            // valid useEffect will trigger once currentLevel becomes 0.
            hasFetchedRef.current = true; 
            
            return;
        }

        // Standard navigation for other levels
        const newStack = levelStack.slice(0, index + 1);
        setLevelStack(newStack);
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
                fetchData(filters,false);
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

        const filtered = apiData.filter((row: any) => {
            return Object.values(row).some((value: any) => {
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(searchTerm.toLowerCase());
            });
        });

        setFilteredApiData(filtered);
    }, [apiData, searchTerm]);

    const handleDetailClick = (detailConfig: any, rowData: any) => {
        try {
            if (!detailConfig?.DetailAPI) {
                console.warn("No DetailAPI configuration found");
                return;
            }

            // Clone the DetailAPI config
            const newLevelConfig = JSON.parse(JSON.stringify(detailConfig.DetailAPI));
            
            const configSource = newLevelConfig.dsXml || newLevelConfig || {};
            
            // Check X_Filter for dynamic fields (User removed X_Filter_Multiple requirement)
            let xFilter = configSource.X_Filter || {};

            // If string, try JSON parsing
            if (typeof xFilter === 'string') {
                try { xFilter = JSON.parse(xFilter); } catch (e) {
                    console.warn("Failed to parse X_Filter string", e);
                }
            }
            
            const newFilters: Record<string, any> = {};

            if (xFilter && typeof xFilter === 'object') {
                Object.entries(xFilter).forEach(([key, value]) => {
                     let resolvedValue = value;
                     if (typeof value === 'string' && value.startsWith('##') && value.endsWith('##')) {
                         const fieldName = value.replace(/##/g, '');
                         
                         // Check Row Data first
                         if (rowData && rowData[fieldName] !== undefined) {
                             resolvedValue = rowData[fieldName];
                         } 
                         // Check Global Filters second
                         else if (filters && filters[fieldName] !== undefined) {
                             resolvedValue = filters[fieldName];
                         }
                     }
                     newFilters[key] = resolvedValue;
                });
                
                // Update primary key filters with resolved values
                setPrimaryKeyFilters(prev => ({ ...prev, ...newFilters }));
            }
            
            // Generate Dynamic Tab Name
            let tabName = "Detail View";
            const firstFilterKey = Object.keys(newFilters)[0];
            if (firstFilterKey) {
                const val = newFilters[firstFilterKey];
                tabName = `${firstFilterKey} (${val})`;
            }
            
            // Add new level and navigate
            setDynamicLevels(prev => [...prev, { ...newLevelConfig, name: tabName }]);
            
            const nextLevel = (pageData[0].levels?.length || 0) + dynamicLevels.length;
            
            setLevelStack(prev => [...prev, nextLevel]);
            setCurrentLevel(nextLevel);    
            
        } catch (error) {
            console.error("Error in handleDetailClick:", error);
            // toast.error("An error occurred while opening details.");
        }
    };
    


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
                                className={`px-4 py-2 text-sm rounded-t-lg font-bold transition-all duration-200 ${currentLevel === level
                                    ? `bg-${colors.primary} text-${colors.buttonText} border-2 border-black`
                                    : `bg-${colors.tabBackground} text-${colors.tabText} hover:bg-gray-100`
                                    }`}
                                onClick={() => handleTabClick(level, index)}
                            >
                                {level === 0
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
                                                        exportTableToExcel(tableRef.current, jsonData, apiData, mergedPageData, appMetadata, currentLevel);
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
                                                        setPdfParams([tableRef.current, jsonData, appMetadata, apiData, mergedPageData, filters, currentLevel, 'email']);
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
                                                        downloadOption(jsonData, appMetadata, apiData, mergedPageData, filters, currentLevel);
                                                        setIsMobileMenuOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                                    style={{ color: colors.text }}
                                                    aria-label="Download Options"
                                                >
                                                    <FaDownload size={16} />
                                                    Download Options
                                                </button>
                                            )}
                                            {Object.keys(additionalTables).length == 0 && (
                                                <>
                                                    {isMasterButtonEnabled('CSV') && (
                                                        <button
                                                            onClick={() => {
                                                                exportTableToCsv(tableRef.current, jsonData, apiData, mergedPageData, currentLevel);
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
                                                    {isMasterButtonEnabled('PDF') && (
                                                        <button
                                                            onClick={() => {
                                                                exportTableToPdf(tableRef.current, jsonData, appMetadata, apiData, mergedPageData, filters, currentLevel, 'download');
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
                            {isMasterButtonEnabled('Excel') && (
                                <div className="relative group">
                                    {/* <button
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        onClick={() => exportTableToExcel(tableRef.current, jsonData, apiData, pageData, appMetadata)}
                                        style={{ color: colors.text }}
                                    >
                                        <FaFileExcel size={20} />
                                    </button> */}
                                    <button
                                        onClick={() => {
                                            if (apiData?.length > 25000) {
                                                toast.warning(`Excel export allowed up to 25,000 records. You have ${apiData?.length} records.`);
                                                return; // stop here, don't export
                                            }
                                            exportTableToExcel(tableRef.current, jsonData, apiData, mergedPageData, appMetadata, currentLevel);
                                        }}
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        style={{ color: colors.text }}
                                        aria-label="Export Excel"
                                    >
                                        <FaFileExcel size={20} />
                                    </button>


                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                        Export to Excel
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                    </div>
                                </div>
                            )}
                            {isMasterButtonEnabled('Email') && (
                                <div className="relative group">
                                    <button
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        onClick={() => {
                                            setPdfParams([tableRef.current, jsonData, appMetadata, apiData, mergedPageData, filters, currentLevel, 'email']);
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

                            {isMasterButtonEnabled('ExportEmail') && (
                                <div className="relative group">
                                    <button
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        onClick={() => {
                                            setPdfParams([tableRef.current, jsonData, appMetadata, apiData, mergedPageData, filters, currentLevel, 'email']);
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
                                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                                        onClick={() => downloadOption(jsonData, appMetadata, apiData, mergedPageData, filters, currentLevel)}
                                        style={{ color: colors.text }}
                                        aria-label="Download Options"
                                    >
                                        <FaDownload size={20} />
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
                                                onClick={() => exportTableToCsv(tableRef.current, jsonData, apiData, mergedPageData, currentLevel)}
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

                                    {isMasterButtonEnabled('PDF') && (
                                        <div className="relative group">
                                            {/* <button
                                                className="p-2 rounded hover:bg-gray-100 transition-colors"
                                                onClick={() => exportTableToPdf(tableRef.current, jsonData, appMetadata, apiData, pageData, filters, currentLevel, 'download')}
                                                style={{ color: colors.text }}
                                            >
                                                <FaFilePdf size={20} />
                                            </button> */}
                                            <button
                                                onClick={() => {
                                                    if (apiData?.length > 8000) {
                                                        toast.warning(`PDF export allowed up to 8,000 records. You have ${apiData?.length} records.`);
                                                        return; // stop here
                                                    }
                                                    exportTableToPdf(tableRef.current, jsonData, appMetadata, apiData, mergedPageData, filters, currentLevel, 'download'
                                                    );
                                                }}
                                                className="p-2 rounded transition-colors flex items-center hover:bg-gray-100"
                                                style={{ color: colors.text }}
                                                aria-label="Export to PDF"
                                            >
                                                <FaFilePdf size={20} />
                                            </button>
                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                                                Export to PDF
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                                            </div>
                                        </div>
                                    )}
                                </>
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
                    fetchData(filters,false);
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
            {isLoading &&
                <div className="flex inset-0 flex items-center justify-center z-[200] h-[100vh]">
                    <Loader />
                </div>
            }

            {/* Data Display */}
            {!isLoading && (
                (!apiData || apiData?.length === 0) && hasFetchAttempted ? (
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
                        </div>
                        <DataTable
                            data={filteredApiData}
                            settings={{
                                // 1. Base Settings from Root (Level 0 fallback)
                                ...(currentLevel === 0 ? {
                                    mobileColumns: pageData[0]?.mobileColumns,
                                    tabletColumns: pageData[0]?.tabletColumns,
                                    webColumns: pageData[0]?.webColumns,
                                } : {}),

                                // 2. Level-Specific Settings (overrides root)
                                ...safePageData.getCurrentLevel(currentLevel)?.settings,

                                // 3. Dynamic API Settings (overrides static)
                                ...(rs1Settings?.mobileColumns?.[0] ? { mobileColumns: rs1Settings.mobileColumns[0] } : {}),
                                ...(rs1Settings?.tabletColumns?.[0] ? { tabletColumns: rs1Settings.tabletColumns[0] } : {}),
                                ...(rs1Settings?.webColumns?.[0] ? { webColumns: rs1Settings.webColumns[0] } : {}),
                                
                                
                                // Clean up any duplicate keys if strictly needed, but object spread handles it (last wins)
                                ...(isAutoWidth ? { columnWidth: undefined, isAutoWidth: true } : {})
                            }}
                            summary={safePageData.getCurrentLevel(currentLevel)?.summary}
                            onRowClick={handleRecordClick}
                            onDetailClick={handleDetailClick}
                            onRowSelect={handleRowSelect}
                            tableRef={tableRef}
                            isEntryForm={componentType === "entry" || componentType === "multientry"}
                            handleAction={handleTableAction}
                            fullHeight={Object.keys(additionalTables).length > 0 ? false : true}
                            showViewDocument={safePageData.getCurrentLevel(currentLevel)?.settings?.ShowViewDocument}
                            buttonConfig={pageData?.[0]?.buttonConfig}
                            filtersCheck = {filters}
                            pageData={mergedPageData}
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
                                                filtersCheck = {filters}
                                                pageData={mergedPageData}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
                        fetchData(filters,false);
                    }}
                />
            )}
        </div>
    );
};

export default DynamicReportComponent; 