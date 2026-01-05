import React, { useEffect, useState, useMemo } from 'react';
import { DataGrid, Column, RenderCellProps } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { TradeSplitProps, TradeRow } from '@/types/tradeSplit';
import { useTheme } from '@/context/ThemeContext';
import _ from 'lodash';
import apiService from '@/utils/apiService';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import { getLocalStorage, getTextWidthSize } from '@/utils/helper';
import ErrorModal from './ErrorModal';
import ConfirmationModal from './ConfirmationModal';

import { toast } from 'react-toastify';

const TradeSplit: React.FC<TradeSplitProps> = ({ data, isAutoWidth }) => {
    const { colors, fonts } = useTheme();
    const [rows, setRows] = useState<TradeRow[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    // Error state: key = rowId, value = error message (used for highlighting cells)
    const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
    
    // Modal States
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [modalErrors, setModalErrors] = useState<string[]>([]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (data && Array.isArray(data)) {
            const initializedRows = data.map((d, index) => ({
                ...d,
                _id: index, // Ensure unique ID for grid
                FinalQty: d.FinalQty ?? 0
            }));
            setRows(initializedRows);
        }
    }, [data]);

    const handleEditClick = () => {
        setIsEditing(true);
        setSaveStatus(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setRowErrors({});
        setModalErrors([]);
         // Reset rows to original data
        if (data && Array.isArray(data)) {
             const initializedRows = data.map((d, index) => ({
                ...d,
                _id: index, 
                FinalQty: d.FinalQty ?? 0
            }));
            setRows(initializedRows);
        }
    };

    // --- Validation Logic ---
    const validate = (): boolean => {
        let isValid = true;
        const newRowErrors: Record<number, string> = {};
        const errors: string[] = [];

        // Group rows by Unique Trade Identifier
        const groups = _.groupBy(rows, (r) => `${r.SerialNo}-${r.Scrip}-${r.BuySell}`);

        Object.entries(groups).forEach(([, groupRows]) => {
            const firstRow = groupRows[0];
            const isSell = firstRow.BuySell === 'S';
            
            // Qty Logic: Total Trade Qty is the SUM of Qty for all rows in the group
            const totalTargetQty = groupRows.reduce((sum, r) => sum + (r.Qty || 0), 0);
            
            const currentSumFinal = groupRows.reduce((sum, r) => sum + Number(r.FinalQty || 0), 0);

            if (isSell) {
                // For Sell: Allow partial quantity (sum <= total), but do not allow exceeding Trade Qty
                if (currentSumFinal > totalTargetQty) {
                    isValid = false;
                    errors.push(`Group ${firstRow.ScripName} (${firstRow.SerialNo}): Final Qty Sum (${currentSumFinal}) cannot exceed Trade Qty (${totalTargetQty})`);
                    
                    groupRows.forEach(r => {
                        if (!newRowErrors[r._id]) newRowErrors[r._id] = "Exceeds Trade Qty";
                    });
                }
            } else {
                // For Buy: Strict equality required
                if (currentSumFinal !== totalTargetQty) {
                    isValid = false;
                    errors.push(`Group ${firstRow.ScripName} (${firstRow.SerialNo}): Final Qty Sum (${currentSumFinal}) must match Total Qty (${totalTargetQty})`);
                    
                    groupRows.forEach(r => {
                        if (!newRowErrors[r._id]) newRowErrors[r._id] = "Sum Mismatch";
                    });
                }
            }

            // Individual Checks
            groupRows.forEach(row => {
                // Rule: Holding Check (Only for Sell)
                if (isSell) {
                    if (Number(row.FinalQty) > Number(row.HoldingQty)) {
                        isValid = false;
                        newRowErrors[row._id] = `Exceeds Holding (${row.HoldingQty})`;
                        errors.push(`Row ${row.SerialNo} (${row.DPAccountNo}): FinalQty > HoldingQty`);
                    }
                }
            });
        });

        setRowErrors(newRowErrors);
        
        if (!isValid) {
            setModalErrors(errors);
            setIsErrorModalOpen(true);
        }
        
        return isValid;
    };

    const handleInitialSave = () => {
        if (validate()) {
            setIsConfirmModalOpen(true);
        }
    };

    const performSave = async () => {
        setIsSaving(true);
        setSaveStatus(null);
        try {
            // Filter out rows with FinalQty === 0
            const rowsToSave = rows.filter(r => Number(r.FinalQty) > 0);
            
            // Build Payload (Include all columns)
            const payloadData = rowsToSave.map(row => {
                const { _id, ...rest } = row; // Exclude internal ID
                return {
                    ...rest,
                    Client: row.Client || row.ClientName || "",
                    FinalQty: Number(row.FinalQty),
                    DPAccountNo: row.DPAccountNo,
                };
            });

            const xmlPayload = `
<dsXml>
    <J_Ui>"ActionName":"TradeWeb","Option":"SaveTradeSplit","Level":1,"RequestFrom":"W"</J_Ui>
    <Sql></Sql>
    <X_Filter></X_Filter>
    <X_DataJson>${JSON.stringify(payloadData)}</X_DataJson>
    <J_Api>"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"</J_Api>
</dsXml>`;
            

            const response: any = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlPayload);
            const responseData = response?.data?.data?.rs0?.[0]; // Access first record of rs0
            
            if (responseData) {
                if (responseData.Flag === 'S') {
                    toast.success(responseData.Message || "Saved Successfully!");
                    setSaveStatus({ type: 'success', text: responseData.Message || 'Saved Successfully!' });
                    setIsEditing(false);
                    setRowErrors({});
                } else {
                    toast.warning(responseData.Message || "Operation Processed");
                    setSaveStatus({ type: 'error', text: responseData.Message || 'Operation Warning' });
                }
            } else {
                 // Fallback if structure is different, though logic implies rs0 is standard
                toast.success("Saved Successfully!");
                setSaveStatus({ type: 'success', text: 'Saved Successfully!' });
                setIsEditing(false);
                setRowErrors({});
            }

            setIsConfirmModalOpen(false); // Close confirm modal

        } catch (error: any) {
            console.error("Save failed", error);
            const errorMessage = error?.response?.data?.message || error?.message || "Failed to save data";
            toast.error(errorMessage);
            setSaveStatus({ type: 'error', text: 'Failed to save data.' });
            setIsConfirmModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleQtyChange = (rowId: number, val: string) => {
        const numVal = val === '' ? 0 : parseInt(val, 10); // Integers only?
        setRows(prev => prev.map(r => r._id === rowId ? { ...r, FinalQty: isNaN(numVal) ? 0 : numVal } : r));
        
        // Clear error for this row immediately (optional, or wait for next validate)
        if (rowErrors[rowId]) {
            setRowErrors(prev => {
                const n = { ...prev };
                delete n[rowId];
                return n;
            });
        }
    };

    // --- dynamic columns --- 
    const columns: Column<TradeRow>[] = useMemo(() => {
        if (rows.length === 0) return [];
        
        // Keys to exclude from auto-generation
        const excludeKeys = ['_id', 'FinalQty', 'checked']; 
        
        // Get all unique keys from first row (or all rows if structure varies)
        const allKeys = Object.keys(rows[0]).filter(k => !excludeKeys.includes(k));
        
        const dynamicCols: Column<TradeRow>[] = allKeys.map(key => {
            let width: string | number | undefined = 'auto';
            let minWidth: number | undefined = 80;
            let maxWidth: number | undefined = 400;

            if (isAutoWidth) {
                // Auto-fit logic mapping strictly to DataTable.tsx logic
                
                // 1. Measure Header
                const font = "600 14px 'Inter', sans-serif"; // Slightly larger to be safe
                const headerWidth = getTextWidthSize(key, font) + 70; // +70 for sorting icon, filter icon & padding

                // 2. Measure Content (Sample first 200 rows for performance)
                let maxContentWidth = 0;
                const sampleRows = rows.slice(0, 200); 
                
                // Approximate cell font
                const contentFont = "14px 'Inter', sans-serif";
                
                for (const row of sampleRows) {
                     const value = row[key];
                     const text = (value !== null && value !== undefined) ? String(value) : '';
                     
                     if (text) {
                        const w = getTextWidthSize(text, contentFont);
                        if (w > maxContentWidth) maxContentWidth = w;
                     }
                }
                
                // 3. Set Width (Header vs Content, with limits)
                const optimalWidth = Math.max(headerWidth, maxContentWidth + 36); // Increased padding for safety + 36
                minWidth = Math.min(Math.max(optimalWidth, 80), 800); // Min 80px, Max 800px cap
                width = minWidth; // Set width explicitly
                maxWidth = undefined; // Allow expanding if resize is enabled? (not strictly needed but consistent with DataTable logic which sets width=minWidth)
            }
            
            return {
                key,
                name: key.replace(/([A-Z])/g, ' $1').trim(), // Add space before caps
                width,
                minWidth,
                maxWidth
            }
        });

        // Append FinalQty (Editable)
        const finalQtyCol: Column<TradeRow> = {
            key: 'FinalQty',
            name: 'Final Qty',
            width: 120, // Keep fixed width for editable input
            renderCell: (props: RenderCellProps<TradeRow>) => {
                 if (isEditing) {
                     const hasError = !!rowErrors[props.row._id];
                     return (
                         <div className="p-1 h-full">
                             <input
                                 type="number"
                                 className={`w-full h-full px-2 border rounded ${hasError ? 'border-red-500 ring-1 ring-red-500 bg-red-50' : 'border-gray-300'}`}
                                 value={props.row.FinalQty}
                                 onChange={(e) => handleQtyChange(props.row._id, e.target.value)}
                             />
                         </div>
                     )
                 }
                 return <div className="p-1">{props.row.FinalQty}</div>;
            }
        };

        return [...dynamicCols, finalQtyCol];
    }, [rows, isEditing, rowErrors, isAutoWidth]);


    return (
        <div className="w-full p-2 flex flex-col h-screen max-h-[calc(100vh-100px)]">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-2 h-10">
                <div className="flex-1 text-sm text-gray-600">
                    {/* Optional: Show record count inside status area if needed */}
                     {saveStatus ? (
                         <div className={`font-semibold text-sm px-3 py-1 rounded border inline-block ${saveStatus.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                             {saveStatus.text}
                         </div>
                     ) : (
                         <span>Total Records: {rows.length}</span>
                     )}
                </div>
                <div className="flex gap-2">
                    {/* Removed local Auto Width Button - handled by parent */}

                    {!isEditing ? (
                        <button
                            onClick={handleEditClick}
                            disabled={rows.length === 0}
                            className={`px-4 py-1 font-semibold rounded shadow-sm transition-colors text-white`}
                            style={{
                                backgroundColor: rows.length > 0 ? (colors?.buttonBackground || '#2563eb') : '#e5e7eb',
                                color: rows.length > 0 ? (colors?.buttonText || '#ffffff') : '#9ca3af',
                                cursor: rows.length > 0 ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Edit
                        </button>
                    ) : (
                        <>
                             <button
                                onClick={handleInitialSave}
                                disabled={isSaving}
                                className="px-4 py-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded shadow-sm disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="px-4 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded shadow-sm"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Grid */}
            <div className={`flex-1 overflow-hidden rounded-lg border shadow-sm bg-white ${isEditing ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                <DataGrid
                    columns={columns}
                    rows={rows}
                    className="rdg-light fill-grid h-full"
                    style={{ height: '100%', fontFamily: fonts?.content }}
                    rowKeyGetter={(row) => row._id}
                />
            </div>

            {/* Modals */}
            <ErrorModal 
                isOpen={isErrorModalOpen} 
                onClose={() => setIsErrorModalOpen(false)} 
                errors={modalErrors} 
            />
            
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={performSave}
                message="Are you sure you want to save these trade split details?"
                isSaving={isSaving}
            />
        </div>
    );
};

export default TradeSplit;