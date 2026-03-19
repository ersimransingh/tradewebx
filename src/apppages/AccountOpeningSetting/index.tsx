import { useTheme } from "@/context/ThemeContext";
import { selectAllMenuItems } from "@/redux/features/menuSlice";
import { useAppSelector } from "@/redux/hooks";
import apiService from "@/utils/apiService";
import { BASE_URL, PATH_URL } from "@/utils/constants";
import { findPageData, getLocalStorage } from "@/utils/helper";
import { useEffect, useState, useMemo, useRef, useLayoutEffect } from "react";
import { DataGrid, Column } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { toast } from "react-toastify";
import Loader from "@/components/Loader";

const AccountOpeningSetting = () => {
    const { colors } = useTheme();
    const menuItems = useAppSelector(selectAllMenuItems);
    const pageData: any = findPageData(menuItems, "AccountOpeningSetting");

    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useLayoutEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                // Use clientWidth to account for scrollbars if any
                setContainerWidth(containerRef.current.clientWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        const timeoutId = setTimeout(updateWidth, 100); // Final check after initial potential layout shifts
        return () => {
            window.removeEventListener('resize', updateWidth);
            clearTimeout(timeoutId);
        };
    }, []);

    const fetchAccountOpeningSetting = async () => {
        const currentPageData = pageData?.[0]?.levels[0];
        const juiData = currentPageData?.J_Ui || { "ActionName": "AccountOpeningSetting", "Option": "LIST" };
        const sql = pageData?.[0]?.Sql || '';
        
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
            // Adding an internal ID to ensure unique row identification for toggling
            const rowsWithId = data.map((row: any, index: number) => ({
                ...row,
                _internalId: index
            }));
            setRows(rowsWithId);
        } catch (error) {
            console.error("Error fetching account opening settings:", error);
            toast.error("Error fetching account opening settings");
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckboxToggle = (internalId: any, currentVal: string) => {
        const newVal = currentVal === "Y" ? "N" : "Y";
        setRows(prevRows => prevRows.map(row => {
            if (row._internalId === internalId) {
                return { ...row, IsVisible: newVal };
            }
            return row;
        }));
    };

    const columns = useMemo(() => {
        if (rows.length === 0) return [];
        // Filter out ID columns from being displayed
        const keys = Object.keys(rows[0]).filter(k => 
            k.toLowerCase() !== "_internalid" && 
            k.toLowerCase() !== "id"
        );
        const checkboxKey = "IsVisible";
        const hasCheckbox = keys.includes(checkboxKey);
        const checkboxWidth = 100;
        
        // Count non-checkbox columns
        const otherKeys = keys.filter(k => k !== checkboxKey);
        const otherCount = otherKeys.length;
        
        // Calculate width for other columns to fill the rest of the space
        // Subtract a small buffer (e.g. 2px) to prevent horizontal scrollbar from layout rounding
        const fillerWidth = containerWidth > 0 
            ? Math.floor((containerWidth - (hasCheckbox ? checkboxWidth : 0) - 2) / (otherCount || 1))
            : 200;
        
        // Ensure minimum width of 150 for readability
        const finalWidth = Math.max(fillerWidth, 150);

        return keys.map((key) => {
            const isCheckbox = key === checkboxKey;
            
            return {
                key,
                name: key,
                resizable: true,
                width: isCheckbox ? checkboxWidth : finalWidth,
                renderCell: (props: any) => {
                    const value = props.row[key];
                    if (isCheckbox) {
                        return (
                            <div className="w-full h-full flex items-center justify-center">
                                <input 
                                    type="checkbox" 
                                    checked={value === "Y"} 
                                    onChange={() => handleCheckboxToggle(props.row._internalId, value)}
                                    className="w-4 h-4 cursor-pointer"
                                />
                            </div>
                        );
                    }
                    return (
                        <div title={String(value)} className="w-full h-full flex items-center px-2">
                            {value}
                        </div>
                    );
                }
            };
        });
    }, [rows, containerWidth]);

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const itemsXml = rows.map(row => {
                // Dynamically generate XML tags for all fields except internal ones
                const fields = Object.entries(row)
                    .filter(([key]) => key !== '_internalId')
                    .map(([key, value]) => `<${key}>${value ?? ''}</${key}>`)
                    .join('');
                return `<item>${fields}</item>`;
            }).join('');

            const xmlData = `<dsXml>
                <J_Ui>"ActionName":"accountopeningsetting","Option":"EDIT"</J_Ui>
                <X_Filter></X_Filter>
                <X_Data>
                    <items>
                        ${itemsXml}
                    </items>
                </X_Data>
                <J_Api>"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            
            if (response?.data?.success) {
                toast.success("Settings updated successfully");
                fetchAccountOpeningSetting();
            } else {
                toast.error(response?.data?.message || "Failed to update settings");
            }
        } catch (error) {
            console.error("Error updating settings:", error);
            toast.error("An error occurred while updating settings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccountOpeningSetting();
    }, [pageData]);

    return (
        <div style={{ minHeight: "100vh" }}>
            <div className="flex justify-between items-center mb-1 px-1">
                <h1 style={{ fontSize: "18px", fontWeight: "bold", color: colors.text }}>Account Opening Setting</h1>
                <button
                    onClick={handleUpdate}
                    style={{
                        background: colors.buttonBackground || "#3b82f6",
                        color: colors.buttonText || "#ffffff",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        fontWeight: "600",
                        transition: "opacity 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = "0.8"}
                    onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
                >
                    Update
                </button>
            </div>
            
            <div 
                ref={containerRef}
                style={{ background: colors.cardBackground, height: "calc(100vh - 120px)", position: "relative" , overflow: "hidden"    }}
            >
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
        </div>
    );
};

export default AccountOpeningSetting;
