"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { selectAllMenuItems } from '@/redux/features/menuSlice';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import moment from 'moment';
import FilterModal from './FilterModal';
import { FaSync, FaFilter, FaDownload, FaFileCsv, FaFilePdf } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import DataTable, { exportTableToCsv, exportTableToPdf } from './DataTable';

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
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ field: string; direction: string }>({
        field: '',
        direction: 'asc'
    });
    const [downloadFilters, setDownloadFilters] = useState<Record<string, any>>({});
    const [levelStack, setLevelStack] = useState<number[]>([0]); // Track navigation stack
    const [areFiltersInitialized, setAreFiltersInitialized] = useState(false);

    const tableRef = useRef<HTMLDivElement>(null);
    const { colors } = useTheme();

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
    console.log('pageData', pageData);
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

    const fetchData = async (currentFilters = filters) => {
        if (!pageData) return;

        setIsLoading(true);
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
            if (currentLevel > 0) {
                Object.entries(primaryKeyFilters).forEach(([key, value]) => {
                    filterXml += `<${key}>${value}</${key}>`;
                });
            }

            console.log('Final filter XML:', filterXml);
            console.log('Has Filters:', hasFilters);
            console.log('Filters Initialized:', areFiltersInitialized);
            console.log('Current Filters:', currentFilters);

            const xmlData = `<dsXml>
                <J_Ui>${JSON.stringify(pageData[0].levels[currentLevel].J_Ui).slice(1, -1)}</J_Ui>
                <Sql>${pageData[0].Sql || ''}</Sql>
                <X_Filter>${filterXml}</X_Filter>
                <X_GFilter></X_GFilter>
                <J_Api>"UserId":"${localStorage.getItem('userId')}", "UserType":"${localStorage.getItem('userType')}"</J_Api>
            </dsXml>`;

            console.log('Request XML:', xmlData);

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                },
                timeout: 50000
            });

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

                setRs1Settings(settingsJson);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            if (error.response?.data) {
                console.error('Error response data:', error.response.data);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Modify handleRecordClick
    const handleRecordClick = (record: any) => {
        console.log('Record clicked:', record);

        if (currentLevel < (pageData?.[0].levels.length || 0) - 1) {
            // Get primary key from the current level's primaryHeaderKey or fallback to rs1Settings
            const primaryKey = pageData[0].levels[currentLevel].primaryHeaderKey ||
                rs1Settings?.primaryKey ||
                'id';

            console.log('Primary key:', primaryKey);
            console.log('Record value:', record[primaryKey]);

            // Set primary key filters based on the clicked record
            setPrimaryKeyFilters(prev => {
                const newFilters = {
                    ...prev,
                    [primaryKey]: record[primaryKey]
                };
                console.log('New primary key filters:', newFilters);
                return newFilters;
            });

            // Update level stack and current level
            const nextLevel = currentLevel + 1;
            setLevelStack([...levelStack, nextLevel]);
            setCurrentLevel(nextLevel);
        }
    };

    // Add handleTabClick function
    const handleTabClick = (level: number, index: number) => {
        const newStack = levelStack.slice(0, index + 1);
        setLevelStack(newStack);
        setCurrentLevel(level);
        if (index === 0) {
            setPrimaryKeyFilters({});
        }
    };

    // Modified filter change handler
    const handleFilterChange = (newFilters: Record<string, any>) => {
        console.log('New filters received from modal:', newFilters);
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

            console.log('Setting default filters:', defaultFilters);
            setFilters(defaultFilters);
            setAreFiltersInitialized(true);
        } else {
            // No filters needed, mark as initialized
            setAreFiltersInitialized(true);
        }
    }, [pageData]);

    // Modified initial data fetch useEffect
    useEffect(() => {
        if (pageData && areFiltersInitialized) {
            // If page has filters, use the initialized filters
            // If no filters, just fetch the data
            fetchData();
        }
    }, [currentLevel, pageData, areFiltersInitialized]); // Added areFiltersInitialized dependency

    if (!pageData) {
        return <div>Loading report data...</div>;
    }

    return (
        <div className="">
            {/* Tabs - Only show if there are multiple levels */}
            {pageData[0].levels.length > 1 && (
                <div className="flex mb-4 border-b border-gray-200">
                    <div className="flex flex-1 gap-2">
                        {levelStack.map((level, index) => (
                            <button
                                key={index}
                                style={{ backgroundColor: colors.cardBackground }}
                                className={`px-4 py-2 text-sm rounded-t-lg ${currentLevel === level
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
                    <div
                        style={{ backgroundColor: colors.cardBackground }}
                        className={`px-2 py-1 text-sm rounded-t-lg`}>
                        <div className="flex gap-2">
                            <button
                                className="p-2 rounded"
                                onClick={() => fetchData()}
                                style={{ color: colors.text }}
                            >
                                <FaSync size={20} />
                            </button>
                            {pageData[0].filters && pageData[0].filters.length > 0 && (
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
                onApply={() => { }} // Empty function since we don't need it anymore
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
                <div className="space-y-4">
                    <DataTable
                        data={apiData}
                        settings={pageData[0].levels[currentLevel].settings}
                        onRowClick={handleRecordClick}
                        tableRef={tableRef}
                    />
                </div>
            )}
        </div>
    );
};

export default DynamicReportComponent; 