import React, { useEffect, useState, useId, useMemo, useRef } from "react";
import AccessibleModal from "@/components/a11y/AccessibleModal";
import { DataGrid, Column } from "react-data-grid";
import apiService from "@/utils/apiService";
import { ACTION_NAME, BASE_URL, PATH_URL } from "@/utils/constants";
import { getLocalStorage } from "@/utils/helper";
import Loader from "@/components/Loader";
import { toast } from "react-toastify";
import { useTheme } from "@/context/ThemeContext";
import "react-data-grid/lib/styles.css";
import { FaFileExcel, FaEye } from "react-icons/fa";
import { useAppSelector } from "@/redux/hooks";
import { exportTableToExcel } from "../DataTable";

import moment from "moment";

type DigitalLogModalProps = {
    isOpen: boolean;
    onClose: () => void;
    documentType: any; // Was rowId
    pageData: any;
    filters: any;
};

const DigitalLogModal: React.FC<DigitalLogModalProps> = ({ isOpen, onClose, documentType, pageData, filters }) => {
    const titleId = useId();
    const descriptionId = useId();
    const { colors } = useTheme();
    const tableRef = useRef<HTMLDivElement>(null);
    
    const { companyName, companyLogo } = useAppSelector((state: any) => state.common);
    const appMetadata = { companyName, companyLogo };

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<any[]>([]);
    
    useEffect(() => {
        if (isOpen && documentType) {
            fetchLogs();
        } else {
            setRows([]);
        }
    }, [isOpen, documentType]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
    const toDate = filters?.ToDate ? moment(filters.ToDate).format("YYYYMMDD") : "";
            
             const xmlData = `
            <dsXml>
                <J_Ui>"ActionName":"${ACTION_NAME}","Option":"DigitalEmailLOGData","Level":1,"RequestFrom":"W"</J_Ui> 
                <Sql></Sql>
                <X_Filter>
                    <ToDate>${toDate}</ToDate>
                    <DocumentType>${documentType}</DocumentType>
                </X_Filter>
                <X_GFilter></X_GFilter>
                <J_Api>"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"</J_Api>
            </dsXml>`;

             const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
             const data = response?.data?.data?.rs0 || [];

            if (data.length > 0) {
                setRows(data);
            } else {
                setRows([]);
            }

        } catch (error) {
            console.error("Error fetching logs:", error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDocument = async (row: any) => {
        const emailSrno = row.EmailSrno || row.emailsrno;
        if (!emailSrno) {
            toast.error("Email SrNo missing");
            return;
        }

        setLoading(true);
        try {
            const toDate = filters?.ToDate ? moment(filters.ToDate).format("YYYYMMDD") : "";

            const xmlData = `
            <dsXml>
                <J_Ui>"ActionName":"${ACTION_NAME}","Option":"DigitalEmailDOC","Level":1,"RequestFrom":"W"</J_Ui>
                <Sql></Sql>
                <X_Filter>
                    <ToDate>${toDate}</ToDate>
                    <DocumentType>${documentType}</DocumentType>
                    <EmailSrno>${emailSrno}</EmailSrno>
                </X_Filter>
                <X_GFilter></X_GFilter>
                <J_Api>"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            
            if (response.data.success || response.data.status === "SUCCESS") {
                const rs0 = response.data.data?.rs0?.[0];
                if (rs0?.Base64String) {
                    const base64String = rs0.Base64String;
                    const fileName = rs0.FileName || "document.pdf";
                    const extension = fileName.split('.').pop()?.toLowerCase();

                    let mimeType = 'application/octet-stream';
                    if (extension === 'pdf') mimeType = 'application/pdf';
                    else if (extension === 'png') mimeType = 'image/png';
                    else if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
                    else if (extension === 'txt') mimeType = 'text/plain';

                    try {
                        const byteCharacters = atob(base64String);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const file = new Blob([byteArray], { type: mimeType });
                        const fileURL = URL.createObjectURL(file);
                        window.open(fileURL, '_blank');
                        toast.success("Document opened in new tab");
                    } catch (e) {
                         console.error("Error processing document:", e);
                         toast.error("Failed to process document");
                    }
                } else {
                    toast.warn("No document data found");
                }
            } else {
                toast.error(response.data.message || "Failed to retrieve document");
            }
        } catch (error : any) {
            console.error("Error viewing document:", error);
            toast.error("Failed to view document");
        } finally {
            setLoading(false);
        }
    };

    const columns: Column<any>[] = useMemo(() => {
        if (rows.length === 0) return [];

        const keys = Object.keys(rows[0]);
        // Filter out keys if needed, for instance if we don't want to show internal IDs

        const dynamicCols = keys.map((key) => {
             // Calculate dynamic width based on content
             const maxContentLength = rows.reduce((max, row) => {
                const cellValue = String(row[key] || "");
                return Math.max(max, cellValue.length);
            }, key.length);
            
            const width = Math.min(Math.max(maxContentLength * 10, 150), 600);

            return {
                key, // Must be unique
                name: key,
                resizable: true,
                width: width,
                renderCell: (props: any) => {
                    const value = props.row[key];
                    return (
                        <div title={String(value)} className="w-full h-full flex items-center">
                            {value}
                        </div>
                    );
                }
            };
        });
        
        // Add View Document Column if rows exist
        const viewDocColumn = {
            key: "ViewDocument_Action", // Unique key
            name: "View Document",
            width: 150,
            renderCell: (props: any) => (
                <button
                    onClick={() => handleViewDocument(props.row)}
                    className="flex items-center justify-center gap-2 bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 w-full"
                    title="View Document"
                >
                    <FaEye /> View
                </button>
            )
        };

        return [viewDocColumn, ...dynamicCols];
    }, [rows]);

    const handleExportExcel = async () => {
        if (rows.length === 0) {
            toast.warn("No data to export");
            return;
        }

        const headerData = {
            CompanyName: [appMetadata?.companyName || "Tradeweb"],
            ReportHeader: [`Digital Email Logs - Document Type: ${documentType}`],
            RightList: []
        };
        
        await exportTableToExcel(tableRef.current, headerData, rows, pageData, appMetadata, []);
    };

    return (
        <AccessibleModal
            isOpen={isOpen}
            onDismiss={onClose}
            labelledBy={titleId}
            describedBy={descriptionId}
            role="dialog"
            className="bg-white p-6 shadow-theme-lg !max-w-7xl w-full rounded-lg"
            closeOnOverlayClick={true}
        >
            <div ref={tableRef} style={{ display: "flex", flexDirection: "column", height: "80vh" }}>
                <div className="flex justify-between items-center mb-4">
                    <h2 id={titleId} className="text-xl font-bold" style={{ color: colors.text }}>
                        Digital Log Details (Document Type: {documentType})
                    </h2>
                    <div className="flex items-center gap-2">
                         <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                            title="Export to Excel"
                        >
                            <FaFileExcel /> Excel
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 font-bold ml-2 text-xl"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div id={descriptionId} style={{ flex: 1, position: "relative", minHeight: 0 }}>
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                            <Loader />
                        </div>
                    ) : rows.length > 0 ? (
                        <DataGrid
                            columns={columns}
                            rows={rows}
                            className="rdg-light"
                            style={{ height: "100%", color: colors.text }}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            No logs found.
                        </div>
                    )}
                </div>
            </div>
        </AccessibleModal>
    );
};

export default DigitalLogModal;
