"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { selectAllMenuItems } from '@/redux/features/menuSlice';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import moment from 'moment';
import FilterModal from './FilterModal';
import { FaSync, FaFilter, FaDownload, FaFileCsv, FaFilePdf, FaFileExcel } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import DataTable, { exportTableToCsv, exportTableToExcel,exportTableToPdf } from './DataTable';
import { store } from "@/redux/store";
import { APP_METADATA_KEY } from "@/utils/constants";

// const { companyLogo, companyName } = useAppSelector((state) => state.common);

interface DynamicReportComponentProps {
    componentName: string;
}

const DynamicReportComponent: React.FC<DynamicReportComponentProps> = ({ componentName }) => {
    const menuItems = useAppSelector(selectAllMenuItems);
    const [currentLevel, setCurrentLevel] = useState(0);
    const [apiData, setApiData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [primaryKeyFilters, setPrimaryKeyFilters] = useState<Record<string, any>>({});
    const [rs1Settings, setRs1Settings] = useState<any>(null);
    const [jsonData, setJsonData] = useState<any>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ field: string; direction: string }>({
        field: '',
        direction: 'asc'
    });
    const [downloadFilters, setDownloadFilters] = useState<Record<string, any>>({});
    const [levelStack, setLevelStack] = useState<number[]>([0]); // Track navigation stack
    const [areFiltersInitialized, setAreFiltersInitialized] = useState(false);
    const [apiResponseTime, setApiResponseTime] = useState<number | undefined>(undefined);
    const [autoFetch, setAutoFetch] = useState<boolean>(true);

    const tableRef = useRef<HTMLDivElement>(null);
    const { colors, fonts } = useTheme();

    const appMetadata = (() => {
        try {
            return JSON.parse(localStorage.getItem(APP_METADATA_KEY))
        } catch (err) {
            return store.getState().common
        }
    })();


    const findPageData = () => {
        for (const item of menuItems) {
            if (item.componentName.toLowerCase() === componentName.toLowerCase() && item.pageData) {
                return item.pageData;
            }

            if (item.subItems) {
                for (const subItem of item.subItems) {
                    if (subItem.componentName.toLowerCase() === componentName.toLowerCase() && subItem.pageData) {
                        return subItem.pageData;
                    }
                }
            }
        }
        return null;
    };

    const pageData: any = findPageData();
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

    // Set autoFetch based on pageData
    useEffect(() => {
        if (pageData?.[0]?.autoFetch !== undefined) {
            const newAutoFetch = pageData[0].autoFetch === "true";
            setAutoFetch(newAutoFetch);
            // If autoFetch is false, we don't want to fetch data automatically
            if (!newAutoFetch) {
                return;
            }
            // Only fetch if autoFetch is true
            fetchData();
        }
    }, [pageData]);

    // Add new useEffect to handle level changes and manual fetching
    useEffect(() => {
        // If we're in a level > 0, we should always fetch data regardless of autoFetch
        if (currentLevel > 0) {
            console.log('Fetching data for level:', currentLevel);
            fetchData();
        }
        // If we're in level 0 and autoFetch is true, fetch data
        else if (autoFetch) {
            console.log('Auto-fetching data for level 0');
            fetchData();
        }
    }, [currentLevel, autoFetch]);

    const fetchData = async (currentFilters = filters) => {
        console.log('fetchData called for level:', currentLevel);
        console.log('AutoFetch value:', autoFetch);
        console.log('Primary key filters:', primaryKeyFilters);

        if (!pageData) return;

        setIsLoading(true);
        const startTime = performance.now();

        try {
            let filterXml = '';

            // Check if page has filters and if filters are initialized
            const hasFilters = pageData[0]?.filters?.length > 0;

            // Only process filters if the page has filter configuration and filters are initialized
            if (hasFilters && areFiltersInitialized) {
                Object.entries(currentFilters).forEach(([key, value]) => {
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
            }

            // Add primary key filters for levels > 0
            if (currentLevel > 0 && Object.keys(primaryKeyFilters).length > 0) {
                Object.entries(primaryKeyFilters).forEach(([key, value]) => {
                    filterXml += `<${key}>${value}</${key}>`;
                });
            }

            console.log('Final filter XML:', filterXml);
            console.log('Current Level:', currentLevel);
            console.log('Using J_Ui for level:', currentLevel);

            const xmlData = `<dsXml>
                <J_Ui>${JSON.stringify(pageData[0].levels[currentLevel].J_Ui).slice(1, -1)}</J_Ui>
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

            console.log('API Response:', response.data);
            setApiData(response.data.data.rs0);

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

                console.log('Settings JSON:', settingsJson);
                const json = convertXmlToJson(xmlString);
                setJsonData(json);
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
        console.log('Record clicked:', record);
        console.log('Current level:', currentLevel);
        console.log('Total levels:', pageData?.[0].levels.length);

        if (currentLevel < (pageData?.[0].levels.length || 0) - 1) {
            // Get primary key from the current level's primaryHeaderKey or fallback to rs1Settings
            const primaryKey = pageData[0].levels[currentLevel].primaryHeaderKey ||
                rs1Settings?.primaryKey ||
                'id';

            console.log('Primary key:', primaryKey);
            console.log('Record value:', record[primaryKey]);
            console.log('RS1 Settings:', rs1Settings);

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

    // Add useEffect to handle data fetching when level changes
    useEffect(() => {
        console.log('Level changed to:', currentLevel);
        console.log('Primary key filters:', primaryKeyFilters);

        // If we have page data, fetch for the current level
        if (pageData) {
            // Add a small delay to ensure state updates are complete
            const timer = setTimeout(() => {
                fetchData();
            }, 0);

            return () => clearTimeout(timer);
        }
    }, [currentLevel, primaryKeyFilters]);

    // Add handleTabClick function
    const handleTabClick = (level: number, index: number) => {
        console.log('Tab clicked - Level:', level, 'Index:', index);
        const newStack = levelStack.slice(0, index + 1);
        setLevelStack(newStack);

        // If going back to first level (index 0), clear primary key filters first
        if (index === 0) {
            console.log('Clearing primary key filters for first level');
            setPrimaryKeyFilters({});
        }

        // Set the current level after clearing filters
        setCurrentLevel(level);
    };

    // Modified filter change handler
    const handleFilterChange = (newFilters: Record<string, any>) => {
        setFilters(newFilters);
        fetchData(newFilters); // Call API with new filters
    };

    const handleDownloadFilterChange = (newFilters: Record<string, any>) => {
        if (JSON.stringify(downloadFilters) !== JSON.stringify(newFilters)) {
            setDownloadFilters(newFilters);
        }
    };

    // Modified filter initialization useEffect
    useEffect(() => {
        if (pageData?.[0]?.filters?.length > 0) {
            const defaultFilters: Record<string, any> = {};

            // Handle the nested array structure
            pageData[0].filters.forEach(filterGroup => {
                filterGroup.forEach(filter => {
                    if (filter.type === 'WDateRangeBox') {
                        const [fromKey, toKey] = filter.wKey;

                        if (filter.wValue && filter.wValue.length === 2) {
                            // Use pre-selected values if provided
                            defaultFilters[fromKey] = moment(filter.wValue[0], 'YYYYMMDD').toDate();
                            defaultFilters[toKey] = moment(filter.wValue[1], 'YYYYMMDD').toDate();
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
                });
            });

            setFilters(defaultFilters);
            setAreFiltersInitialized(true);
        } else {
            // No filters needed, mark as initialized
            setAreFiltersInitialized(true);
        }
    }, [pageData]);

    if (!pageData) {
        return <div>Loading report data...</div>;
    }

    return (
        <div className=""
            style={{
                fontFamily: `${fonts.content} !important`
            }}
        >
            {/* Tabs - Only show if there are multiple levels */}
            {pageData[0].levels.length > 1 && (
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
                                    ? pageData[0].level || 'Main'
                                    : pageData[0].levels[level].name
                                }
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="p-2 rounded"
                            onClick={() => exportTableToExcel(tableRef.current, jsonData, apiData, pageData, appMetadata)}
                            style={{ color: colors.text }}
                        >
                            <FaFileExcel size={20} />
                        </button>
                        <button
                            className="p-2 rounded"
                            onClick={() => exportTableToCsv(tableRef.current, jsonData, apiData, pageData)}
                            style={{ color: colors.text }}
                        >
                            <FaFileCsv size={20} />
                        </button>
                        <button
                            className="p-2 rounded"
                            onClick={() => exportTableToPdf(tableRef.current, jsonData, appMetadata, apiData, pageData)}
                            style={{ color: colors.text }}
                        >
                            <FaFilePdf size={20} />
                        </button>

                        <button
                            className="p-2 rounded"
                            onClick={() => fetchData()}
                            style={{ color: colors.text }}
                        >
                            <FaSync size={20} />
                        </button>
                        {/* {pageData[0].filters && pageData[0].filters.length > 0 && (
                            <button
                                className="p-2 rounded"
                                onClick={() => exportTableToCsv(tableRef.current, jsonData, apiData, pageData)}
                                style={{ color: colors.text }}
                            >
                                <FaFileCsv size={20} />
                            </button>
                            <button
                                className="p-2 rounded"
                                onClick={() => exportTableToPdf(tableRef.current)}
                                style={{ color: colors.text }}
                            >
                                <FaFilePdf size={20} />
                            </button>
                            <button
                                className="p-2 rounded"
                                onClick={() => fetchData()}
                                style={{ color: colors.text }}
                            >
                                <FaSync size={20} />
                            </button> */}

                        {pageData[0].filters && pageData[0].filters.length > 0 && (
                            <button
                                className="p-2 rounded"
                                onClick={() => setIsFilterModalOpen(true)}
                                style={{ color: colors.text }}
                            >
                                <FaFilter size={20} />
                            </button>
                        )}
                        {/* </div> */}
                    </div>
                </div>
            )}

            {/* Filter Modals */}
            <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                title="Filters"
                filters={pageData[0].filters || [[]]}
                onFilterChange={handleFilterChange}
                initialValues={filters}
                sortableFields={apiData ? Object.keys(apiData[0] || {}).map(key => ({
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                    value: key
                })) : []}
                currentSort={sortConfig}
                onSortChange={setSortConfig}
                isSortingAllowed={pageData[0].isShortAble !== "false"}
                onApply={() => { }}
            />

            {/* Download Modal */}
            <FilterModal
                isOpen={isDownloadModalOpen}
                onClose={() => setIsDownloadModalOpen(false)}
                title="Download Options"
                filters={pageData[0].downloadFilters || []}
                onFilterChange={handleDownloadFilterChange}
                initialValues={downloadFilters}
                isDownload={true}
                onApply={() => { }}
            />

            {/* Loading State */}
            {isLoading && <div>Loading...</div>}

            {/* Data Display */}
            {!isLoading && apiData && (
                <div className="space-y-0">
                    <div className="text-sm text-gray-500">
                        <div className="flex flex-col sm:flex-row justify-between">
                            <div className="flex flex-wrap gap-2 my-1">
                                {jsonData?.Headings?.map((headingObj, index) => (
                                    <div key={index} className="flex flex-wrap gap-2 my-1">
                                        {headingObj?.Heading?.map((headingText, i) => (
                                            <span
                                                key={i}
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                                style={{
                                                    backgroundColor: colors.cardBackground,
                                                    color: colors.text
                                                }}
                                            >
                                                {headingText}
                                            </span>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <div className="text-xs">Total Records: {apiData.length} | Response Time: {(apiResponseTime / 1000).toFixed(2)}s</div>
                        </div>
                    </div>
                    <DataTable
                        data={apiData}
                        settings={{
                            ...pageData[0].levels[currentLevel].settings,
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
                        summary={pageData[0].levels[currentLevel].summary}
                        onRowClick={handleRecordClick}
                        tableRef={tableRef}
                    />
                </div>
            )}
        </div>
    );
};

export default DynamicReportComponent; 