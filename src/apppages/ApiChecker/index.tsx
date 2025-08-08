import { useTheme } from "@/context/ThemeContext";
import { getApiConfigData, viewLogApiCall } from "./apiChecker";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

// ✅ Add these two arrays globally within the component
const apiCallingTypes = ["POST", "GET"];
const apiContentTypes = [
    "application/json",
    "application/xml",
    "multipart/form-data",
    "text/plain"
];

const ApiConfiguration = () => {
    const { colors } = useTheme();
    const [apiConfigData, setApiConfigData] = useState<any[]>([]);
    const [uniqueKeys, setUniqueKeys] = useState<string[]>([]);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editableRow, setEditableRow] = useState<any>({});
    const [viewLogServiceName, setViewLogServiceName] = useState<string>('');
    const [viewLogServiceNameApiData, setViewLogServiceNameApiData] = useState<any>([]);
    const [modalOpen, setModalOpen] = useState<any>(false);

    useEffect(() => {
        getApiConfigData(setApiConfigData);
    }, []);

    useEffect(() => {
        const keys = Array.from(
            new Set(apiConfigData.flatMap(obj => Object.keys(obj || {})))
        );
        setUniqueKeys(keys);
    }, [apiConfigData]);

    useEffect(() => {
        if (viewLogServiceName) {
            viewLogApiCall(setModalOpen, viewLogServiceName, setViewLogServiceNameApiData);
        }
    }, [viewLogServiceName]);
    

    const handleEdit = (rowIndex: number) => {
        setEditIndex(rowIndex);
        setEditableRow({ ...apiConfigData[rowIndex] });
    };

    const handleInputChange = (key: string, value: string) => {
        setEditableRow((prev: any) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSave = () => {
        const updated = [...apiConfigData];
        if (editIndex !== null) {
            updated[editIndex] = editableRow;
        }
        setApiConfigData(updated);
        setEditIndex(null);
    };

    const handleViewLog = (row: any) => {
        const serviceName = row.ServiceName;
        setViewLogServiceName(serviceName);
    };

    return (
        <div
            style={{
                background: colors?.background || '#f0f0f0',
                color: colors?.text || '#000',
                minHeight: '100vh',
                padding: '20px',
            }}
            className="w-full"
        >
            <div className="border-b border-grey-500 flex items-center gap-5">
                <button
                    className="px-4 py-2 text-sm rounded-t-lg font-bold bg-[#3EB489] mt-2"
                    style={{ backgroundColor: 'white' }}
                >
                    Api Configuration
                </button>
            </div>

            <div className="overflow-x-auto mt-4">
                <table
                    className="min-w-full text-sm border-collapse whitespace-nowrap"
                    style={{
                        border: `1px solid ${colors?.color1 || '#f0f0f0'}`,
                        backgroundColor: colors.textInputBackground,
                    }}
                >
                    <thead>
                        <tr>
                            <th
                                className="px-2 py-1 text-left"
                                style={{
                                    border: `1px solid ${colors?.color1 || '#f0f0f0'}`,
                                    background: colors?.primary || '#f0f0f0',
                                }}
                            >
                                Action
                            </th>
                            {uniqueKeys.map((header, index) => (
                                <th
                                    key={index}
                                    className="px-2 py-1 text-left"
                                    style={{
                                        border: `1px solid ${colors?.color1 || '#f0f0f0'}`,
                                        background: colors?.primary || '#f0f0f0',
                                    }}
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {apiConfigData.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                <td
                                    className="px-2 py-1"
                                    style={{
                                        border: `1px solid ${colors?.color1 || '#f0f0f0'}`,
                                    }}
                                >
                                    {editIndex === rowIndex ? (
                                        <button
                                            onClick={handleSave}
                                            className="w-[80px] h-auto border-2 border-green-600 rounded-[12px] bg-transparent text-green-600 mt-2.5 cursor-pointer py-2 font-medium font-poppins hover:bg-green-600 hover:text-white mr-2"
                                        >
                                            SAVE
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleEdit(rowIndex)}
                                            className="w-[80px] h-auto border-2 border-orange-500 rounded-[12px] bg-transparent text-orange-500 mt-2.5 cursor-pointer py-2 font-medium font-poppins hover:bg-orange-500 hover:text-white mr-2"
                                        >
                                            EDIT
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleViewLog(row)}
                                        className="w-[100px] h-auto border-2 border-purple-600 rounded-[12px] bg-transparent text-purple-600 mt-2.5 cursor-pointer py-2 font-medium font-poppins hover:bg-purple-600 hover:text-white"
                                    >
                                        View Log
                                    </button>
                                </td>
                                {uniqueKeys.map((key, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className="px-2 py-1"
                                        style={{
                                            border: `1px solid ${colors?.color1 || '#f0f0f0'}`,
                                        }}
                                    >
                                        {editIndex === rowIndex && key !== "VendorName" && key !== "ServiceName" ? (
    key === "APIType" ? (
        <select
            value={editableRow[key] ?? ""}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full border px-1 py-0.5 text-sm"
        >
            <option value="">Select</option>
            <option value="REST">REST</option>
        </select>
    ) : key === "APICallingType" ? (
        <select
            value={editableRow[key] ?? ""}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full border px-1 py-0.5 text-sm"
        >
            <option value="">Select</option>
            {apiCallingTypes.map(type => (
                <option key={type} value={type}>{type}</option>
            ))}
        </select>
    ) : key === "APIContantType" ? (
        <select
            value={editableRow[key] ?? ""}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full border px-1 py-0.5 text-sm"
        >
            <option value="">Select</option>
            {apiContentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
            ))}
        </select>
    ) : (
        <input
            type="text"
            value={editableRow[key] ?? ""}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className="w-full border px-1 py-0.5 text-sm"
        />
    )
) : (
    row[key] ?? "-"
)}

                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {modalOpen &&  (
                <Dialog open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-[200]">
                    <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <DialogPanel className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[80vh] overflow-auto relative">
                            <DialogTitle className="text-xl font-bold mb-4">View Log</DialogTitle>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="absolute top-2 right-4 text-2xl font-bold text-gray-500 hover:text-black"
                                aria-label="Close"
                            >
                                &times;
                            </button>

                            {viewLogServiceNameApiData?.length > 0 && (
                                <div className="overflow-x-auto mb-6">
                                    <table className="min-w-full border border-gray-300 text-sm">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                {Object.keys(viewLogServiceNameApiData[0]).map((key) => (
                                                    <th key={key} className="border px-4 py-2 text-left">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewLogServiceNameApiData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    {Object.keys(row).map((key) => (
                                                        <td key={key} className="border px-4 py-2 break-all">
                                                            {row[key]}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </DialogPanel>
                    </div>
                </Dialog>
            )}
        </div>
    );
};

export default ApiConfiguration;
