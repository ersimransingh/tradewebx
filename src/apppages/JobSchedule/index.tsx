import { useTheme } from "@/context/ThemeContext";
import { selectAllMenuItems } from "@/redux/features/menuSlice";
import { useAppSelector } from "@/redux/hooks";
import apiService from "@/utils/apiService";
import { ACTION_NAME, BASE_URL, PATH_URL } from "@/utils/constants";
import { findPageData, getLocalStorage } from "@/utils/helper";
import { useEffect, useState } from "react";
import { DataGrid, Column } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import LogModal from "@/components/Modals/LogModal";
import JobEditModal from "@/components/Modals/JobEditModal";
import { toast } from "react-toastify";
import Loader from "@/components/Loader";
import { FaEdit, FaSpinner } from "react-icons/fa";

const JobSchedule = () => {
    const { colors } = useTheme();
    const menuItems = useAppSelector(selectAllMenuItems);
    const pageData: any = findPageData(menuItems, "JobSchedule");

    const [rows, setRows] = useState<any[]>([]);
    const [dynamicColumns, setDynamicColumns] = useState<Column<any>[]>([]);
    const [loading, setLoading] = useState(false);
    const [runningJobId, setRunningJobId] = useState<number | null>(null);

    // log Modal State
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

     // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);

    const handleQuickRun = async (jobId: number) => {
        setRunningJobId(jobId);
        try {
            const xmlData = `<dsXml>
                <J_Ui>"ActionName":"${ACTION_NAME}","Option":"JOBQUICKRUN"</J_Ui>
                <Sql></Sql>
                <X_Filter>
                    <JobId>${jobId}</JobId>
                </X_Filter>
                <X_GFilter></X_GFilter>
                <J_Api>"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            const result = response?.data?.data?.rs0?.[0] || {};
            
            if (result.STATUS === "SUCCESS") {
                toast.success(result.Message || "Job executed successfully");
                fetchJobSchedule(); 
            } else {
                toast.error(result.Message || "Failed to trigger job");
            }
        } catch (error) {
            console.error("Error triggering quick run:", error);
            toast.error("Failed to trigger job");
        } finally {
            setRunningJobId(null);
        }
    };

    const handleViewLog = (jobId: number) => {
        setSelectedJobId(jobId);
        setIsLogModalOpen(true);
    };

    const handleEdit = (job: any) => {
        setSelectedJob(job);
        setIsEditModalOpen(true);
    };

    const fetchJobSchedule = async () => {
        const currentPageData = pageData?.[0]?.levels[0];
        const juiData = currentPageData?.J_Ui || {};
        const sql = pageData?.[0]?.Sql || ''
        
        setLoading(true);
        try {
            const xmlData = `<dsXml>
                <J_Ui>${JSON.stringify(juiData).slice(1, -1)}</J_Ui>
                <Sql>${sql}</Sql>
                <X_Filter>
                    <UserId>${getLocalStorage('userId')}</UserId>
                </X_Filter>
                <X_GFilter></X_GFilter>
                <J_Api>"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            const data = response?.data?.data?.rs0 || [];

            if (data.length > 0) {
                //Dynamic Columns
                const keys = Object.keys(data[0]);
                
                // Find LastRunStatus key (case insensitive)
                const lastRunKey = keys.find(k => k.toLowerCase() === "lastrunstatus");
                
                // Filter out LastRunStatus from general dynamic columns
                const otherKeys = keys.filter(k => k.toLowerCase() !== "lastrunstatus");

                const newDynamicColumns: Column<any>[] = otherKeys.map((key) => {
                    // Calculate dynamic width based on content
                    const maxContentLength = data.reduce((max: number, row: any) => {
                        const cellValue = String(row[key] || "");
                        return Math.max(max, cellValue.length);
                    }, key.length);
                    
                    // Approximate width: 10px per character, min 150px, max 600px
                    const width = Math.min(Math.max(maxContentLength * 10, 150), 600);

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

                if (lastRunKey) {
                    newDynamicColumns.unshift({
                        key: lastRunKey,
                        name: lastRunKey,
                        resizable: true,
                        width: 150,
                        renderCell: (props) => {
                            const status = props.row[lastRunKey];
                            const isSuccess = String(status).toLowerCase() === "success";
                            return (
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
                                    {status}
                                </span>
                            );
                        }
                    });
                }

                setDynamicColumns(newDynamicColumns);
                setRows(data);
            } else {
                setRows([]);
                setDynamicColumns([]);
            }

        } catch (error) {
            console.error("Error fetching job schedule:", error);
            toast.error("Error fetching job schedule");
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveJob = async (updatedJob: any) => {
        setLoading(true);
        try {
            // Merge original object with updates to ensure all fields are present
            const mergedJob = { ...selectedJob, ...updatedJob };

            const xmlData = `<dsXml>
                <J_Ui>"ActionName":"JobSchedule","Option":"Edit"</J_Ui>
                <X_Filter></X_Filter>
                <X_Data>
                    ${Object.entries(mergedJob).map(([key, value]) => `<${key}>${value || ''}</${key}>`).join('\n                    ')}
                </X_Data>
                <J_Api>"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            
            if (response.data.success) {
                toast.success("Job updated successfully");
                setIsEditModalOpen(false);
                fetchJobSchedule(); // Refresh grid
            } else {
                toast.error("Failed to update job: " + (response.data.message || "Unknown error"));
            }
        } catch (error) {
            console.error("Error saving job:", error);
            toast.error("An error occurred while saving the job");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobSchedule();
    }, []);

    // Combine static actions and dynamic columns
    const columns = [
        {
            key: "Edit",
            name: "Edit",
            width: 60,
            renderCell: (props: any) => (
                <button
                    onClick={() => handleEdit(props.row)}
                    className="text-blue-600 hover:text-blue-800 flex items-center justify-center w-full h-full"
                    title="Edit Job"
                >
                    <FaEdit size={16} />
                </button>
            ),
        },
        {
            key: "Log",
            name: "Log",
            width: 100,
            renderCell: (props: any) => (
                <button
                    onClick={() => handleViewLog(props.row.JobID)}
                    style={{
                        background: colors.buttonBackground,
                        color: colors.buttonText,
                        padding: "4px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        border: "none"
                    }}
                >
                    View Log
                </button>
            ),
        },
        {
            key: "QuickRun",
            name: "Quick Run",
            width: 100,
            renderCell: (props: any) => (
                <button
                    onClick={() => handleQuickRun(props.row.JobID)}
                    disabled={runningJobId === props.row.JobID}
                    style={{
                        background: "#28a745", // Green for run
                        color: "#fff",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        cursor: runningJobId === props.row.JobID ? "not-allowed" : "pointer",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                        minWidth: "60px"
                    }}
                >
                    {runningJobId === props.row.JobID ? (
                        <>
                            <FaSpinner className="animate-spin" /> Running
                        </>
                    ) : (
                        "Run"
                    )}
                </button>
            ),
        },
        ...dynamicColumns
    ];

    return (
        <div style={{ padding: 20, background: colors.background, minHeight: "100vh" }}>
            <h1 style={{ marginBottom: 20, fontSize: "24px", fontWeight: "bold", color: colors.text }}>Job Schedule</h1>
            
            <div style={{ background: colors.cardBackground, height: "80vh", position: "relative" }}>
                 {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
                        <Loader />
                    </div>
                )}
                <DataGrid
                    columns={columns}
                    rows={rows}
                    className="rdg-light"
                    style={{ height: "100%", color: colors.text }}
                />
            </div>

            {isLogModalOpen && (
                <LogModal
                    isOpen={isLogModalOpen}
                    onClose={() => setIsLogModalOpen(false)}
                    jobId={selectedJobId}
                    pageData={pageData}
                />
            )}
            <JobEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                jobData={selectedJob}
                onSave={handleSaveJob}
            />
        </div>
    );
};

export default JobSchedule;