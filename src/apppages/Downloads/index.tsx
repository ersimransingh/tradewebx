"use client";
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useSelector } from 'react-redux';
import axios from 'axios';
import moment from 'moment';
import DataTable from '@/components/DataTable';
import { ACTION_NAME, BASE_URL, PATH_URL } from '@/utils/constants';
import { RootState } from '@/redux/store';
import FilterModal from '@/components/FilterModal';
import { FaFilter, FaSync } from 'react-icons/fa';
import apiService from '@/utils/apiService';

const Downloads = () => {
    const [downloads, setDownloads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);
    const [filterValues, setFilterValues] = useState({
        fromDate: moment().subtract(1, 'month').format('YYYY-MM-DD'),
        toDate: moment().format('YYYY-MM-DD'),
        segment: 'Equity/Derivative',
        DocumentType: ''
    });
    const [headings, setHeadings] = useState([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [apiResponseTime, setApiResponseTime] = useState<number | undefined>(undefined);

    const { colors, fonts } = useTheme();
    const userData = useSelector((state: RootState) => state.auth);
    // console.log('userData', userData);
    const getDownloads = async (isReload = false, values?: any) => {
        if (isReload) {
            setLoading(true);
        }
        // console.log('filterValues', filterValues);
        const filterValuesLocal = values || filterValues;
        const startTime = performance.now();

        const fromDateStr = moment(filterValuesLocal.fromDate).format('YYYYMMDD');
        const toDateStr = moment(filterValuesLocal.toDate).format('YYYYMMDD');

        const xmlData = `<dsXml>
            <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"Download","Level":1, "RequestFrom":"M"</J_Ui>
            <Sql></Sql>
            <X_Filter>
                <FromDate>${fromDateStr}</FromDate>
                <ToDate>${toDateStr}</ToDate>
                <RepType></RepType>
                <DocumentType>${filterValuesLocal.DocumentType || ''}</DocumentType>
                <DocumentNo></DocumentNo>
                <Segment>${filterValuesLocal.segment}</Segment>
            </X_Filter>
            <X_GFilter></X_GFilter>
            <J_Api>"UserId":"${userData.userId}", "UserType":"${userData.userType}"</J_Api>
        </dsXml>`;

        try {
            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            const endTime = performance.now();
            setApiResponseTime(Math.round(endTime - startTime));

            if (response.data?.datarows.length == 0) {
                setDownloads([])
            }
            if (response.data?.data?.rs0) {
                setDownloads(response.data.data.rs0);
            }

            // Parse headings from RS1 if available
            if (response.data.data.rs1?.[0]?.Settings) {
                const xmlString = response.data.data.rs1[0].Settings;
                const headingsRegex = /<Heading>([^<]*)<\/Heading>/g;
                const extractedHeadings = [];
                let match;
                while ((match = headingsRegex.exec(xmlString)) !== null) {
                    extractedHeadings.push(match[1]);
                }
                setHeadings(extractedHeadings);
            }
        } catch (error) {
            console.error('Error fetching downloads:', error);
            setApiResponseTime(undefined);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getDownloads(true);
    }, []);



    const handleDownload = async (record) => {
        const fromDateStr = moment(filterValues.fromDate).format('YYYYMMDD');
        const toDateStr = moment(filterValues.toDate).format('YYYYMMDD');

        const xmlData = `<dsXml>
            <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"Download","Level":1, "RequestFrom":"M"</J_Ui>
            <Sql></Sql>
            <X_Filter>
                <FromDate>${fromDateStr}</FromDate>
                <ToDate>${toDateStr}</ToDate>
                <RepType></RepType>
                <DocumentType></DocumentType>
                <DocumentNo>${record['Document No']}</DocumentNo>
            </X_Filter>
            <X_GFilter></X_GFilter>
            <J_Api>"UserId":"${userData.userId}", "UserType":"${userData.userType}"</J_Api>
        </dsXml>`;

        try {
            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            const fileData = response.data.data.rs0[0];
            if (fileData?.Base64) {
                const base64Data = fileData.Base64;
                const fileName = fileData.FileName.split('\\').pop();

                // Create and download file
                const link = document.createElement('a');
                link.href = `data:application/octet-stream;base64,${base64Data}`;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Error downloading document:', error);
        }
    };

    const handleFilterChange = (values) => {
        console.log('values', values);
        // Format dates if they are in ISO format
        const formattedValues = {
            ...values,
            fromDate: values.fromDate ? moment(values.fromDate).format('YYYY-MM-DD') : values.fromDate,
            toDate: values.toDate ? moment(values.toDate).format('YYYY-MM-DD') : values.toDate
        };
        handleApplyFilters(formattedValues);
        setFilterValues(formattedValues);
    };

    const handleApplyFilters = (values?: any) => {
        console.log('values FOR FILTER', values);
        // setFilterValues(values);
        setTimeout(() => {
            getDownloads(true, values);
        }, 300);
    };

    // Define filter fields for the FilterModal
    const filterFields = [
        [
            {
                type: 'WDateBox',
                label: 'From Date',
                wKey: 'fromDate',
                value: filterValues.fromDate
            },
            {
                type: 'WDateBox',
                label: 'To Date',
                wKey: 'toDate',
                value: filterValues.toDate
            }
        ],
        [
            {
                type: 'WDropDownBox',
                label: 'Segment',
                wKey: 'segment',
                value: filterValues.segment,
                options: [
                    { label: 'Equity/Derivative', value: 'Equity/Derivative' },
                    { label: 'Commodity', value: 'Commodity' }
                ]
            },
            {
                Srno: 4,
                type: 'WDropDownBox',
                label: 'DocumentType',
                wKey: 'DocumentType',
                wQuery: {
                    Sql: "",
                    J_Ui: {
                        ActionName: "Download",
                        Option: "DocumentType",
                        RequestFrom: "W"
                    },
                    X_Filter: "${value}",
                    J_Api: {
                        UserId: "ADMIN",
                        AccYear: 24,
                        MyDbPrefix: "SVVS",
                        MemberCode: "undefined",
                        SecretKey: "undefined",
                        MenuCode: 7
                    }
                },
                wDropDownKey: {
                    key: "DisplayName",
                    value: "Value"
                }
            }
        ]
    ];

    return (
        <div className="px-1">
            {/* Tabs Section */}
            <div className="flex border-b border-gray-200">
                <div className="flex flex-1 gap-2">
                    <button
                        style={{ backgroundColor: colors.cardBackground }}
                        className={`px-4 py-2 text-sm rounded-t-lg font-bold bg-${colors.primary} text-${colors.buttonText}`}
                    >
                        Downloads
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        className="p-2 rounded"
                        onClick={() => getDownloads(true)}
                        disabled={loading}
                        style={{ color: colors.text }}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-t-transparent border-primary rounded-full animate-spin" />
                        ) : (
                            <FaSync size={20} />
                        )}
                    </button>
                    <button
                        className="p-2 rounded"
                        onClick={() => setFilterModalVisible(true)}
                        style={{ color: colors.text }}
                    >
                        <FaFilter size={20} />
                    </button>
                </div>
            </div>

            {/* Headings Section */}
            {headings.length > 0 && (
                <div className="mb-0">
                    {headings.map((heading, index) => (
                        <div key={index} className="text-sm" style={{ color: colors.text }}>
                            {heading}
                        </div>
                    ))}
                </div>
            )}

            {/* Records Info */}
            <div className="text-sm text-gray-500 mb-0">
                <div className="flex flex-col sm:flex-row justify-between">
                    <div className="flex flex-col gap-2 my-1">
                        <div className="flex flex-row">
                            {/* Headings */}
                            <div className="flex flex-wrap gap-2 ">
                                {headings.map((heading, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                            backgroundColor: colors.cardBackground,
                                            color: colors.text
                                        }}
                                    >
                                        {heading}
                                    </span>
                                ))}
                            </div>
                            {/* Selected Filters */}
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(filterValues).map(([key, value]) => {
                                    if (!value || value === '') return null;

                                    let displayValue = value;
                                    if (key === 'fromDate' || key === 'toDate') {
                                        displayValue = moment(value).format('DD-MMM-YYYY');
                                    }

                                    return (
                                        <span
                                            key={key}
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                            style={{
                                                backgroundColor: colors.cardBackground,
                                                color: colors.text
                                            }}
                                        >
                                            {key === 'fromDate' ? 'From' :
                                                key === 'toDate' ? 'To' :
                                                    key === 'DocumentType' ? 'Document Type' :
                                                        key.charAt(0).toUpperCase() + key.slice(1)}: {displayValue}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="text-xs">Total Records: {downloads.length} | Response Time: {(apiResponseTime / 1000).toFixed(2)}s</div>
                </div>
            </div>

            {/* Data Table */}
            <DataTable
                data={downloads}
                onRowClick={handleDownload}
                settings={{
                    dateFormat: {
                        key: 'Document Date',
                        format: 'DD-MMM-YYYY'
                    }
                }}
            />

            {/* Filter Modal */}
            <FilterModal
                isOpen={isFilterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                title="Filter Downloads"
                filters={filterFields}
                onFilterChange={handleFilterChange}
                initialValues={filterValues}
                onApply={handleApplyFilters}
            />

            {isDownloading && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                        <div className="mb-4">
                            <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Downloading File</h3>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${downloadProgress}%` }}></div>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{downloadProgress}%</p>
                        <p className="mt-2 text-xs text-gray-500">This may take several minutes for large files</p>
                        {downloadError && (
                            <div className="mt-4 text-red-500 text-sm">{downloadError}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Downloads;
