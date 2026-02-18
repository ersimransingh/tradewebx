import { useTheme } from "@/context/ThemeContext";
import { selectAllMenuItems } from "@/redux/features/menuSlice";
import { useAppSelector } from "@/redux/hooks";
import apiService from "@/utils/apiService";
import { ACTION_NAME, BASE_URL, PATH_URL } from "@/utils/constants";
import { findPageData, getLocalStorage } from "@/utils/helper";
import { useEffect, useState, useMemo } from "react";
import { DataGrid, Column } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { toast } from "react-toastify";
import Loader from "@/components/Loader";
import { FaEdit, FaSync } from "react-icons/fa";
import Select from "react-select";
import DigitalLogModal from "@/components/Modals/DigitalLogModal";
import { DigitalLogEmailProps } from "@/types/digitalLogEmail";
import moment from "moment";

const DigitalEmailLog: React.FC<DigitalLogEmailProps> = ({ data, settings, filters, isAutoWidth, handleRefresh }) => {
    console.log("filters",filters)
    const { colors } = useTheme();
    const menuItems = useAppSelector(selectAllMenuItems);
    // User specified "digitalemaillog" as second parameter
    const pageData: any = findPageData(menuItems, "digitalemaillog");

    const [rows, setRows] = useState<any[]>([]);
    const [dynamicColumns, setDynamicColumns] = useState<Column<any>[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Log Modal State
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [selectedLogId, setSelectedLogId] = useState<any>(null);

    // State to track selected actions for each row
    const [selectedActions, setSelectedActions] = useState<{ [key: string]: any }>({});
    
    // Action Options
    const actionOptions = [
        { value: "P", label: "Pause" },
        { value: "S", label: "Start" }
    ];

    useEffect(() => {
        if (data && data.length > 0) {
             const keys = Object.keys(data[0]);
             
             const excludeKeys = ["priority", "_id", "action"]; 
             const otherKeys = keys.filter(k => !excludeKeys.includes(k.trim().toLowerCase()));

             const newDynamicColumns: Column<any>[] = otherKeys.map((key) => {
                const maxContentLength = data.reduce((max: number, row: any) => {
                    const cellValue = String(row[key] || "");
                    return Math.max(max, cellValue.length);
                }, key.length);
                
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
            
            setDynamicColumns(newDynamicColumns);
            setRows(data);
        } else {
            setRows([]);
            setDynamicColumns([]);
        }
    }, [data]);

    const handleActionChange = (rowId: any, selectedOption: any) => {
        setSelectedActions(prev => ({
            ...prev,
            [rowId]: selectedOption
        }));
    };

    const handleUpdate = async (row: any) => {
        const id = row.id || row.Id || row.ID || row._id;
        const selectedAction = selectedActions[id]; // Handle various ID casings
        const selectedPriority = selectedPriorities[id];
        
        // Priority default to row value if not selected
        const rowPriority = row.Priority || row.priority;
        let finalPriority = selectedPriority ? selectedPriority.value : String(rowPriority);

        // If not selected, attempt to map label to value (e.g., "Low" -> "2")
        if (!selectedPriority) {
            const matchingOption = priorityOptions.find(opt => 
                opt.label.toLowerCase() === finalPriority.toLowerCase() || 
                opt.value === finalPriority
            );
            if (matchingOption) {
                finalPriority = matchingOption.value;
            }
        }

        if (!selectedAction) {
            toast.warn("Please select an action first (Pause/Start)");
            return;
        }

        setLoading(true);
        try {
            const toDate = filters?.ToDate ? moment(filters.ToDate).format("YYYYMMDD") : "";
            const documentType = row.DocumentType || "";

            const xmlData = `<dsXml>
                <J_Ui>"ActionName":"${ACTION_NAME}","Option":"DigitalEmailUpdate","Level":1,"RequestFrom":"W"</J_Ui>
                <Sql/>
                <X_Filter>
                    <ToDate>${toDate}</ToDate>
                    <Action>${selectedAction.value}</Action>
                    <Priority>${finalPriority}</Priority>
                    <DocumentType>${documentType}</DocumentType>
                </X_Filter>
                <X_GFilter/>
                <J_Api>"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            const rs0 = response?.data?.data?.rs0;
            
            if (rs0 && rs0.length > 0 && rs0[0].ErrorFlag === "S") {
                 toast.success(rs0[0].ErrorMessage || "Update successful");
                 if (handleRefresh) {
                     handleRefresh();
                 }
            } else {
                 const errorMsg = rs0?.[0]?.ErrorMessage || response.data.message || "Update failed";
                 toast.error(errorMsg);
            }

        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    const handleViewLog = (row: any) => {
        const documentType = row.DocumentType || "";
        if(documentType) {
            setSelectedLogId(documentType); // Reusing this state for DocumentType
            setIsLogModalOpen(true);
        } else {
            toast.error("Invalid Document Type");
        }
    };

     // Priority Options
     const priorityOptions = [
        { value: "0", label: "High" },
        { value: "1", label: "Medium" },
        { value: "2", label: "Low" }
    ];

    // State to track selected priorities for each row
    const [selectedPriorities, setSelectedPriorities] = useState<{ [key: string]: any }>({});

    const handlePriorityChange = (rowId: any, selectedOption: any) => {
        setSelectedPriorities(prev => ({
            ...prev,
            [rowId]: selectedOption
        }));
    };

    const columns: Column<any>[] = useMemo(() => {
        if(dynamicColumns.length === 0 && rows.length === 0) return [];

         // Custom Columns
         const priorityCol: Column<any> = {
            key: "Priority",
            name: "Priority",
            width: 180,
            renderCell: (props) => {
                const id = props.row.id || props.row.Id || props.row.ID || props.row._id;
                const rowValue = props.row.Priority || props.row.priority;
                
                // Find initial option based on row value (which might be "Low" or "2")
                const initialOption = priorityOptions.find(opt => 
                    opt.label.toLowerCase() === String(rowValue).toLowerCase() || 
                    opt.value === String(rowValue)
                );

                return (
                     <div className="w-full h-full flex items-center p-2">
                         <div style={{ width: '100%' }} onClick={(e) => e.stopPropagation()}>
                            <Select
                                options={priorityOptions}
                                value={selectedPriorities[id] || initialOption || null}
                                onChange={(opt) => handlePriorityChange(id, opt)}
                                menuPortalTarget={document.body}
                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                placeholder="Select Priority"
                                classNamePrefix="react-select"
                            />
                         </div>
                     </div>
                );
            }
         };

         const actionCol: Column<any> = {
            key: "Action",
            name: "Action",
            width: 200,
            renderCell: (props) => {
                const id = props.row.id || props.row.Id || props.row.ID || props.row._id;
                const rowValue = props.row.Action || props.row.action;

                // Find initial option based on row value
                const initialOption = actionOptions.find(opt => 
                    opt.label.toLowerCase() === String(rowValue).toLowerCase() || 
                    opt.value === String(rowValue)
                );

                return (
                    <div className="w-full h-full flex items-center p-2">
                        <div style={{ width: '100%' }} onClick={(e) => e.stopPropagation()}>
                            <Select
                                options={actionOptions}
                                value={selectedActions[id] || initialOption || null}
                                onChange={(opt) => handleActionChange(id, opt)}
                                menuPortalTarget={document.body}
                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                placeholder="Select Action"
                                classNamePrefix="react-select"
                            />
                        </div>
                    </div>
                );
            }
         };

         const updateCol: Column<any> = {
             key: "Update",
             name: "Update",
             width: 100,
             renderCell: (props) => (
                 <button
                     onClick={() => handleUpdate(props.row)}
                     className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                     title="Update Status"
                 >
                     <FaSync size={14} /> Update
                 </button>
             )
         };

         const logCol: Column<any> = {
            key: "Log",
            name: "Log",
            width: 100,
            renderCell: (props) => (
                <button
                    onClick={() => handleViewLog(props.row)}
                    style={{
                        background: colors.buttonBackground,
                        color: colors.buttonText,
                         padding: "4px 8px",
                        borderRadius: "4px",
                        border: "none",
                        cursor: "pointer"
                    }}
                >
                    Log
                </button>
            )
        };

        return [
            ...dynamicColumns,
            priorityCol,
            actionCol,
            updateCol,
            logCol
        ];

    }, [dynamicColumns, selectedActions, selectedPriorities, colors]);

    return (
        <div style={{background: colors.background}}>
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
                <DigitalLogModal
                    isOpen={isLogModalOpen}
                    onClose={() => setIsLogModalOpen(false)}
                    documentType={selectedLogId} // passing DocumentType as rowId/selectedLogId
                    pageData={pageData}
                    filters={filters}
                />
            )}
        </div>
    );
};

export default DigitalEmailLog;