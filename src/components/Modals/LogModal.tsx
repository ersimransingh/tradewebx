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
import { FaFileExcel } from "react-icons/fa";
import { useAppSelector } from "@/redux/hooks";
import { exportTableToExcel } from "../DataTable";

type LogModalProps = {
    isOpen: boolean;
    onClose: () => void;
    jobId: number | null;
    pageData: any;
};

const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, jobId, pageData }) => {
    const titleId = useId();
    const descriptionId = useId();
    const { colors } = useTheme();
    const tableRef = useRef<HTMLDivElement>(null);
    
    const { companyName, companyLogo } = useAppSelector((state: any) => state.common);
    const appMetadata = { companyName, companyLogo };

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<any[]>([]);
    
    useEffect(() => {
        if (isOpen && jobId) {
            fetchLogs(jobId);
        } else {
            setRows([]);
        }
    }, [isOpen, jobId]);

    const fetchLogs = async (id: number) => {
        setLoading(true);
        try {
            const xmlData = `
            <dsXml>
                <J_Ui>"ActionName":"${ACTION_NAME}","Option":"JobScheduleLog"</J_Ui>
                <Sql></Sql>
                <X_Filter>
                    <JobId>${id}</JobId>
                </X_Filter>
                <X_Filter_Multiple></X_Filter_Multiple>
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
            toast.error("Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    };

    const columns: Column<any>[] = useMemo(() => {
        if (rows.length === 0) return [];

        const keys = Object.keys(rows[0]);
        return keys.map((key) => {
             // Calculate dynamic width based on content
             const maxContentLength = rows.reduce((max, row) => {
                const cellValue = String(row[key] || "");
                return Math.max(max, cellValue.length);
            }, key.length);
            
            // Approximate width: 10px per character, min 150px, max 800px (wider max for logs)
            const width = Math.min(Math.max(maxContentLength * 10, 150), 800);

            if (key.toLowerCase() === "executionstatus") {
                 return {
                    key,
                    name: key,
                    resizable: true,
                    width: width,
                    renderCell: (props) => {
                        const value = props.row[key];
                        const isSuccess = String(value).toLowerCase() === "success";
                        return (
                            <div title={String(value)} className="w-full h-full flex items-center">
                                 <span
                                    style={{
                                        color: isSuccess ? "#28a745" : "#dc3545",
                                        fontWeight: "bold",
                                        padding: "4px 8px",
                                        borderRadius: "12px",
                                        backgroundColor: isSuccess ? "rgba(40, 167, 69, 0.1)" : "rgba(220, 53, 69, 0.1)",
                                        display: "inline-block"
                                    }}
                                >
                                    {value}
                                </span>
                            </div>
                        );
                    }
                };
            }

            return {
                key,
                name: key,
                resizable: true,
                width: width,
                renderCell: (props) => {
                    const value = props.row[key];
                    return (
                        <div title={String(value)} className="w-full h-full flex items-center">
                            {value}
                        </div>
                    );
                }
            };
        });
    }, [rows]);

    const handleExportExcel = async () => {
        if (rows.length === 0) {
            toast.warn("No data to export");
            return;
        }

        const headerData = {
            CompanyName: [appMetadata?.companyName || "Tradeweb"],
            ReportHeader: [`Job Schedule Logs - Job ID: ${jobId}`],
            RightList: []
        };
        
        // Use the reused function
        await exportTableToExcel(tableRef.current, headerData, rows, pageData, appMetadata, []);
    };

    return (
        <AccessibleModal
            isOpen={isOpen}
            onDismiss={onClose}
            labelledBy={titleId}
            describedBy={descriptionId}
            role="dialog"
            className="bg-white p-6 shadow-theme-lg !max-w-7xl w-full rounded-lg" // Increased width for DataGrid
            closeOnOverlayClick={true}
        >
            <div ref={tableRef} style={{ display: "flex", flexDirection: "column", height: "80vh" }}>
                <div className="flex justify-between items-center mb-4">
                    <h2 id={titleId} className="text-xl font-bold" style={{ color: colors.text }}>
                        Job Log (ID: {jobId})
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

export default LogModal;
