import React from 'react';
import { DataGrid } from 'react-data-grid';
import { FaSave, FaTrash, FaPlus } from 'react-icons/fa';
import { MdArrowBack, MdOutlineClose } from "react-icons/md";
import { toast } from 'react-toastify';
import Button from '../ui/button/Button';
import EntryForm from '../component-forms/EntryForm';
import { TabData, FormField, GroupedFormData } from '@/types';
import { formatTextSplitString } from '@/utils/helper';
import { groupFormData } from '../component-forms/form-helper/utils';

interface TabContentProps {
    tabsData: TabData[];
    activeTabIndex: number;
    setActiveTabIndex: React.Dispatch<React.SetStateAction<number>>;
    isViewMode: boolean;
    viewMode: boolean;
    colors: any;
    fonts: any;
    tabFormValues: Record<string, Record<string, any>>;
    setTabFormValues: React.Dispatch<React.SetStateAction<Record<string, Record<string, any>>>>;
    tabDropdownOptions: Record<string, Record<string, any[]>>;
    setTabDropdownOptions: React.Dispatch<React.SetStateAction<Record<string, Record<string, any[]>>>>;
    tabLoadingDropdowns: Record<string, Record<string, boolean>>;
    handleTabDropdownChange: (field: any, tabKey: string) => void;
    fieldErrors: Record<string, string>;
    setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    masterFormValues: Record<string, any>;
    setTabsData: React.Dispatch<React.SetStateAction<TabData[]>>;
    setValidationModal: (data: any) => void;
    handleTabTableDataEdit: (row: any, index: number) => void;
    handleAddNominee: (details?: any, row?: any) => void;
    handleTabTableDataDelete: (index: number) => void;
    tabTableData: Record<string, any[]>;
    tabsModal: boolean;
    setTabsModal: React.Dispatch<React.SetStateAction<boolean>>;
    isMinor: boolean;
    setIsMinor: React.Dispatch<React.SetStateAction<boolean>>;
    handleClearTabTableRowEntry: () => void;
    handleAddTabsFormTableRow: () => void;
    submitTabsFormData: () => void;
    FinalSubmitTabsFormData: () => void;
    isFormInvalid: boolean;
    isFormSubmit: boolean;
    finalTabSubmitSuccess: boolean;
    goToPreviousTab: () => void;
    handleTabChangeViewMode: () => void;
    checkIfMinorforTable: (dob: any) => boolean;
    getTabTableColumns: (tab: TabData) => string[];
    action: string;
    editData: any;
}

const TabContent: React.FC<TabContentProps> = ({
    tabsData,
    activeTabIndex,
    setActiveTabIndex,
    isViewMode,
    viewMode,
    colors,
    fonts,
    tabFormValues,
    setTabFormValues,
    tabDropdownOptions,
    setTabDropdownOptions,
    tabLoadingDropdowns,
    handleTabDropdownChange,
    fieldErrors,
    setFieldErrors,
    masterFormValues,
    setTabsData,
    setValidationModal,
    handleTabTableDataEdit,
    handleAddNominee,
    handleTabTableDataDelete,
    tabTableData,
    tabsModal,
    setTabsModal,
    isMinor,
    setIsMinor,
    handleClearTabTableRowEntry,
    handleAddTabsFormTableRow,
    submitTabsFormData,
    FinalSubmitTabsFormData,
    isFormInvalid,
    isFormSubmit,
    finalTabSubmitSuccess,
    goToPreviousTab,
    handleTabChangeViewMode,
    checkIfMinorforTable,
    getTabTableColumns,
    action,
    editData
}) => {
    return (
        <>
            {/* Tabs Navigation */}
            {tabsData.length > 0 && (
                <div className="border-t pt-1 relative">
                    <div className="mb-1" style={{ position: 'sticky', top: '0', zIndex: 100 }}>
                        <div className="overflow-x-auto" style={{
                            msOverflowStyle: 'none',
                            scrollbarWidth: 'none',
                            borderBottom: `1px solid ${colors.textInputBorder}`,
                            backgroundColor: colors.background,
                        }}>
                            <nav className="-mb-px flex items-center min-w-max px-4 gap-1">
                                {tabsData.map((tab, index) => {
                                    const isActive = activeTabIndex === index;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                if (isViewMode) {
                                                    setActiveTabIndex(index);
                                                    handleTabChangeViewMode();
                                                }
                                            }}
                                            className={`py-2 px-6 border-b-2 font-medium text-sm whitespace-nowrap rounded-t-lg transition-all duration-200 ease-in-out ${isActive
                                                    ? 'text-opacity-100'
                                                    : 'text-opacity-70 hover:text-opacity-100'
                                                }`}
                                            style={{
                                                backgroundColor: isActive ? colors.tabBackground : 'transparent',
                                                color: colors.tabText,
                                                border: `1px solid ${isActive ? colors.buttonBackground : 'transparent'}`,
                                                boxShadow: isActive ? `0 1px 3px ${colors.primary}20` : 'none'
                                            }}
                                        >
                                            {formatTextSplitString(tab.TabName || "")}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Tab Content */}
                    {tabsData.length > 0 && tabsData[activeTabIndex] && (
                        <>
                            <div className="flex justify-end mb-1 gap-2">
                                <div className="flex item-start mr-auto">
                                    {activeTabIndex > 0 && (
                                        <Button
                                            className={`flex items-center text-white`}
                                            onClick={goToPreviousTab}>
                                            <MdArrowBack /> Back
                                        </Button>
                                    )}
                                </div>
                                {
                                    isViewMode ? (
                                        <div>
                                            {!(activeTabIndex === tabsData.length - 1) &&
                                                <Button
                                                    className={`flex items-center bg-blue-500 hover:bg-blue-600 text-white`}
                                                    onClick={() => {
                                                        setActiveTabIndex((prev) => prev + 1);
                                                        handleTabChangeViewMode();
                                                    }}>
                                                    Next
                                                </Button>
                                            }
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            {tabsData[activeTabIndex].Settings.isTable === "true" && (
                                                <Button
                                                    className={`flex items-center ${viewMode
                                                        ? 'bg-gray-400 cursor-not-allowed'
                                                        : 'bg-blue-500 hover:bg-blue-600'
                                                        } text-white`}
                                                    onClick={() => {
                                                        const noOfRecordsAllowed = Number(tabsData[activeTabIndex]?.Settings?.maxAllowedRecords);
                                                        const currentTabKey = tabsData[activeTabIndex]?.TabName;
                                                        const currentRecords = (tabTableData[currentTabKey] || [])?.length;
                                                        if (currentRecords >= noOfRecordsAllowed) {
                                                            toast.warning(`Max number of records allowed ${noOfRecordsAllowed}`);
                                                        } else {
                                                            setTabsModal(true);
                                                        }
                                                    }}
                                                    disabled={action === "view" && editData}
                                                >
                                                    Add Entry
                                                </Button>
                                            )}
                                            <Button
                                                className={`flex items-center ${isFormInvalid || viewMode
                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                    : 'bg-blue-500 hover:bg-blue-600'
                                                    } text-white`}
                                                onClick={submitTabsFormData}
                                                disabled={isFormInvalid || viewMode || isFormSubmit}
                                            >
                                                {isFormSubmit ? "Submitting..." : (
                                                    <>
                                                        <FaSave />
                                                        {activeTabIndex < tabsData.length - 1 ? "Save & Next" : "Save"}
                                                    </>
                                                )}
                                            </Button>
                                            {
                                                activeTabIndex === tabsData.length - 1 && (
                                                    <Button
                                                        className={`flex items-center ${isFormInvalid || viewMode || !finalTabSubmitSuccess
                                                            ? 'bg-gray-400 cursor-not-allowed'
                                                            : 'bg-blue-500 hover:bg-blue-600'
                                                            } text-white`}
                                                        onClick={FinalSubmitTabsFormData}
                                                        disabled={isFormInvalid || viewMode || isFormSubmit || !finalTabSubmitSuccess}
                                                    >
                                                        {isFormSubmit ? "Submitting..." : (
                                                            <>
                                                                <FaSave />
                                                                {"Final Submit"}
                                                            </>
                                                        )}
                                                    </Button>
                                                )
                                            }
                                        </div>
                                    )
                                }

                            </div>
                            {tabsModal && (
                                <div className={`fixed inset-0 flex items-center justify-center z-400`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                                    <div className="bg-white rounded-lg p-6 w-full max-w-[80vw] overflow-y-auto min-h-[80vh] max-h-[80vh]">
                                        <div className="flex justify-between items-center mb-2">
                                            <h2 className="text-xl font-semibold">
                                                {tabsData[activeTabIndex]?.TabName || "Add Record"}
                                            </h2>

                                            <Button
                                                className={`flex items-center text-white`}
                                                onClick={() => {
                                                    setTabsModal(false);
                                                    setIsMinor(false);
                                                }}
                                            >
                                                <MdOutlineClose />     Close
                                            </Button>

                                        </div>
                                        {!isViewMode ? (
                                            <div className='flex justify-end mb-2 gap-2'>
                                                <Button
                                                    className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md`}
                                                    onClick={handleClearTabTableRowEntry}
                                                >
                                                    reset
                                                </Button>
                                                <Button
                                                    className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md`}
                                                    onClick={handleAddTabsFormTableRow}
                                                >
                                                    Save
                                                </Button>
                                                {
                                                    isMinor && (<Button
                                                        className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md`}
                                                        onClick={() => handleAddNominee()}
                                                    >
                                                        Add/Edit Guardian
                                                    </Button>)
                                                }

                                            </div>
                                        ) : (
                                            <div className='flex justify-end mb-2 gap-2'>
                                                {
                                                    (isMinor && tabsData[activeTabIndex]?.TabName === "NomineeDetails") && (<Button
                                                        className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md`}
                                                        onClick={() => handleAddNominee()}
                                                    >
                                                        View Guardian Details
                                                    </Button>)
                                                }
                                            </div>
                                        )}
                                        {(isMinor && tabsData[activeTabIndex]?.TabName === "NomineeDetails") && (
                                            <div className="bg-yellow-100 border-l-4 border-orange-500 text-yellow-700 p-4 mb-4">
                                                <p>{isViewMode ? "Click on above view Guardian button to see the Guardian details" :
                                                    "Click on above add/edit button to change or add the Nominee Guardian."}</p>
                                            </div>)
                                        }
                                        {(() => {
                                            const currentTab = tabsData[activeTabIndex];
                                            const currentTabKey = currentTab?.TabName;
                                            const groupedFormData: GroupedFormData[] = groupFormData(
                                                currentTab.Data,
                                                currentTab.Settings.isGroup === "true"
                                            );
                                            return (
                                                <div>
                                                    {groupedFormData.map((group, idx) => (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                border: group.groupName ? `1px solid ${colors.textInputBorder}` : "none",
                                                                borderRadius: "4px",
                                                                padding: group.groupName ? "8px" : "0",
                                                                marginBottom: "10px",
                                                            }}
                                                        >
                                                            {group.groupName && (
                                                                <h6
                                                                    style={{
                                                                        marginBottom: "8px",
                                                                        fontWeight: "bold",
                                                                        background: `${colors.background}`,
                                                                        padding: "6px 10px",
                                                                        borderRadius: "4px",
                                                                        fontSize: "14px"
                                                                    }}
                                                                >
                                                                    {group.groupName}
                                                                </h6>
                                                            )}


                                                            <EntryForm
                                                                formData={group.fields}
                                                                formValues={tabFormValues[currentTabKey] || {}}
                                                                setFormValues={(values) => {
                                                                    setTabFormValues((prev) => ({
                                                                        ...prev,
                                                                        [currentTabKey]:
                                                                            typeof values === "function"
                                                                                ? values(prev[currentTabKey] || {})
                                                                                : values,
                                                                    }));
                                                                }}
                                                                dropdownOptions={tabDropdownOptions[currentTabKey] || {}}
                                                                setDropDownOptions={(options) => {
                                                                    setTabDropdownOptions((prev) => ({
                                                                        ...prev,
                                                                        [currentTabKey]:
                                                                            typeof options === "function"
                                                                                ? options(prev[currentTabKey] || {})
                                                                                : options,
                                                                    }));
                                                                }}
                                                                loadingDropdowns={tabLoadingDropdowns[currentTabKey] || {}}
                                                                onDropdownChange={(field) =>
                                                                    handleTabDropdownChange(field, currentTabKey)
                                                                }
                                                                fieldErrors={fieldErrors}
                                                                setFieldErrors={setFieldErrors}
                                                                masterValues={tabFormValues[currentTabKey] || {}}
                                                                setFormData={(updatedFormData: FormField[]) => {
                                                                    const currentTab = tabsData[activeTabIndex];
                                                                    const currentTabName = currentTab?.TabName;

                                                                    setTabsData((prev: TabData[]) => {
                                                                        return prev.map(tab => {
                                                                            if (tab.TabName === currentTabName) {
                                                                                const currentGroupName = updatedFormData[0]?.CombinedName?.trim() || "";


                                                                                // Fields to keep from original (other groups)
                                                                                const otherGroupsFields = tab.Data.filter(field => {
                                                                                    const fieldGroupName = field.CombinedName?.trim() || "";
                                                                                    return fieldGroupName !== currentGroupName;
                                                                                });

                                                                                // Combine other groups fields with the updated current group fields
                                                                                const mergedData = [...otherGroupsFields, ...updatedFormData];
                                                                                // Sort by SrNo to maintain original order
                                                                                mergedData.sort((a, b) => (a.Srno || 0) - (b.Srno || 0));

                                                                                return {
                                                                                    ...tab,
                                                                                    Data: mergedData
                                                                                };
                                                                            }
                                                                            return tab;
                                                                        });
                                                                    });
                                                                }}
                                                                setValidationModal={setValidationModal}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()
                                        }
                                    </div>
                                </div>
                            )}
                            {tabsData[activeTabIndex].Settings.isTable !== "true" && (() => {
                                const currentTab = tabsData[activeTabIndex];
                                const currentTabKey = currentTab?.TabName;
                                const groupedFormData: GroupedFormData[] = groupFormData(
                                    currentTab.Data,
                                    currentTab.Settings.isGroup === "true"
                                );
                                return (
                                    <div>
                                        {groupedFormData.map((group, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    border: group.groupName ? `1px solid ${colors.textInputBorder}` : "none",
                                                    borderRadius: "4px",
                                                    padding: group.groupName ? "8px" : "0",
                                                    marginBottom: "10px",
                                                }}
                                            >
                                                {group.groupName && (
                                                    <h6
                                                        style={{
                                                            marginBottom: "8px",
                                                            fontWeight: "bold",
                                                            background: `${colors.background}`,
                                                            padding: "6px 10px",
                                                            borderRadius: "4px",
                                                            fontSize: "14px"
                                                        }}
                                                    >
                                                        {group.groupName}
                                                    </h6>
                                                )}

                                                <EntryForm
                                                    formData={group.fields}
                                                    formValues={tabFormValues[currentTabKey] || {}}
                                                    setFormValues={(values) => {
                                                        setTabFormValues((prev) => ({
                                                            ...prev,
                                                            [currentTabKey]:
                                                                typeof values === "function"
                                                                    ? values(prev[currentTabKey] || {})
                                                                    : values,
                                                        }));
                                                    }}
                                                    dropdownOptions={tabDropdownOptions[currentTabKey] || {}}
                                                    setDropDownOptions={(options) => {
                                                        setTabDropdownOptions((prev) => ({
                                                            ...prev,
                                                            [currentTabKey]:
                                                                typeof options === "function"
                                                                    ? options(prev[currentTabKey] || {})
                                                                    : options,
                                                        }));
                                                    }}
                                                    loadingDropdowns={tabLoadingDropdowns[currentTabKey] || {}}
                                                    onDropdownChange={(field) =>
                                                        handleTabDropdownChange(field, currentTabKey)
                                                    }
                                                    fieldErrors={fieldErrors}
                                                    setFieldErrors={setFieldErrors}
                                                    masterValues={masterFormValues}
                                                    setFormData={(updatedFormData: FormField[]) => {
                                                        const currentTab = tabsData[activeTabIndex];
                                                        const currentTabName = currentTab?.TabName;

                                                        setTabsData((prev: TabData[]) => {
                                                            return prev.map(tab => {
                                                                if (tab.TabName === currentTabName) {
                                                                    const currentGroupName = updatedFormData[0]?.CombinedName?.trim() || "";
                                                                    // Fields to keep from original (other groups)
                                                                    const otherGroupsFields = tab.Data.filter(field => {
                                                                        const fieldGroupName = field.CombinedName?.trim() || "";
                                                                        return fieldGroupName !== currentGroupName;
                                                                    });

                                                                    // Combine other groups fields with the updated current group fields
                                                                    const mergedData = [...otherGroupsFields, ...updatedFormData];
                                                                    mergedData.sort((a, b) => (a.Srno || 0) - (b.Srno || 0));
                                                                    return {
                                                                        ...tab,
                                                                        Data: mergedData
                                                                    };
                                                                }
                                                                return tab;
                                                            });
                                                        });
                                                    }}
                                                    setValidationModal={setValidationModal}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            {tabsData[activeTabIndex]?.Settings?.isTable === "true" && (
                                <div className="overflow-x-auto mt-2">
                                    {(() => {
                                        const currentTabKey = tabsData[activeTabIndex]?.TabName;
                                        const columns = [
                                            {
                                                key: 'actions',
                                                name: 'Actions',
                                                width: !viewMode ? 300 : 280,
                                                renderCell: ({ row }: any) => {
                                                    const isNomineeTab = tabsData[activeTabIndex]?.TabName === "NomineeDetails";
                                                    const isMinor = checkIfMinorforTable(row.NomineeDOB);
                                                    const hasGuardianDetails = row.guardianDetails && Object.keys(row.guardianDetails).length > 0;
                                                    const showGuardianButton = isNomineeTab && isMinor;

                                                    return (
                                                        viewMode ? (
                                                            <div>
                                                                <button
                                                                    className={`mr-2 px-3 py-1 rounded-md transition-colors bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700`}
                                                                    onClick={() => {
                                                                        handleTabTableDataEdit(row, row._index);
                                                                    }}>
                                                                    view
                                                                </button>
                                                                {showGuardianButton && hasGuardianDetails && (
                                                                    <button
                                                                        className={`mr-2 px-3 py-1 rounded-md transition-colors bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700`}
                                                                        onClick={() => {
                                                                            handleAddNominee(row.guardianDetails, row)
                                                                        }}
                                                                    >
                                                                        View Guardian Details
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    className={`mr-1 px-3 py-1 rounded-md transition-colors bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700`}
                                                                    onClick={() => {
                                                                        handleTabTableDataEdit(row, row._index);
                                                                    }}>
                                                                    Edit
                                                                </button>
                                                                {showGuardianButton && (
                                                                    <button
                                                                        className={`mr-1 px-3 py-1 rounded-md transition-colors bg-green-50 text-green-500 hover:bg-green-100 hover:text-green-700`}
                                                                        onClick={() => {
                                                                            if (hasGuardianDetails) {
                                                                                handleTabTableDataEdit(row, row._index);
                                                                                setTimeout(() => {
                                                                                    handleAddNominee(row.guardianDetails)
                                                                                }, 400)
                                                                            } else {
                                                                                handleAddNominee();
                                                                            }
                                                                        }}
                                                                    >
                                                                        {hasGuardianDetails ? "Edit Guardian Details" : "Add Guardian Details"}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className={`px-3 py-1 rounded-md transition-colors bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700`}
                                                                    onClick={() => handleTabTableDataDelete(row._index)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )
                                                    );
                                                }
                                            },
                                            ...getTabTableColumns(tabsData[activeTabIndex]).map(col => ({
                                                key: col,
                                                name: col,
                                                renderCell: ({ row }: any) => {
                                                    const currentTab = tabsData[activeTabIndex];
                                                    const currentTabKey = currentTab?.TabName;
                                                    let value = row[col];

                                                    // Find field definition
                                                    const field = currentTab?.Data?.find((f) => f.wKey === col);
                                                    
                                                    // Check if dropdown and has options
                                                    if (field && field.type === 'WDropDownBox' && currentTabKey && tabDropdownOptions?.[currentTabKey]?.[col]) {
                                                        const option = tabDropdownOptions[currentTabKey][col].find((opt: any) => String(opt.value) === String(row[col]));
                                                        if (option) {
                                                            value = option.label;
                                                        }
                                                    }

                                                    return (
                                                        <div style={{
                                                            color: row.isModified || row.isInserted ? 'green' : 'inherit'
                                                        }}>
                                                            {value}
                                                        </div>
                                                    )
                                                }
                                            }))
                                        ];

                                        return (
                                            <DataGrid
                                                columns={columns}
                                                rows={(tabTableData[currentTabKey] || []).map((row, index) => ({
                                                    ...row,
                                                    _index: index
                                                }))}
                                                className="rdg-light"
                                                rowHeight={40}
                                                headerRowHeight={40}
                                                style={{
                                                    backgroundColor: colors.background,
                                                    color: colors.text,
                                                    fontFamily: fonts.content,
                                                }}
                                            />
                                        );
                                    })()}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default TabContent;
