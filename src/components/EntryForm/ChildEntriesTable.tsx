import React from 'react';
import { DataGrid } from 'react-data-grid';

interface ChildEntriesTableProps {
    childEntriesTable: any[];
    setChildEntriesTable: React.Dispatch<React.SetStateAction<any[]>>;
    viewMode: boolean;
    setChildFormValues: (values: any) => void;
    handleChildEditNonSavedData: (row: any) => void;
    columnWidthMap?: Record<string, number | string>;
    childFormData?: any[];
    childDropdownOptions?: Record<string, any[]>;
}

const ChildEntriesTable: React.FC<ChildEntriesTableProps> = ({
    childEntriesTable,
    setChildEntriesTable,
    viewMode,
    setChildFormValues,
    handleChildEditNonSavedData,
    columnWidthMap = {},
    childFormData = [],
    childDropdownOptions = {}
}) => {
    return (
        <div className="flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1">
                <DataGrid
                    columns={[
                        {
                            key: "",
                            name: "",
                            width: 50,
                            renderCell: ({ row }) => (
                                <input
                                    type="checkbox"
                                    aria-label='checked'
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    checked={row.IsDeleted || false}
                                    onChange={(e) => {
                                        const updatedTable = childEntriesTable.map((item, i) =>
                                            i === row._index
                                                ? { ...item, IsDeleted: e.target.checked }
                                                : item
                                        );
                                        setChildEntriesTable(updatedTable);
                                    }}
                                    disabled={viewMode}
                                />
                            )

                        },
                        {
                            key: "actions",
                            name: "Actions",
                            width: columnWidthMap["Actions"] || 200,
                            renderCell: ({ row }) => (
                                <div className="flex gap-1 justify-center">
                                    {viewMode && (
                                        <button
                                            className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-700 mr-2 px-3 py-1 rounded-md transition-colors"
                                            onClick={() => {
                                                setChildFormValues(row);
                                                handleChildEditNonSavedData(row);
                                            }}
                                        >
                                            View
                                        </button>
                                    )}
                                    <button
                                        className={`mr-2 px-3 py-1 rounded-md transition-colors ${viewMode
                                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                                : "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-700"
                                            }`}
                                        onClick={() => {
                                            setChildFormValues(row);
                                            handleChildEditNonSavedData(row);
                                        }}
                                        disabled={viewMode}
                                    >
                                        Edit
                                    </button>
                                </div>
                            ),
                        },
                        ...(childEntriesTable.length > 0
                            ? Object.keys(childEntriesTable[0])
                                .filter((key) => key !== "SerialNo" && key?.toLowerCase() !== "id" && key !== "IsDeleted" && key !== "isInserted") // Exclude SerialNo and id
                                .slice(0, 6)
                                .map((key) => ({
                                    key,
                                    name: key,
                                    width: columnWidthMap[key] || "auto",
                                    renderHeaderCell: () => (
                                        <div title={key} className="truncate">
                                            {key}
                                        </div>
                                    ),
                                    renderCell: ({ row }: any) => {
                                        let value = row[key] == null || row[key] === "" ? "-" : String(row[key]);
                                        
                                        // Check if this key corresponds to a dropdown field
                                        const field = childFormData?.find((f) => f.wKey === key);
                                        if (field && field.type === 'WDropDownBox' && childDropdownOptions?.[key]) {
                                            const option = childDropdownOptions[key].find((opt: any) => String(opt.value) === String(row[key]));
                                            if (option) {
                                                value = option.label;
                                            }
                                        }

                                        return (
                                            <div
                                                className="truncate text-center"
                                                title={value}
                                                style={{
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                {value}
                                            </div>
                                        );
                                    },
                                }))
                            : []),
                    ]}
                    rows={childEntriesTable.map((entry, index) => ({
                        ...entry,
                        _index: index,
                    }))}
                    className="rdg-light"
                    rowHeight={40}
                    headerRowHeight={40}
                    style={{
                        backgroundColor: "white",
                        fontFamily: "inherit",
                        // width:"fit-content",
                        height: "100%"
                    }}
                />
            </div>
        </div>
    );
};

export default ChildEntriesTable;
