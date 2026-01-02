"use client";
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useSelector } from 'react-redux';
import moment from 'moment';
import DataTable from '@/components/DataTable';
import { ACTION_NAME, BASE_URL, PATH_URL } from '@/utils/constants';
import { RootState } from '@/redux/store';
import FilterModal from '@/components/FilterModal';
import { FaFileArchive, FaFilter, FaSync, FaArrowsAltH } from 'react-icons/fa';
import apiService from '@/utils/apiService';
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { base64ToUint8Array, displayAndDownloadFile, findPageData } from '@/utils/helper';
import TooltipButton from '@/components/common/TooltipButton';
import Loader from '@/components/Loader';
import { useAppSelector } from '@/redux/hooks';
import { selectAllMenuItems } from '@/redux/features/menuSlice';

const Downloads = () => {
    const [downloads, setDownloads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);
    const [filterValues, setFilterValues] = useState({
        fromDate: moment().subtract(1, 'day').format('YYYY-MM-DD'),
        toDate: moment().format('YYYY-MM-DD'),
        segment: 'Equity/Derivative',
        DocumentType: ''
    });
    const [headings, setHeadings] = useState([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [apiResponseTime, setApiResponseTime] = useState<number | undefined>(undefined);
    const [downloadAllData, setDownloadAllData] = useState([]);
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
    const [isAutoWidth, setIsAutoWidth] = useState(false);

    const { colors } = useTheme();
    const userData = useSelector((state: RootState) => state.auth);
    const menuItems = useAppSelector(selectAllMenuItems);
    const pageData: any = findPageData(menuItems, "Downloads");
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
            <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"Download","Level":1, "RequestFrom":"W"</J_Ui>
            <Sql></Sql>
            <X_Filter>
                <FromDate>${fromDateStr}</FromDate>
                <ToDate>${toDateStr}</ToDate>
                <RepType></RepType>
                <DocumentType>${filterValuesLocal.DocumentType || ''}</DocumentType>
                <DocumentNo></DocumentNo>
                <Segment>${filterValuesLocal.segment}</Segment>
                <ClientCode>${filterValuesLocal.ClientCode || ''}</ClientCode>
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
                setDownloadAllData(response.data.data.rs0)

                // Auto-enable auto-width for tables with many columns
                if (response.data.data.rs0.length > 0) {
                    const columnCount = Object.keys(response.data.data.rs0[0]).filter(key => !key.startsWith('_')).length;
                    if (columnCount > 7) {
                        setIsAutoWidth(true);
                    }
                }
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
                console.log(extractedHeadings, 'extractedHeadings');

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
        if(pageData?.autoFetch === 'false') setFilterModalVisible(true)
        else getDownloads(true)
    },[])

    const downloadAllFn = async () => {
        if (!downloadAllData.length) {
            console.warn("No records to download.");
            return;
        }
    
        setIsDownloading(true);
        setDownloadProgress(0);
        setDownloadError(null);
    
        const fromDateStr = moment(filterValues.fromDate).format("YYYYMMDD");
        const toDateStr = moment(filterValues.toDate).format("YYYYMMDD");
        const currentTime = moment().format("HHmmss");
        const currentDate = moment().format("YYYYMMDD");
    
        // Get doctype (first column name in first record)
        const doctype = downloadAllData[0].Doctype.replace("/", "_") || "Doctype";
    
        const zipFolderName = `${doctype}_${fromDateStr}_${toDateStr}_${currentTime}_${currentDate}`;
    
        const zip = new JSZip();
        const pdfFolder = zip.folder(zipFolderName); // folder inside zip
    
        let completed = 0;
    
        try {
            for (let i = 0; i < downloadAllData.length; i++) {
                const record = downloadAllData[i];
                try {
                    const xmlData = `<dsXml>
          <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"Download","Level":1, "RequestFrom":"W"</J_Ui>
          <Sql></Sql>
          <X_Filter>
              <FromDate>${fromDateStr}</FromDate>
              <ToDate>${toDateStr}</ToDate>
              <RepType></RepType>
              <DocumentType></DocumentType>
              <DocumentNo>${record["Document No"]}</DocumentNo>
          </X_Filter>
          <X_GFilter></X_GFilter>
          <J_Api>"UserId":"${userData.userId}", "UserType":"${userData.userType}"</J_Api>
      </dsXml>`;
    
                    const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
                    const fileData = response.data.data.rs0?.[0];
    
                    if (fileData?.Base64) {
                        const base64Data = fileData.Base64;
                        let fileName = fileData.FileName.split("\\").pop() || "file.pdf";
    
                        // Make file name unique by appending index before the extension
                        const nameParts = fileName.split(".");
                        if (nameParts.length > 1) {
                            const ext = nameParts.pop();
                            fileName = `${nameParts.join(".")}_${i + 1}.${ext}`;
                        } else {
                            fileName = `${fileName}_${i + 1}`;
                        }
    
                        // Add to folder with Uint8Array for binary files
                        const fileContent = base64ToUint8Array(base64Data);
                        pdfFolder.file(fileName, fileContent);
                    }
                } catch (err) {
                    console.error("Error downloading file:", err);
                }
    
                completed++;
                setDownloadProgress(Math.round((completed / downloadAllData.length) * 100));
            }
    
            // Generate zip with folder inside
            const zipBlob = await zip.generateAsync({ type: "blob" });
            saveAs(zipBlob, `${zipFolderName}.zip`);
        } catch (err) {
            console.error("Error creating zip:", err);
            setDownloadError("Failed to create zip file. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };
    




    const handleDownload = async (record) => {
        console.log(record, 'record');

        setDownloadingFile(record['Document No']);

        const fromDateStr = moment(filterValues.fromDate).format('YYYYMMDD');
        const toDateStr = moment(filterValues.toDate).format('YYYYMMDD');

        const xmlData = `<dsXml>
            <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"Download","Level":1, "RequestFrom":"W"</J_Ui>
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
                displayAndDownloadFile(base64Data, fileName)
            }
        } catch (error) {
            console.error('Error downloading document:', error);
        } finally {
            setDownloadingFile(null);
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

    const tableSettings = {
        leftAlignedColumns: "ClientCode,Contract No",
        dateFormat: {
            key: "Document Date", // Comma-separated column names
            format: "DD-MMM-YYYY" // Your desired format
        },

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
                        UserId: userData.userId,
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
            },
            {
                type: 'WSearchDropDownBox',
                label: 'Client',
                wKey: 'ClientCode',
                dynamicSearch: {
                    "isDynamic": true,
                    "minSearchLength": 3,
                    "debounceMs": 400
                  },
                  wQuery: {
                    Sql: "",
                    J_Ui: {
                      ActionName: "Common",
                      Option: "Search",
                      RequestFrom: "W"
                    },
                    X_Filter: "${value}",
                    X_Filte_Multiple: {
                      "SearchQuery": "##SearchQuery##"
                    },
                    J_Api: {
                      UserId: userData.userId,
                      UserType:userData.userType,
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


    // <dsXml>
    //             <J_Ui>"ActionName":"Common","Option":"Search","RequestFrom":"W"</J_Ui>
    //             <Sql/>
    //             <X_Filter></X_Filter>
    //             <J_Api>"UserId":"ADMIN","AccYear":24,"MyDbPrefix":"SVVS","MenuCode":7,"ModuleID":0,"MyDb":null,"DenyRights":null,"UserType":"branch"</J_Api>
    //         </dsXml>

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
                    <TooltipButton
                        onClick={downloadAllFn}
                        icon={<FaFileArchive  aria-label="Download All" size={20} />}
                        label="Download All"
                    />

                    {/* <button
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
                    </button> */}

                    <TooltipButton
                        onClick={() => getDownloads(true)}
                        icon={
                            loading ? (
                                <div className="w-5 h-5 border-2 border-t-transparent border-primary rounded-full animate-spin" />
                            ) : (
                                <FaSync  aria-label="Refresh" size={20} />
                            )
                        }
                        label="Refresh"
                        disabled={loading}
                        className="p-2 rounded"
                        style={{ color: colors.text }}
                    />

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


                    <button
                        className="p-2 rounded"
                        onClick={() => setFilterModalVisible(true)}
                        style={{ color: colors.text }}
                    >
                        <FaFilter  aria-label="Filter" size={20} />
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
            {!loading && !downloadingFile && (
                <DataTable
                    data={downloads}
                    onRowClick={handleDownload}
                    settings={{
                        ...tableSettings,
                        ...(isAutoWidth ? { columnWidth: undefined, isAutoWidth: true } : {})
                    }}
                />
            )}

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
            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-8 border rounded-lg" style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: '#e5e7eb',
                    minHeight: '200px'
                }}>
                    <div className="text-center">
                        <Loader />
                        <div className="mt-4 text-sm font-medium" style={{ color: colors.text }}>
                            Loading downloads...
                        </div>
                    </div>
                </div>
            )}

            {/* Individual file download loading */}
            {downloadingFile && !loading && (
                <div className="flex items-center justify-center py-8 border rounded-lg" style={{
                    backgroundColor: colors.cardBackground,
                    borderColor: '#e5e7eb',
                    minHeight: '200px'
                }}>
                    <div className="text-center">
                        <Loader />
                        <div className="mt-4 text-sm font-medium" style={{ color: colors.text }}>
                            Downloading file {downloadingFile}...
                        </div>
                    </div>
                </div>
            )}

            {/* Download progress modal */}
            {isDownloading && (
                <div
                    className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50"
                    style={{ backgroundColor: colors?.background2 }}
                >
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
