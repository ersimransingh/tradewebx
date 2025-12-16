"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import moment from 'moment';
import { FaPlus, FaSave, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ConfirmationModal from './Modals/ConfirmationModal';
import CaseConfirmationModal from './Modals/CaseConfirmationModal';
import { MdArrowBack, MdOutlineClose } from "react-icons/md";
import { ApiResponse, EntryFormModalProps, FormField, ChildEntryModalProps, TabData, GroupedFormData, GuardianEntryModalProps } from '@/types';
import EntryForm from './component-forms/EntryForm';
import { handleValidationForDisabledField } from './component-forms/form-helper';
import apiService from '@/utils/apiService';
import SaveConfirmationModal from './Modals/SaveConfirmationModal';
import { extractTagsForTabsDisabling, generateUniqueId, getFieldValue, groupFormData, parseXMLStringToObject, validateForm } from './component-forms/form-helper/utils';
import { formatTextSplitString, getLocalStorage, sanitizeValueSpecialChar, escapeXmlChars, sanitizePayload } from '@/utils/helper';
import { useTheme } from '@/context/ThemeContext';
import Button from './ui/button/Button';
import { DataGrid } from 'react-data-grid';
import { handleNextValidationFields } from './component-forms/form-helper/apiHelper';
import AccessibleModalEntry from './a11y/AccessibleModalEntry';

const ChildEntryModal: React.FC<ChildEntryModalProps> = ({
    isOpen,
    pageName,
    onClose,
    masterValues,
    formData,
    masterFormData,
    formValues,
    setFormValues,
    dropdownOptions,
    loadingDropdowns,
    onDropdownChange,
    fieldErrors,
    setFieldErrors,
    setFormData,
    resetChildForm,
    isEdit,
    onChildFormSubmit,
    setValidationModal,
    viewAccess,
    isLoading,
    setChildEntriesTable,
    setDropDownOptions,
    childModalZindex
}) => {

    const modalRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        let timer: any;

        if (modalRef.current) {
            timer = setTimeout(() => {
                modalRef.current?.focus();
            }, 50);
        }

        return () => {
            clearTimeout(timer); // Clean timeout when modal closes or re-renders
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const isChildInvalid = Object.values(fieldErrors).some(error => error);
    const handleFormSubmit = () => {
        const masterErrors = validateForm(masterFormData, masterValues);
        const childErrors = validateForm(formData, formValues);

        if (Object.keys(childErrors).length > 0) {
            setFieldErrors({ ...masterErrors, ...childErrors });
            toast.error("Please fill all mandatory fields before submitting.");
            return;
        }
        else {
            setChildEntriesTable(prev => {
                let isUpdated = false;

                const updatedEntries = prev.map(entry => {
                    const isMatch = (entry.SerialNo && formValues.SerialNo && entry.SerialNo.toString() === formValues.SerialNo.toString())
                        || (entry?.Id && formValues?.Id && entry.Id === formValues.Id);

                    if (isMatch) {
                        isUpdated = true;
                        return { ...entry, ...formValues };
                    }
                    return entry;
                });

                // If it was an update, return the modified list
                if (isUpdated) {
                    return updatedEntries;
                }

                // Otherwise it's a new unsaved entry (add Id to track it)
                const entryToAdd = {
                    ...formValues,
                    isInserted: true,
                    Id: generateUniqueId()
                };
                return [...updatedEntries, entryToAdd];
            });

            onChildFormSubmit();
        }
    };
    return (
        <div ref={modalRef} tabIndex={-1}  className={`fixed inset-0 flex items-center justify-center ${childModalZindex}`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-lg p-6 w-full max-w-[80vw] overflow-y-auto min-h-[75vh] max-h-[75vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{pageName}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>
                {isLoading ? (
                    <div className="text-center py-4">Loading...</div>
                ) : (
                    <>
                        <div className="text-end mt-5">
                            <Button
                                onClick={resetChildForm}
                                className={`mr-2 ${viewAccess
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                disabled={viewAccess}
                            >
                                Reset
                            </Button>
                            <Button
                                onClick={handleFormSubmit}
                                disabled={viewAccess || isChildInvalid}
                                className={`${(viewAccess || isChildInvalid)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                    }`}
                            >
                                Submit
                            </Button>
                        </div>
                        <EntryForm
                            formData={formData}
                            formValues={formValues}
                            masterValues={masterValues}
                            setFormValues={setFormValues}
                            dropdownOptions={dropdownOptions}
                            loadingDropdowns={loadingDropdowns}
                            onDropdownChange={onDropdownChange}
                            fieldErrors={fieldErrors}
                            setFieldErrors={setFieldErrors}
                            setFormData={setFormData}
                            setValidationModal={setValidationModal}
                            setDropDownOptions={setDropDownOptions}
                        />
                    </>
                )}

            </div>
        </div>
    );
};

const GuardianFEntryForm: React.FC<GuardianEntryModalProps> = ({
    colors,
    isOpen,
    onClose,
    masterValues,
    formData,
    masterFormData,
    formValues,
    setFormValues,
    dropdownOptions,
    loadingDropdowns,
    onDropdownChange,
    fieldErrors,
    setFieldErrors,
    setFormData,
    resetChildForm,
    isEdit,
    onChildFormSubmit,
    setValidationModal,
    viewAccess,
    isLoading,
    setChildEntriesTable,
    setDropDownOptions,
    childModalZindex
}) => {
    const isChildInvalid = Object.values(fieldErrors).some(error => error);

    const handleFormSubmit = () => {
        const childErrors = validateForm(formData, formValues);

        if (Object.keys(childErrors).length > 0) {
            setFieldErrors({ ...childErrors });
            toast.error("Please fill all mandatory fields before submitting.");
            return;
        } else {
            onChildFormSubmit();
        }

    }

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-500`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-lg p-6 w-full max-w-[80vw] overflow-y-auto min-h-[75vh] max-h-[75vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{viewAccess ? "Guardian Details" : isEdit ? "Edit Guardian Details" : "Add Guardian Details"}</h2>
                     <Button
                         className={`flex items-center text-white`}
                         onClick={onClose}>
                          <MdOutlineClose/> Close
                     </Button>
                              
                </div>
                {isLoading ? (
                    <div className="text-center py-4">Loading...</div>
                ) : (
                    <>
                        <div className="text-end mt-1 mb-2">
                            <Button
                                onClick={resetChildForm}
                                className={`mr-2 ${viewAccess
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                disabled={viewAccess}
                            >
                                Reset
                            </Button>
                            <Button
                                onClick={handleFormSubmit}
                                disabled={viewAccess || isChildInvalid}
                                className={`${(viewAccess || isChildInvalid)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                    }`}
                            >
                                Submit
                            </Button>
                        </div>
                        <div>
                            {(() => {
                                const groupedFormData: GroupedFormData[] = groupFormData(
                                    formData,
                                    true
                                );
                                return (
                                    <div>
                                        {groupedFormData.map((group, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    border: group.groupName ? `1px solid ${colors.textInputBorder}` : "none",
                                                    borderRadius: "6px",
                                                    padding: group.groupName ? "12px" : "0",
                                                    marginBottom: "16px",
                                                }}
                                            >
                                                {group.groupName && (
                                                    <h6
                                                        style={{
                                                            marginBottom: "10px",
                                                            fontWeight: "bold",
                                                            background: `${colors.background}`,
                                                            padding: "6px 10px",
                                                            borderRadius: "4px",
                                                            fontSize:"14px"
                                                        }}
                                                    >
                                                        {group.groupName}
                                                    </h6>
                                                )}

                                                <EntryForm
                                                    formData={group.fields}
                                                    formValues={formValues}
                                                    masterValues={masterValues}
                                                    setFormValues={setFormValues}
                                                    dropdownOptions={dropdownOptions}
                                                    loadingDropdowns={loadingDropdowns}
                                                    onDropdownChange={onDropdownChange}
                                                    fieldErrors={fieldErrors}
                                                    setFieldErrors={setFieldErrors}
                                                    setFormData={setFormData}
                                                    setValidationModal={setValidationModal}
                                                    setDropDownOptions={setDropDownOptions}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
const EntryFormModal: React.FC<EntryFormModalProps> = ({ isOpen, onClose, pageData, editData, action, setEntryEditData, refreshFunction, isTabs, childModalZindex = 'z-200', parentModalZindex = 'z-100', pageName }) => {
    const {colors,fonts} = useTheme()
    const [formSubmitConfirmation, setFormSubmitConfirmation] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(false);
    const [masterFormData, setMasterFormData] = useState<FormField[]>([]);
    const [masterFormValues, setMasterFormValues] = useState<Record<string, any>>({});
    const [masterDropdownOptions, setMasterDropdownOptions] = useState<Record<string, any[]>>({});
    const [masterLoadingDropdowns, setMasterLoadingDropdowns] = useState<Record<string, boolean>>({});
    const [isChildModalOpen, setIsChildModalOpen] = useState(false);
    const [childEntriesTable, setChildEntriesTable] = useState<any[]>([]);
    const [childEntriesTableBackup, setChildEntriesTableBackup] = useState<any[]>([]);
  
    const [childFormData, setChildFormData] = useState<FormField[]>([]);
    const [childFormValues, setChildFormValues] = useState<Record<string, any>>({});
    const [childDropdownOptions, setChildDropdownOptions] = useState<Record<string, any[]>>({});
    const [childLoadingDropdowns, setChildLoadingDropdowns] = useState<Record<string, boolean>>({});
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [isFormSubmit, setIsFormSubmit] = useState<boolean>(false);

    // Tabs-related state
    const [tabsData, setTabsData] = useState<TabData[]>([]);
    const [activeTabIndex, setActiveTabIndex] = useState<number>(0);
    const [tabFormValues, setTabFormValues] = useState<Record<string, Record<string, any>>>({});
    const [tabDropdownOptions, setTabDropdownOptions] = useState<Record<string, Record<string, any[]>>>({});
    const [tabLoadingDropdowns, setTabLoadingDropdowns] = useState<Record<string, Record<string, boolean>>>({});
    const [tabTableData, setTabTableData] = useState<Record<string, any[]>>({});
    const [tabsModal, setTabsModal] = useState<boolean>(false);

    const [editTabModalData, setEditTabModalData] = useState<boolean>(false);
    const [editTabRowIndex, setEditTabRowIndex] = useState(null);

    //Nominee related States
    const [isMinor, setIsMinor] = useState(false);
    const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false);
    const [guardianFormData, setGuardianFormData] = useState<FormField[]>([]);
    const [guardianFormValues, setGuardianFormValues] = useState<Record<string, any>>({});
    const [guardianDropdownOptions, setGuardianDropdownOptions] = useState<Record<string, any[]>>({});
    const [guardianLoadingDropdowns, setGuardianLoadingDropdowns] = useState<Record<string, boolean>>({});
    const [guardianLoading, setGuardianLoading] = useState(false);
    const [finalTabSubmitSuccess, setFinalTabSubmitSuccess] = useState(false);
    const [filtersValueObject,setFiltersValueObject] = useState<Record<string,any>>({});

    console.log("check tabs data===>", tabTableData, tabFormValues, tabsData, masterFormValues)

    const childEntryPresent = pageData[0]?.Entry?.ChildEntry;
    const isThereChildEntry = !isTabs && (!childEntryPresent || Object.keys(childEntryPresent).length === 0);
    const isViewMode = (action === "view" && editData) ? true : false

    const [validationModal, setValidationModal] = useState<{
        isOpen: boolean;
        message: string;
        type: 'M' | 'S' | 'E' | 'D';
        callback?: (confirmed: boolean) => void;
    }>({ isOpen: false, message: '', type: 'M' });

    const [viewMode, setViewMode] = useState<boolean>(false);

    const fetchTabsData = async (editData?: any, viewMode: boolean = false) => {
        if (!pageData?.[0]) {
            console.error('fetchTabsData: pageData[0] is not available');
            return;
        }

        setIsLoading(true);
        try {
            // Fetch tabs data which includes Master tab
            const entry = pageData[0].Entry;
            if (!entry) {
                console.error('fetchTabsData: Entry is not available in pageData[0]');
                setIsLoading(false);
                return;
            }

            const masterEntry = entry.MasterEntry;
            if (!masterEntry) {
                console.error('fetchTabsData: MasterEntry is not available in Entry');
                setIsLoading(false);
                return;
            }

            const sql = Object.keys(masterEntry?.sql || {}).length ? masterEntry.sql : "";

            // Construct J_Ui - handle 'Option' key specially
            const jUi = Object.entries(masterEntry.J_Ui)
                .map(([key, value]) => {
                    if (key === 'Option' && editData) {
                        return `"${key}":"Master_Edit"`;
                    }
                    return `"${key}":"${value}"`;
                })
                .join(',');

            // Construct J_Api
            const jApi = Object.entries(masterEntry.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            // Construct X_Filter with edit data if available
            let xFilter = '';
            if (masterEntry.X_Filter) {
                Object.entries(masterEntry.X_Filter).forEach(([key, value]) => {
                    const senetizedVal = sanitizeValueSpecialChar(value);
                    // If we have edit data and the key exists in it, use that value
                    if (editData && editData[key] !== undefined && editData[key] !== null) {
                        const senetizedEditValue = sanitizeValueSpecialChar(editData[key])
                        xFilter += `<${key}>${senetizedEditValue}</${key}>`;
                    }
                    // Otherwise use the default value from masterEntry
                    else if (value === '##InstrumentType##' || value === '##IntRefNo##') {
                        xFilter += `<${key}></${key}>`;
                    } else {
                        xFilter += `<${key}>${senetizedVal}</${key}>`;
                    }
                });
            }
            const filtersObject = parseXMLStringToObject(xFilter);
            setFiltersValueObject(filtersObject);

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${sql}</Sql>
                <X_Filter>${xFilter}</X_Filter>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            if (response?.data?.data?.rs0) {
                const allTabs: TabData[] = response.data.data.rs0;
                // Find and extract Master tab data
                const masterTab = allTabs.find(tab =>
                    tab.TabName && tab.TabName.toLowerCase().trim() === 'master'
                );

                // Filter out Master tab from tabs navigation - be more comprehensive
                const tabs = allTabs.filter(tab =>
                    tab.TabName &&
                    tab.TabName.toLowerCase().trim() !== 'master' &&
                    tab.TabName.toLowerCase().trim() !== 'master form'
                );

                // Set up master form data from Master tab
                const initialMasterValues: Record<string, any> = {};
                if (masterTab) {
                    let masterFormData = masterTab.Data || [];
                    const masterTableData = masterTab?.tableData[0] || [];

                    // Set all fields to disabled if in view mode
                    if (viewMode) {
                        masterFormData = masterFormData.map((field: any) => ({
                            ...field,
                            FieldEnabledTag: "N"
                        }));
                    }

                    setMasterFormData(masterFormData);

                    // Initialize master form values with any preset values
                    masterFormData.forEach((field: FormField) => {
                        if (field.type === 'WDateBox' && field.wValue) {
                            initialMasterValues[field.wKey] = moment(field.wValue).format('YYYYMMDD');
                        }else if(field.type === 'WDateTimePicker') {
                            const dateTime = masterTableData[field.wKey] || moment().format('YYYYMMDD HH:mm:ss');
                            initialMasterValues[field.wKey] = dateTime;
                        }else if(field.type === "WCheckBox"){
                            initialMasterValues[field.wKey] = masterTableData[field.wKey] || "false";
                        } else if (editData) {
                            initialMasterValues[field.wKey] = masterTableData[field.wKey] || editData[field.wKey] || "";
                        } else {
                            initialMasterValues[field.wKey] = "";
                        }
                    });

                    setMasterFormValues(initialMasterValues);

                    // Fetch initial dropdown options for master form
                    masterFormData.forEach((field: FormField) => {
                        if (field.type === 'WDropDownBox' && field.wQuery) {
                            fetchDropdownOptions(field);
                        }
                    });

                    // Initialize dependent fields for master form in tabs
                    masterFormData.forEach((field: FormField) => {
                        if (field.type === 'WDropDownBox' && field.dependsOn && !field.wQuery) {
                            let shouldInitialize = false;
                            let parentFieldValue: any = null;

                            if (Array.isArray(field.dependsOn.field)) {
                                // Handle multiple dependencies
                                const parentValues: Record<string, any> = {};
                                let allFieldsHaveValues = true;

                                field.dependsOn.field.forEach(fieldName => {
                                    // Check multiple sources for the parent field value
                                    const parentField = masterFormData.find(f => f.wKey === fieldName);
                                    const value = initialMasterValues[fieldName] || editData?.[fieldName] ||
                                        parentField?.wValue;
                                    parentValues[fieldName] = value;
                                    if (!value) {
                                        allFieldsHaveValues = false;
                                    }
                                });

                                if (allFieldsHaveValues) {
                                    shouldInitialize = true;
                                    parentFieldValue = parentValues;
                                }
                            } else {
                                // Handle single dependency - check multiple sources for the parent field value
                                const parentField = masterFormData.find(f => f.wKey === field.dependsOn.field);
                                parentFieldValue = editData?.[field.dependsOn.field] ||
                                    initialMasterValues[field.dependsOn.field] ||
                                    parentField?.wValue;
                                if (parentFieldValue) {
                                    shouldInitialize = true;
                                }
                            }

                            if (shouldInitialize) {
                                console.log(`Initializing dependent master field ${field.wKey} with parent value:`, parentFieldValue);
                                fetchDependentOptions(field, parentFieldValue);
                            }
                        }
                    });
                }

                // Set up remaining tabs (excluding Master)
                setTabsData(tabs);

                // Reset active tab index to 0 since we filtered out Master
                setActiveTabIndex(0);

                // Initialize form values and dropdown options for each tab
                const initialTabFormValues: Record<string, Record<string, any>> = {};
                const initialTabDropdownOptions: Record<string, Record<string, any[]>> = {};
                const initialTabLoadingDropdowns: Record<string, Record<string, boolean>> = {};
                const initialTabTableData: Record<string, any[]> = {};

                tabs.forEach((tab, index) => {
                    const tabKey = `tab_${index}`;
                    initialTabFormValues[tabKey] = {};
                    initialTabDropdownOptions[tabKey] = {};
                    initialTabLoadingDropdowns[tabKey] = {};
                    initialTabTableData[tabKey] = tab.tableData || [];

                    // Initialize form values with any preset values
                    tab.Data.forEach((field: FormField) => {
                        if (field.type === 'WDateBox' && field.wValue) {
                            initialTabFormValues[tabKey][field.wKey] = moment(field.wValue).format('YYYYMMDD');
                        }else if (field.type === 'WDateTimePicker' && field.wValue) {
                            initialTabFormValues[tabKey][field.wKey] = moment(field.wValue).format('YYYYMMDD HH:mm:ss');
                        }else if (tab?.tableData?.length && tab.Settings.isTable === "false") {
                            const initialValue = tab.tableData[0][field.wKey];
                            if (field.type === 'WDateTimePicker') {
                                initialTabFormValues[tabKey][field.wKey] = initialValue || moment().format('YYYYMMDD HH:mm:ss');
                            }else if(field.type === "WCheckBox"){
                                initialTabFormValues[tabKey][field.wKey] = initialValue || "false";
                            }else{
                                initialTabFormValues[tabKey][field.wKey] = tab.tableData[0][field.wKey];
                            }
                        } else {
                            initialTabFormValues[tabKey][field.wKey] = "";
                        }
                    });

                    // Set all fields to disabled if in view mode
                    if (viewMode) {
                        tab.Data = tab.Data.map((field: any) => ({
                            ...field,
                            FieldEnabledTag: "N"
                        }));
                    }

                    // Fetch initial dropdown options for each tab
                    tab.Data.forEach((field: FormField) => {
                        if (field.type === 'WDropDownBox' && field.wQuery) {
                            fetchDropdownOptionsForTab(field, tabKey);
                        }
                    });

                    // Initialize dependent fields for each tab
                    tab.Data.forEach((field: FormField) => {
                        if (field.type === 'WDropDownBox' && field.dependsOn && !field.wQuery) {
                            let shouldInitialize = false;
                            let parentFieldValue: any = null;

                            if (Array.isArray(field.dependsOn.field)) {
                                // Handle multiple dependencies
                                const parentValues: Record<string, any> = {};
                                let allFieldsHaveValues = true;

                                field.dependsOn.field.forEach(fieldName => {
                                    // Check multiple sources for the parent field value
                                    const parentField = tab.Data.find(f => f.wKey === fieldName);
                                    const value = initialMasterValues[fieldName] || editData?.[fieldName] ||
                                        initialTabFormValues[tabKey][fieldName] ||
                                        parentField?.wValue;
                                    parentValues[fieldName] = value;
                                    if (!value) {
                                        allFieldsHaveValues = false;
                                    }
                                });

                                if (allFieldsHaveValues) {
                                    shouldInitialize = true;
                                    parentFieldValue = parentValues;
                                }
                            } else {
                                // Handle single dependency - check multiple sources for the parent field value
                                const parentField = tab.Data.find(f => f.wKey === field.dependsOn.field);
                                parentFieldValue = editData?.[field.dependsOn.field] ||
                                    initialTabFormValues[tabKey][field.dependsOn.field] ||
                                    parentField?.wValue || initialMasterValues?.[field.dependsOn.field] ;
                                if (parentFieldValue) {
                                    shouldInitialize = true;
                                }
                            }

                            if (shouldInitialize) {
                                console.log(`Initializing dependent tab field ${field.wKey} with parent value:`, parentFieldValue);
                                fetchTabsDependentOptions(field, tabKey,initialTabFormValues,initialMasterValues);
                            }
                        }
                    });
                });

                setTabFormValues(initialTabFormValues);
                setTabDropdownOptions(initialTabDropdownOptions);
                setTabLoadingDropdowns(initialTabLoadingDropdowns);
                setTabTableData(initialTabTableData);
            }
        } catch (error) {
            console.error('Error fetching tabs data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDropdownOptionsForTab = async (field: FormField, tabKey: string) => {
        if (!field.wQuery) return;

        try {
            setTabLoadingDropdowns(prev => ({
                ...prev,
                [tabKey]: { ...prev[tabKey], [field.wKey]: true }
            }));

            const jUi = Object.entries(field.wQuery.J_Ui)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            const jApi = Object.entries(field.wQuery.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${field.wQuery.Sql || ''}</Sql>
                <X_Filter>${field.wQuery.X_Filter || ''}</X_Filter>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            const options = response.data?.data?.rs0?.map((item: any) => ({
                label: item[field.wDropDownKey?.key || 'DisplayName'],
                value: item[field.wDropDownKey?.value || 'Value']
            }));

            setTabDropdownOptions(prev => ({
                ...prev,
                [tabKey]: { ...prev[tabKey], [field.wKey]: options }
            }));
        } catch (error) {
            console.error(`Error fetching options for ${field.wKey}:`, error);
        } finally {
            setTabLoadingDropdowns(prev => ({
                ...prev,
                [tabKey]: { ...prev[tabKey], [field.wKey]: false }
            }));
        }
    };

    const fetchDropdownOptionsForGuardianTab = async (field: FormField) => {
        if (!field.wQuery) return;
        try {
            setGuardianLoadingDropdowns(prev => ({ ...prev, [field.wKey]: true }));
            const jUi = Object.entries(field.wQuery.J_Ui)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            const jApi = Object.entries(field.wQuery.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${field.wQuery.Sql || ''}</Sql>
                <X_Filter>${field.wQuery.X_Filter || ''}</X_Filter>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            const options = response.data?.data?.rs0?.map((item: any) => ({
                label: item[field.wDropDownKey?.key || 'DisplayName'],
                value: item[field.wDropDownKey?.value || 'Value']
            }));

            setGuardianDropdownOptions(prev => ({ ...prev, [field.wKey]: options }));
        } catch (error) {
            console.error(`Error fetching options for ${field.wKey}:`, error);
        } finally {
            setGuardianLoadingDropdowns(prev => ({ ...prev, [field.wKey]: false }));
        }
    };

    const fetchDropdownOptions = async (field: FormField, isChild: boolean = false) => {
        if (!field.wQuery) return;

        const setLoadingDropdowns = isChild ? setChildLoadingDropdowns : setMasterLoadingDropdowns;
        const setDropdownOptions = isChild ? setChildDropdownOptions : setMasterDropdownOptions;

        try {
            setLoadingDropdowns(prev => ({ ...prev, [field.wKey]: true }));

            const jUi = Object.entries(field.wQuery.J_Ui)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            const jApi = Object.entries(field.wQuery.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${field.wQuery.Sql || ''}</Sql>
                <X_Filter>${field.wQuery.X_Filter || ''}</X_Filter>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            const options = response.data?.data?.rs0?.map((item: any) => ({
                label: item[field.wDropDownKey?.key || 'DisplayName'],
                value: item[field.wDropDownKey?.value || 'Value']
            }));

            setDropdownOptions(prev => ({ ...prev, [field.wKey]: options }));
        } catch (error) {
            console.error(`Error fetching options for ${field.wKey}:`, error);
        } finally {
            setLoadingDropdowns(prev => ({ ...prev, [field.wKey]: false }));
        }
    };

   const fetchGuardianDependentOptions = async (field: FormField, parentValue: string | Record<string, string>, isChild: boolean = false) => {
        if (!field.dependsOn) return;
            try {
                setGuardianLoadingDropdowns(prev => ({ ...prev, [field.wKey]: true }));
            
                const jUi = Object.entries(field.dependsOn.wQuery.J_Ui)
                    .map(([key, value]) => `"${key}":"${value}"`)
                    .join(',');
            
                const jApi = Object.entries(field.dependsOn.wQuery.J_Api)
                    .map(([key, value]) => `"${key}":"${value}"`)
                    .join(',');
            
                let xFilter = '';
                if (field.dependsOn.wQuery.X_Filter_Multiple) {
                    if (Array.isArray(field.dependsOn.field)) {
                        field.dependsOn.field.forEach(fieldName => {
                            // Check if fieldName is actually a comma-separated string
                            if (typeof fieldName === 'string' && fieldName.includes(',')) {
                                // Split the string into individual field names
                                const fieldNames = fieldName.split(',').map(name => name.trim());
                            
                                // Process each individual field name
                                fieldNames.forEach(individualField => {
                                    if (!guardianFormValues[individualField] && !masterFormValues[individualField]) {
                                        toast.error(`Please select the field: ${individualField}`);
                                        return;
                                    }
                                    xFilter += `<${individualField}>${guardianFormValues[individualField] || masterFormValues[individualField] || ''}</${individualField}>`;
                                });
                            } else {
                                // Normal case - fieldName is already a single field name
                                const fieldValue = getFieldValue(fieldName, parentValue);
                                
                                if (!guardianFormValues[fieldName] && !masterFormValues[fieldName] && !fieldValue) {
                                    toast.error(`Please select the field: ${fieldName}`);
                                    return;
                                }
                                xFilter += `<${fieldName}>${guardianFormValues[fieldName] || masterFormValues[fieldName] || fieldValue || ''}</${fieldName}>`;
                            }
                        });
                    } else {
                        // Handle single dependency field
                        const fieldName = field.dependsOn.field;
                        const fieldValue = getFieldValue(fieldName, parentValue);
                        xFilter = `<${fieldName}>${fieldValue}</${fieldName}>`;
                    }
                }
                
                const xmlData = `<dsXml>
                    <J_Ui>${jUi}</J_Ui>
                    <Sql>${field.dependsOn.wQuery.Sql || ''}</Sql>
                    <X_Filter></X_Filter>
                    <X_Filter_Multiple>${xFilter}</X_Filter_Multiple>
                    <J_Api>${jApi}</J_Api>
                </dsXml>`;
            
                const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            
                const options = response.data?.data?.rs0?.map((item: any) => ({
                    label: item[field.wDropDownKey?.key || 'DisplayName'],
                    value: item[field.wDropDownKey?.value || 'Value']
                }));
            
                setGuardianDropdownOptions(prev => ({ ...prev, [field.wKey]: options }));
            
            } catch (error) {
                console.error(`Error fetching dependent options for ${field.wKey}:`, error);
            } finally {
                setGuardianLoadingDropdowns(prev => ({ ...prev, [field.wKey]: false }));
            }
        };


    // to fetch dependent option for forms without tabs 
    const fetchDependentOptions = async (field: FormField, parentValue: string | Record<string, string>, isChild: boolean = false) => {
        if (!field.dependsOn) return;

            const setLoadingDropdowns = isChild ? setChildLoadingDropdowns : setMasterLoadingDropdowns;
            const setDropdownOptions = isChild ? setChildDropdownOptions : setMasterDropdownOptions;

            try {
                setLoadingDropdowns(prev => ({ ...prev, [field.wKey]: true }));
            
                const jUi = Object.entries(field.dependsOn.wQuery.J_Ui)
                    .map(([key, value]) => `"${key}":"${value}"`)
                    .join(',');
            
                const jApi = Object.entries(field.dependsOn.wQuery.J_Api)
                    .map(([key, value]) => `"${key}":"${value}"`)
                    .join(',');
            
                let xFilter = '';
                if (field.dependsOn.wQuery.X_Filter_Multiple) {
                    if (Array.isArray(field.dependsOn.field)) {
                        field.dependsOn.field.forEach(fieldName => {
                            // Check if fieldName is actually a comma-separated string
                            if (typeof fieldName === 'string' && fieldName.includes(',')) {
                                // Split the string into individual field names
                                const fieldNames = fieldName.split(',').map(name => name.trim());
                            
                                // Process each individual field name
                                fieldNames.forEach(individualField => {
                                    if (!childFormValues[individualField] && !masterFormValues[individualField]) {
                                        toast.error(`Please select the field: ${individualField}`);
                                        return;
                                    }
                                    xFilter += `<${individualField}>${childFormValues[individualField] || masterFormValues[individualField] || ''}</${individualField}>`;
                                });
                            } else {
                                // Normal case - fieldName is already a single field name
                                const fieldValue = getFieldValue(fieldName, parentValue);

                                if (!childFormValues[fieldName] && !masterFormValues[fieldName] && !fieldValue) {
                                    toast.error(`Please select the field: ${fieldName}`);
                                    return;
                                }
                                xFilter += `<${fieldName}>${childFormValues[fieldName] || masterFormValues[fieldName] || fieldValue || ''}</${fieldName}>`;
                            }
                        });
                    } else {
                        // Handle single dependency field
                        const fieldName = field.dependsOn.field;
                        const fieldValue = getFieldValue(fieldName, parentValue);
                        xFilter = `<${fieldName}>${fieldValue}</${fieldName}>`;
                    }
                }

                const xmlData = `<dsXml>
                    <J_Ui>${jUi}</J_Ui>
                    <Sql>${field.dependsOn.wQuery.Sql || ''}</Sql>
                    <X_Filter></X_Filter>
                    <X_Filter_Multiple>${xFilter}</X_Filter_Multiple>
                    <J_Api>${jApi}</J_Api>
                </dsXml>`;
            
                const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            
                const options = response.data?.data?.rs0?.map((item: any) => ({
                    label: item[field.wDropDownKey?.key || 'DisplayName'],
                    value: item[field.wDropDownKey?.value || 'Value']
                }));
            
                setDropdownOptions(prev => ({ ...prev, [field.wKey]: options }));
            } catch (error) {
                console.error(`Error fetching dependent options for ${field.wKey}:`, error);
            } finally {
                setLoadingDropdowns(prev => ({ ...prev, [field.wKey]: false }));
            }
        };
    const fetchTabsDependentOptions = async (field: FormField, tabKey: string, tabFormValues: any , masterFormValues : any) => {
        if (!field.dependsOn) return;
        try {
            setTabLoadingDropdowns(prev => ({
                ...prev,
                [tabKey]: { ...prev[tabKey], [field.wKey]: true }
            }));

            const jUi = Object.entries(field.dependsOn.wQuery.J_Ui)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            const jApi = Object.entries(field.dependsOn.wQuery.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            let xFilter = '';
            if (field.dependsOn.wQuery.X_Filter_Multiple) {
                if (Array.isArray(field.dependsOn.field)) {
                    field.dependsOn.field.forEach(fieldName => {
                        // Check if fieldName is actually a comma-separated string
                        if (typeof fieldName === 'string' && fieldName.includes(',')) {
                            // Split the string into individual field names
                            const fieldNames = fieldName.split(',').map(name => name.trim());

                            // Process each individual field name
                            fieldNames.forEach(individualField => {
                                if (!tabFormValues?.[tabKey][individualField] && !masterFormValues[individualField]) {
                                    toast.error(`Please select the field: ${individualField}`);
                                    return;
                                }
                                xFilter += `<${individualField}>${tabFormValues?.[tabKey][individualField] || masterFormValues[individualField] || ''}</${individualField}>`;
                            });
                        } else {
                            // Normal case - fieldName is already a single field name
                            if (!tabFormValues?.[tabKey][fieldName] && !masterFormValues[fieldName]) {
                                toast.error(`Please select the field: ${fieldName}`);
                                return;
                            }
                            xFilter += `<${fieldName}>${tabFormValues?.[tabKey][fieldName] || masterFormValues[fieldName] || ''}</${fieldName}>`;
                        }
                    });
                } else {
                    xFilter = `<${field.dependsOn.field}>${""}</${field.dependsOn.field}>`;
                }
            }
            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${field.dependsOn.wQuery.Sql || ''}</Sql>
                <X_Filter></X_Filter>
                <X_Filter_Multiple>${xFilter}</X_Filter_Multiple>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            const options = response.data?.data?.rs0?.map((item: any) => ({
                label: item[field.wDropDownKey?.key || 'DisplayName'],
                value: item[field.wDropDownKey?.value || 'Value']
            }));

            setTabDropdownOptions(prev => ({
                ...prev,
                [tabKey]: { ...prev[tabKey], [field.wKey]: options }
            }));

        } catch (error) {
            console.error(`Error fetching dependent options for ${field.wKey}:`, error);
        } finally {
            setTabLoadingDropdowns(prev => ({
                ...prev,
                [tabKey]: { ...prev[tabKey], [field.wKey]: false }
            }));
        }
    };

    const handleGuardianDependentOptions = (field: any) => {
        if (field.dependsOn) {
            if (Array.isArray(field.dependsOn.field)) {
                fetchGuardianDependentOptions(field, "");
            }
        }

    }

    const handleMasterDropdownChange = (field: any) => {
        // Find dependent fields and update them
        if (field.dependsOn) {
            if (Array.isArray(field.dependsOn.field)) {
                fetchDependentOptions(field, "");
            }
        }

    };

    const handleChildDropdownChange = (field: any) => {
        // Find dependent fields and update them
        if (field.dependsOn) {
            if (Array.isArray(field.dependsOn.field)) {
                fetchDependentOptions(field, "", true);
            }
        }
    };

    const fetchMasterEntryData = async (editData?: any, viewMode: boolean = false, shouldSetLoading: boolean = true) => {

        // Check if pageData[0].Entry exists and is not an empty object
        if (!pageData?.[0]?.Entry || Object.keys(pageData[0].Entry).length === 0) {
            if (shouldSetLoading) {
                setIsLoading(false);
            }
            return;
        }

        if (shouldSetLoading) {
            setIsLoading(true);
        }

        try {
            const entry = pageData[0].Entry;
            const masterEntry = entry.MasterEntry;
            const isEditData = Object.keys(editData || {}).length > 0;

            const sql = Object.keys(masterEntry?.sql || {}).length ? masterEntry.sql : "";

            // Construct J_Ui - handle 'Option' key specially
            const jUi = Object.entries(masterEntry.J_Ui)
                .map(([key, value]) => {
                    if (key === 'Option' && editData) {
                        return `"${key}":"Master_Edit"`;
                    }
                    return `"${key}":"${value}"`;
                })
                .join(',');

            // Construct J_Api
            const jApi = Object.entries(masterEntry.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            // Construct X_Filter with edit data if available
            let xFilter = '';
            Object.entries(masterEntry.X_Filter).forEach(([key, value]) => {
                if (editData && editData[key] !== undefined && editData[key] !== null) {
                    xFilter += `<${key}>${editData[key]}</${key}>`;
                }
                else if (value === '##InstrumentType##' || value === '##IntRefNo##') {
                    xFilter += `<${key}></${key}>`;
                } else {
                    xFilter += `<${key}>${value}</${key}>`;
                }
            });
            const filtersObject = parseXMLStringToObject(xFilter);
            setFiltersValueObject(filtersObject);


            // Add any additional fields from editData that aren't in masterEntry.X_Filter
            if (editData) {
                Object.entries(editData).forEach(([key, value]) => {
                    if (
                        value !== undefined &&
                        value !== null &&
                        !masterEntry.X_Filter.hasOwnProperty(key) &&
                        !key.startsWith('_')
                    ) {
                        xFilter += `<${key}>${value}</${key}>`;
                    }
                });
            }

            const xmlData = `<dsXml>
        <J_Ui>${jUi}</J_Ui>
        <Sql>${sql}</Sql>
        <X_Filter>${xFilter}</X_Filter>
        <J_Api>${jApi}</J_Api>
        </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            let formData = response?.data?.data?.rs0 || [];
            if (viewMode) {
                formData = formData.map((field: any) => ({
                    ...field,
                    FieldEnabledTag: "N"
                }));
            }

            setChildEntriesTable(response?.data?.data?.rs1 || []);
            setChildEntriesTableBackup(response?.data?.data?.rs1 || []);

            // Initialize form values with any preset values
            const initialValues: Record<string, any> = {};
            formData.forEach((field: FormField) => {
                if (field.type === 'WDateBox' && field.wValue) {
                    initialValues[field.wKey] = moment(field.wValue).format('YYYYMMDD');
                }
                else if (editData) {
                    initialValues[field.wKey] = field.wValue;
                }
            });

            setMasterFormValues(initialValues);

            // Collect all validation updates
            const allUpdates: Array<{
                fieldKey: string;
                isDisabled: boolean;
                tagValue: string;
                flag?: string;
            }> = [];

            // FIRST: Process all dropdown options in parallel
            await Promise.all(
                formData.map(async (field: FormField) => {
                    if (field.type === 'WDropDownBox' && field.wQuery) {
                        await fetchDropdownOptions(field);
                    }
                })
            );

            // SECOND: Initialize dependent fields that have dependsOn configuration
            // This ensures dependent dropdowns are loaded with initial values when modal opens
            await Promise.all(
                formData.map(async (field: FormField) => {
                    if (field.type === 'WDropDownBox' && field.dependsOn && !field.wQuery) {
                        let shouldInitialize = false;
                        let parentFieldValue: any = null;

                        if (Array.isArray(field.dependsOn.field)) {
                            // Handle multiple dependencies
                            const parentValues: Record<string, any> = {};
                            let allFieldsHaveValues = true;

                            field.dependsOn.field.forEach(fieldName => {
                                // Check multiple sources for the parent field value
                                const parentField = formData.find(f => f.wKey === fieldName);
                                const value = editData?.[fieldName] ||
                                    initialValues[fieldName] ||
                                    parentField?.wValue;
                                parentValues[fieldName] = value;
                                if (!value) {
                                    allFieldsHaveValues = false;
                                }
                            });

                            if (allFieldsHaveValues) {
                                shouldInitialize = true;
                                parentFieldValue = parentValues;
                            }
                        } else {
                            // Handle single dependency - check multiple sources for the parent field value
                            const parentField = formData.find(f => f.wKey === field.dependsOn.field);
                            parentFieldValue = editData?.[field.dependsOn.field] ||
                                initialValues[field.dependsOn.field] ||
                                parentField?.wValue;
                            if (parentFieldValue) {
                                shouldInitialize = true;
                            }
                        }

                        if (shouldInitialize) {
                            console.log(`Initializing dependent field ${field.wKey} with parent value:`, parentFieldValue);
                            await fetchDependentOptions(field, parentFieldValue);
                        }
                    }
                })
            );

            // THEN: Process validations sequentially
            for (const field of formData) {
                if (Object.keys(field?.ValidationAPI || {}).length > 0 && isEditData && !isViewMode) {
                    await handleValidationForDisabledField(
                        field,
                        editData,
                        masterFormValues,
                        (updates) => allUpdates.push(...updates)
                    );
                }
            }

            if (isEditData && !isViewMode) {
                setMasterFormData(() => {
                    const newFormData = [...formData];
                    allUpdates.forEach(update => {
                        const fieldIndex = newFormData.findIndex(f => f.wKey === update.fieldKey);
                        if (fieldIndex >= 0) {
                            if (update.flag !== "D") {
                                newFormData[fieldIndex] = {
                                    ...newFormData[fieldIndex],
                                    FieldEnabledTag: update.isDisabled ? 'N' : newFormData[fieldIndex].FieldEnabledTag
                                };
                            } else {
                                newFormData[fieldIndex] = {
                                    ...newFormData[fieldIndex],
                                    FieldEnabledTag: update.isDisabled ? 'N' : 'Y'
                                };
                            }
                        }
                    });
                    return newFormData;
                });
                setMasterFormValues(prevValues => {
                    const newValues = { ...prevValues };
                    allUpdates.forEach(update => {
                        if (update.fieldKey in newValues) {
                            if (update.tagValue === "true" || update.tagValue === "false") {
                                newValues[update.fieldKey] = newValues[update.fieldKey];
                            } else {
                                newValues[update.fieldKey] = update.tagValue || newValues[update.fieldKey];
                            }
                        }
                    });
                    return newValues;
                });
            } else {
                setMasterFormData(formData)
            }

        } catch (error) {
            console.error('Error fetching MasterEntry data:', error);
            if (shouldSetLoading) {
                setIsLoading(false);
            }
        } finally {
            if (shouldSetLoading) {
                setIsLoading(false);
            }
        }
    };
    const fetchChildEntryData = async (editData?: any) => {
        if (!pageData?.[0]?.Entry) return;
        setIsLoading(true);

        try {
            const entry = pageData[0].Entry;
            const childEntry = entry.ChildEntry;
            const isEditData = Object.keys(editData || {}).length > 0;

            const sql = Object.keys(childEntry?.sql || {}).length ? childEntry.sql : "";

            // Construct J_Ui - handle 'Option' key specially
            const jUi = Object.entries(childEntry.J_Ui)
                .map(([key, value]) => {
                    if (key === 'Option' && editData && editData.SerialNo) {
                        return `"${key}":"ChildEntry_Edit"`;
                    }
                    return `"${key}":"${value}"`;
                })
                .join(',');

            // Construct J_Api
            const jApi = Object.entries(childEntry.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            // Construct X_Filter with edit data if available
            let xFilter = '';
            Object.entries(childEntry.X_Filter).forEach(([key, value]) => {
                if (editData && editData.SerialNo && editData[key] !== undefined && editData[key] !== null) {
                    xFilter += `<${key}>${editData[key]}</${key}>`;
                }
                else if (value === '##InstrumentType##') {
                    xFilter += `<${key}>${masterFormValues.InstrumentType || ''}</${key}>`;
                } else {
                    xFilter += `<${key}>${value}</${key}>`;
                }
            });

            // Add additional fields from editData
            if (editData && editData.SerialNo) {
                Object.entries(editData).forEach(([key, value]) => {
                    if (
                        value !== undefined &&
                        value !== null &&
                        !childEntry.X_Filter.hasOwnProperty(key) &&
                        !key.startsWith('_')
                    ) {
                        xFilter += `<${key}>${value}</${key}>`;
                    }
                });
            }

            const xmlData = `<dsXml>
        <J_Ui>${jUi}</J_Ui>
        <Sql>${sql}</Sql>
        <X_Filter>${xFilter}</X_Filter>
        <J_Api>${jApi}</J_Api>
        </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            let formData = response?.data?.data?.rs0 || [];
            if (viewMode) {
                formData = formData.map((field: any) => ({
                    ...field,
                    FieldEnabledTag: "N"
                }));
            }

            // Initialize child form values
            const initialValues: Record<string, any> = {};
            response.data?.data?.rs0?.forEach((field: FormField) => {
                if (editData && editData.Id) {
                    initialValues[field.wKey] = editData[field.wKey];
                    initialValues['Id'] = editData['Id'];
                }
                else if (field.type === 'WDateBox' && field.wValue) {
                    initialValues[field.wKey] = moment(field.wValue).format('YYYYMMDD');
                }
                else if (editData) {
                    initialValues[field.wKey] = field.wValue;
                }
            });
            setChildFormValues(initialValues);

            // Collect all validation updates
            const allUpdates: Array<{
                fieldKey: string;
                isDisabled: boolean;
                tagValue: string;
                flag?: string;
            }> = [];

            // FIRST: Process all dropdown options in parallel
            await Promise.all(
                response.data?.data?.rs0?.map(async (field: FormField) => {
                    if (field.type === 'WDropDownBox' && field.wQuery) {
                        await fetchDropdownOptions(field, true);
                    }
                })
            );

            // SECOND: Initialize dependent fields that have dependsOn configuration for child entries
            // This ensures dependent dropdowns are loaded with initial values when modal opens
            await Promise.all(
                response.data?.data?.rs0?.map(async (field: FormField) => {
                    if (field.type === 'WDropDownBox' && field.dependsOn && !field.wQuery) {
                        let shouldInitialize = false;
                        let parentFieldValue: any = null;

                        if (Array.isArray(field.dependsOn.field)) {
                            // Handle multiple dependencies
                            const parentValues: Record<string, any> = {};
                            let allFieldsHaveValues = true;

                            field.dependsOn.field.forEach(fieldName => {
                                // Check multiple sources for the parent field value
                                const parentField = response.data?.data?.rs0?.find((f: FormField) => f.wKey === fieldName);
                                const value = editData?.[fieldName] ||
                                    initialValues[fieldName] ||
                                    masterFormValues[fieldName] ||
                                    parentField?.wValue;
                                parentValues[fieldName] = value;
                                if (!value) {
                                    allFieldsHaveValues = false;
                                }
                            });

                            if (allFieldsHaveValues) {
                                shouldInitialize = true;
                                parentFieldValue = parentValues;
                            }
                        } else {
                            // Handle single dependency - check multiple sources for the parent field value
                            const parentField = response.data?.data?.rs0?.find((f: FormField) => f.wKey === field.dependsOn.field);
                            parentFieldValue = editData?.[field.dependsOn.field] ||
                                initialValues[field.dependsOn.field] ||
                                masterFormValues[field.dependsOn.field] ||
                                parentField?.wValue;
                            if (parentFieldValue) {
                                shouldInitialize = true;
                            }
                        }

                        if (shouldInitialize) {
                            console.log(`Initializing dependent child field ${field.wKey} with parent value:`, parentFieldValue);
                            await fetchDependentOptions(field, parentFieldValue, true);
                        }
                    }
                })
            );

            // THEN: Process validations sequentially
            for (const field of response.data?.data?.rs0 || []) {
                if (Object.keys(field?.ValidationAPI|| {}).length > 0 && isEditData && !isViewMode) {
                    await handleValidationForDisabledField(
                        field,
                        editData,
                        masterFormValues,
                        (updates) => allUpdates.push(...updates),
                    );
                }
            }

            if (isEditData && !isViewMode) {
                // Apply all updates at once
                setChildFormData(() => {
                    const newFormData = [...formData];

                    allUpdates.forEach(update => {
                        const fieldIndex = newFormData.findIndex(f => f.wKey === update.fieldKey);
                        if (fieldIndex >= 0) {
                            if (update.flag !== "D") {
                                newFormData[fieldIndex] = {
                                    ...newFormData[fieldIndex],
                                    FieldEnabledTag: update.isDisabled ? 'N' : newFormData[fieldIndex].FieldEnabledTag
                                };
                            } else {
                                newFormData[fieldIndex] = {
                                    ...newFormData[fieldIndex],
                                    FieldEnabledTag: update.isDisabled ? 'N' : 'Y'
                                };
                            }
                        }
                    });
                    return newFormData;
                });
                setChildFormValues(prevValues => {
                    const newValues = { ...prevValues };

                    allUpdates.forEach(update => {
                        if (update.fieldKey in newValues) {
                            if (update.tagValue === "true" || update.tagValue === "false") {
                                newValues[update.fieldKey] = newValues[update.fieldKey];
                            } else {
                                newValues[update.fieldKey] = update.tagValue || newValues[update.fieldKey];
                            }
                        }
                    });
                    return newValues;
                });
            } else {
                setChildFormData(formData)
            }

        } catch (error) {
            console.error('Error fetching ChildEntry data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        console.log('EntryFormModal useEffect triggered:', { isOpen, isEdit, editData, isTabs });
        if (isOpen && !isEdit && (!editData || Object.keys(editData).length === 0)) {
            console.log('Conditions met, calling fetch function. isTabs:', isTabs);
            if (isTabs) {
                console.log('Calling fetchTabsData for multientry...');
                fetchTabsData();
            } else {
                console.log('Calling fetchMasterEntryData for regular entry...');
                fetchMasterEntryData();
            }
        } else {
            console.log('Conditions not met:', { isOpen, isEdit, editDataExists: !!editData, editDataLength: Object.keys(editData || {}).length });
        }
    }, [isOpen, pageData, isTabs]);


              // Helper function to check if any records are selected for deletion
             const hasSelectedRecords = () => {
                 return childEntriesTable.some(record => record.IsDeleted);
             };


            const deleteChildRecord = async () => {
                  try {
                    const entry = pageData[0].Entry;
                    const masterEntry = entry.MasterEntry;
                    const pageName = pageData[0]?.wPage || "";
                    const sql = Object.keys(masterEntry?.sql || {}).length ? masterEntry.sql : "";
                
                    const jUi = Object.entries(masterEntry?.J_Ui || {})
                      .map(([key, value]) => {
                        if (key === "Option") return `"${key}":"edit"`;
                        if (key === "ActionName") return `"${key}":"${pageName}"`;
                        return `"${key}":"${value}"`;
                      })
                      .join(",");
                  
                    const jApi = Object.entries(masterEntry?.J_Api || {})
                      .map(([key, value]) => `"${key}":"${value}"`)
                      .join(",");
                  
                    // Escape XML special chars
                    const escapeXml = (s) =>
                      String(s).replace(/[&<>'"]/g, (c) =>
                        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" }[c])
                      );
                  
                    // Robust XML builder
                    const createXmlTags = (data) => {
                      if (data === null || data === undefined) return "";
                      if (typeof data !== "object") return escapeXml(String(data));
                    
                      // If array given directly, treat as list of <item>...</item>
                      if (Array.isArray(data)) {
                        return data.map((it) => `<item>${createXmlTags(it)}</item>`).join("");
                      }
                  
                      return Object.entries(data)
                        .map(([key, value]) => {
                          // null/undefined -> empty tag
                          if (value === null || value === undefined) {
                            return `<${key}></${key}>`;
                          }
                      
                          // Array handling
                          if (Array.isArray(value)) {
                            // If the key is 'item' we must NOT wrap the whole array in another <item> tag.
                            // Instead emit multiple <item>...</item> nodes directly.
                            if (key === "item") {
                              return value.map((it) => `<item>${createXmlTags(it)}</item>`).join("");
                            }
                            // Otherwise wrap the collection inside the parent tag (<Items> ... <item>...</item> ...</Items>)
                            return `<${key}>${value.map((it) => `<item>${createXmlTags(it)}</item>`).join("")}</${key}>`;
                          }
                      
                          // Nested object -> recurse
                          if (typeof value === "object") {
                            return `<${key}>${createXmlTags(value)}</${key}>`;
                          }
                      
                          // Primitive (including 0, false, empty string)
                          return `<${key}>${escapeXml(String(value))}</${key}>`;
                        })
                        .join("");
                    };
                
                    // Filter out records with isInserted: true - only send records that need server deletion
                     const itemsForServer = childEntriesTable.filter(item => 
                         !item.isInserted 
                     );
                
                    const userId = getLocalStorage('userId') || '';
                    const xData = createXmlTags({
                      ...masterFormValues,
                      items: { item: itemsForServer }, // Items contains key 'item' whose value is an array
                      UserId: userId,
                    });
                
                    const xmlData = `<dsXml>
                      <J_Ui>${jUi}</J_Ui>
                      <Sql>${sql}</Sql>
                      <X_Filter></X_Filter>
                      <X_Data>${xData}</X_Data>
                      <J_Api>${jApi}</J_Api>
                    </dsXml>`;
                
                    const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
                    if (response?.data?.success) {
                      fetchMasterEntryData(masterFormValues);
                      setIsConfirmationModalOpen(false);
                      toast.success("Child Record(s) Deleted");
                    }else{
                        const cleanMessage = response?.data?.message?.replace(/<\/?Message>/g, "") || "Something went wrong";
                        toast.error(cleanMessage.trim());
                    }
                  } catch (error) {
                    console.error("Error deleting child records:", error);
                  } finally {
                    console.log("check delete record");
                  }
                };

    useEffect(() => {
        if (action === 'edit' && editData) {
            if (isTabs) {
                fetchTabsData(editData);
            } else {
                fetchMasterEntryData(editData);
            }
            setIsEdit(true);
        } else if (action === 'view' && editData) {
            setViewMode(true);
            if (isTabs) {
                fetchTabsData(editData, true);
            } else {
                fetchMasterEntryData(editData, true);
            }
        }
    }, [action, editData, isTabs]);


    const handleConfirmSaveEdit = () => {
        submitFormData();
    };

    const handleCancelSaveEdit = () => {
        setFormSubmitConfirmation(false);
    };

    const handleConfirmDelete = () => {
        const recordsToDelete = childEntriesTable.filter((item: any) => item.IsDeleted);
          
          if (recordsToDelete.length > 0) {
              const recordsToDeleteLocally = recordsToDelete.filter(record => record.isInserted);
              const recordsToDeleteViaAPI = recordsToDelete.filter(record => !record.isInserted);
        
              // Delete local records
              if (recordsToDeleteLocally.length > 0) {
                  const localIdsToDelete = recordsToDeleteLocally.map(record => record.Id);
                  const filteredData = childEntriesTable.filter((item: any) => !localIdsToDelete.includes(item.Id));
                  setChildEntriesTable(filteredData);
              }
            
              if (recordsToDeleteViaAPI.length > 0) {
                  deleteChildRecord();
              }
              setIsConfirmationModalOpen(false);
          } else {
              deleteChildRecord();
          }
    };

    const handleCancelDelete = () => {
        setIsConfirmationModalOpen(false);
    };

    const handleChildEditNonSavedData = (data: any) => {
        setIsChildModalOpen(true);
        fetchChildEntryData(data)

    }

    const onChildFormSubmit = () => {
        resetChildForm();
        setIsChildModalOpen(false);
        setChildDropdownOptions({});
        setChildFormData([]);
        setChildFormValues({});
        // fetchMasterEntryData(masterFormValues);
    };

    // Updated handleAddChildEntry to validate master form before adding a child entry
    const handleAddChildEntry = () => {
        const masterErrors = validateForm(masterFormData, masterFormValues);

        if (Object.keys(masterErrors).length > 0) {
            setFieldErrors(masterErrors);
            toast.error("Please fill all mandatory fields in the master form before adding a child entry.");
            return;
        }

        setIsEdit(false);
        setChildFormValues({});
        setIsChildModalOpen(true);
        if (childFormData?.length > 0) {
            return;
        } else {
            fetchChildEntryData();
        }
    };

    const isFormInvalid = Object.values(fieldErrors).some(error => error);

    // use this in future
    const resetChildForm = () => {
        setChildFormValues({}); // Reset child form values
        // Clear errors related to child form fields
        setFieldErrors(prevErrors => {
            const updatedErrors = { ...prevErrors };
            childFormData.forEach(field => {
                if (updatedErrors[field.wKey]) {
                    delete updatedErrors[field.wKey];
                }
            });
            return updatedErrors;
        });
    };

    const resetTabsFieldsError = () =>{
        const previousTab = tabsData[activeTabIndex];
        setFieldErrors(prevErrors => {
            const updatedErrors = { ...prevErrors };
            previousTab.Data.forEach(field => {
                if (updatedErrors[field.wKey]) {
                    delete updatedErrors[field.wKey];
                }
            });
            return updatedErrors;
        });
    }

    // Function to go to previous tab
    const goToPreviousTab = () => {
        if (activeTabIndex > 0) {
            resetTabsFieldsError();
            setActiveTabIndex(activeTabIndex - 1);
        }
    };

    const resetParentForm = () => {
        if (isTabs) {
            resetTabsForm();
        } else {
            setMasterFormValues({});
            setFieldErrors({});
            setChildEntriesTable([]);
            setMasterDropdownOptions({});
            setMasterFormData([]);
            resetChildForm();
            setIsEdit(false);
            setEntryEditData?.(null);
            onClose();
            setViewMode(false);
            refreshFunction?.();
        }
    }

    const specialCharValueReplacer = (value: any) => {
        if (typeof value === 'string') {
            return value.replace(/</g, '~').replace(/>/g, '!');
        }
        return value;
    };

    const submitFormData = async () => {
        setFormSubmitConfirmation(false);
        const masterValues = structuredClone(masterFormValues);
        const childEntry = structuredClone(childFormValues);
        const childEntryTable = [...childEntriesTable].map(item => structuredClone(item));

        setIsFormSubmit(true)
        const entry = pageData[0].Entry;
        const pageName = pageData[0]?.wPage || "";

        const option = isEdit ? "edit" : "add";
        const jTag = { "ActionName": pageName, "Option": option };

        const jUi = Object.entries(jTag)
            .map(([key, value]) => `"${key}":"${value}"`)
            .join(',');

        const jApi = Object.entries(entry.MasterEntry.J_Api)
            .map(([key, value]) => `"${key}":"${value}"`)
            .join(',');

        const editedSerialNo = childEntry?.SerialNo?.toString();
        const editedId = childEntry?.Id?.toString();

        // Build a set to track processed SerialNo or Ids
        const processedKeys = new Set();

        // Add main childEntry with correct flags
        const mainItem = {
            ...childEntry,
            IsEdit: editedSerialNo ? "true" : "false",
            IsAdd: editedSerialNo ? "false" : "true"
        };

        if (editedSerialNo) processedKeys.add(`S-${editedSerialNo}`);
        else if (editedId) processedKeys.add(`I-${editedId}`);

        // Add rest of childEntryTable
        const otherItems = childEntryTable
            .filter(item => {
                const serial = item.SerialNo?.toString();
                const id = item.Id?.toString();
                const key = serial ? `S-${serial}` : id ? `I-${id}` : null;
                return key && !processedKeys.has(key);
            })
            .map(item => {
                const serial = item.SerialNo?.toString();
                const id = item.Id?.toString();
                const isAdd = (!serial && id) ? "true" : "false";
                const key = serial ? `S-${serial}` : id ? `I-${id}` : null;
                if (key) processedKeys.add(key);

                return {
                    ...item,
                    IsEdit: "false",
                    IsAdd: isAdd
                };
            });

        const checkIfEmpty = (obj: any) => {
            const keys = Object.keys(obj);
            return !(keys.length === 2 && keys.includes("IsEdit") && keys.includes("IsAdd") && Object.keys(childEntry).length === 0);
        }

        const finalItems = checkIfEmpty(mainItem) ? [mainItem, ...otherItems] : [...otherItems];

        const itemsXml = finalItems.map(item => {
            const itemTags = Object.entries(item)
                .map(([key, value]) => {
                    const val = (value === undefined || value === null) ? "" : specialCharValueReplacer(value);
                    return `<${key}>${val}</${key}>`;
                })
                .join('');
            return `<item>${itemTags}</item>`;
        }).join('');

        const masterXml = Object.entries(masterValues)
            .map(([key, value]) => {
                const val = (value === undefined || value === null) ? "" : specialCharValueReplacer(value);
                return `<${key}>${val}</${key}>`;
            })
            .join('');

        const userId = getLocalStorage('userId') || '';
        const xData = `<X_Data>
        ${masterXml}
        <items>
            ${itemsXml}
        </items>
        <UserId>${userId}</UserId>
    </X_Data>`;

        const xmlData = `<dsXml>
        <J_Ui>${jUi}</J_Ui>
        <X_Filter></X_Filter>
        ${xData}
        <J_Api>${jApi}, "UserType":"${getLocalStorage('userType')}"</J_Api>
    </dsXml>`;

        try {
            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            if (response?.data?.success) {
                onChildFormSubmit();
                setIsFormSubmit(false);
                resetParentForm();
                if (response?.data?.message) {
                    const messageTxtPresent = response?.data?.message.replace(/<\/?Message>/g, '');
                    toast.success(messageTxtPresent)
                }
            } else {
                const message = response?.data?.message.replace(/<\/?Message>/g, '');
                toast.warning(message);
                setIsFormSubmit(false)
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Failed to submit the form. Please try again.');
            setIsFormSubmit(false)
        }
    };

    const getAllColumns = (data: any[]): string[] => {
        const allColumns = new Set<string>();
        data.forEach(entry => {
            if (entry && typeof entry === 'object') {
                Object.keys(entry).forEach(key => {
                    if (key !== "SerialNo" && key !== "Id") {
                        allColumns.add(key);
                    }
                });
            }
        });
        return Array.from(allColumns);
    };

    // Create column width mapping from pageData settings
    const getColumnWidthMap = (): Record<string, number> => {
        const columnWidthMap: Record<string, number> = {};
        const settings = pageData?.[0]?.Entry?.settings;

        if (settings?.columnWidth && Array.isArray(settings.columnWidth)) {
            settings.columnWidth.forEach((widthConfig: { key: string; width: number }) => {
                if (widthConfig.key && widthConfig.width) {
                    // Handle comma-separated column names
                    const columnNames = widthConfig.key.split(',').map((name: string) => name.trim());
                    columnNames.forEach((columnName: string) => {
                        if (columnName) {
                            columnWidthMap[columnName] = widthConfig.width;
                        }
                    });
                }
            });
        }

        return columnWidthMap;
    };

    const columnWidthMap = getColumnWidthMap();


    const handleFormSubmitWhenMasterOnly = () => {
        const masterErrors = validateForm(masterFormData, masterFormValues);
        if (Object.keys(masterErrors).length > 0) {
            setFieldErrors({ ...masterErrors });
            toast.error("Please fill all mandatory fields before submitting.");
            return;
        } else {
            setFormSubmitConfirmation(true);
        }
    }

    const handleTabDropdownChange = (field: any, tabKey: string) => {
        // Handle dependent fields for tabs
        if (field.dependsOn) {
            if (Array.isArray(field.dependsOn.field)) {
                // Handle dependent dropdowns for tabs if needed
                fetchTabsDependentOptions(field, tabKey,tabFormValues,masterFormValues);
            }
        }
    };

    const validateTabForm = (tabData: TabData, tabFormValues: Record<string, any>) => {
        const errors = {};
        tabData.Data.forEach(field => {
            if (field.FieldEnabledTag === "Y" && field.isMandatory === "true" && field.type !== "WDisplayBox") {
                if (!tabFormValues[field.wKey] || tabFormValues[field.wKey]?.toString()?.trim() === "") {
                    errors[field.wKey] = `${field.label} is required`;
                }
            }
        });
        return errors;
    };

  const removeTabsWithReindexing = (apiResponse) => {
    const tabsToRemoveNames = Object.keys(apiResponse).filter(tabName => apiResponse[tabName] === false);
    // Filter tabsData and create a mapping of old indices to new indices
    const updatedTabsData = tabsData.filter(tab => !tabsToRemoveNames.includes(tab.TabName));
    // Create new objects with reindexed keys
    const updatedTabFormValue = {};
    const updatedTabTableData = {};
    const updatedDropdownOptions = {};
    updatedTabsData.forEach((tab, newIndex) => {
        const oldIndex = tabsData.findIndex(t => t.TabName === tab.TabName);
        updatedTabFormValue[`tab_${newIndex}`] = tabFormValues[`tab_${oldIndex}`] || {};
        updatedTabTableData[`tab_${newIndex}`] = tabTableData[`tab_${oldIndex}`] || [];
        updatedDropdownOptions[`tab_${newIndex}`] = tabDropdownOptions[`tab_${oldIndex}`] || {};
    });
    setTabsData(updatedTabsData);
    setTabFormValues(updatedTabFormValue);
    setTabTableData(updatedTabTableData);
    setTabDropdownOptions(updatedDropdownOptions);
    };


   const handleTabChangeViewMode = async () =>{
        const currentTab = tabsData[activeTabIndex];
        if(activeTabIndex === 0){
        // the below function API is called to disable and remove the particular tab from the form 
         const Tabsresponse = await handleNextValidationFields(editData,currentTab,masterFormValues);
         const responseString = Object.keys(Tabsresponse?.data?.data || {}).length > 0 ? Tabsresponse?.data?.data?.rs0[0]?.Column1 : null;
         // const responseString = Tabsresponse?.data?.data?.rs0[0]?.Column1 || "";
         if(Tabsresponse.data.success && responseString && activeTabIndex === 0){
             const tags = extractTagsForTabsDisabling(responseString);
             removeTabsWithReindexing(tags);
            }
        }
   }


    const submitTabsFormData = async () => {
        console.log("check active tab index",activeTabIndex)
        const currentTab = tabsData[activeTabIndex];
        const currentTabKey = `tab_${activeTabIndex}`;
        const currentTabFormValues = tabFormValues[currentTabKey] || {};

        // Validate master form first
        const masterErrors = validateForm(masterFormData, masterFormValues);

        // Only validate current tab if it's NOT a table
        let tabErrors = {};
        if (currentTab.Settings.isTable !== "true") {
            tabErrors = validateTabForm(currentTab, currentTabFormValues);
        }

        // Combine all errors
        const allErrors = { ...masterErrors, ...tabErrors };

        if (Object.keys(allErrors).length > 0) {
            setFieldErrors(allErrors);
            if (Object.keys(masterErrors).length > 0) {
                toast.error("Please fill all mandatory fields in the Master form before submitting.");
            } else {
                toast.error("Please fill all mandatory fields in the current tab before submitting.");
            }
            return;
        }

        const allData = {
            Master: [{ 
                ...masterFormValues,
                isInserted: action !== "edit",
                isModified: action === "edit" && editData ? true : false
            }],
        }

        if (currentTab.Settings.isTable === "true") {
            allData[currentTab.TabName] = tabTableData[currentTabKey] || []
        } else {
            allData[currentTab.TabName] = Object.keys(currentTabFormValues).length > 0
                ? [{
                    ...currentTabFormValues,
                    isInserted: action !== "edit",
                    isModified: action === "edit" && editData ? true : false
                  }]
                : [];
        }

        const xDataJson = JSON.stringify(sanitizePayload(allData));

        setIsFormSubmit(true);
        try {
            const saveNextAPI = currentTab.Settings.SaveNextAPI;

            const jUi = Object.entries(saveNextAPI.J_Ui)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            const jApi = Object.entries(saveNextAPI.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            // Replace placeholders in X_Filter_Multiple
            let xFilterMultiple = '';
            Object.entries(saveNextAPI.X_Filter_Multiple).forEach(([key, value]) => {
                let finalValue = value;
                if (typeof value === 'string' && value.includes('##')) {
                    // Replace placeholders with actual values
                    finalValue = value.replace(/##(\w+)##/g, (match, placeholder) => {
                        return currentTabFormValues[placeholder] || '';
                    });
                }
                xFilterMultiple += `<${key}>${finalValue}</${key}>`;
            });

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql></Sql>
                <X_Filter></X_Filter>
                <X_Filter_Multiple>${xFilterMultiple}</X_Filter_Multiple>
                <X_DataJson>${xDataJson}</X_DataJson>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            const responseMessageFlag = response?.data?.data?.rs0[0]
            if (response?.data?.success && responseMessageFlag.Flag?.toLowerCase() === "s") {
                toast.success(responseMessageFlag?.Message || 'Tab form submitted successfully!');
                setIsFormSubmit(false);
                const nextIndex = activeTabIndex + 1
                // Check if there are more tabs to navigate to
                if (activeTabIndex < tabsData.length - 1) {
                    // the below function API is called to disable and remove the particular tab from the form 
                    const Tabsresponse = await handleNextValidationFields(editData,currentTab,masterFormValues);
                    const responseString = Object.keys(Tabsresponse?.data?.data || {}).length > 0 ? Tabsresponse?.data?.data?.rs0[0]?.Column1 : null;

                    // const responseString = Tabsresponse?.data?.data?.rs0[0]?.Column1 || "";
                    
                    if(Tabsresponse.data.success && responseString && activeTabIndex === 0){
                        const tags = extractTagsForTabsDisabling(responseString);
                        removeTabsWithReindexing(tags);
                        setActiveTabIndex(nextIndex);
                        setMasterFormData(prevData => 
                          prevData.map(field => {
                            return {
                              ...field,
                              FieldEnabledTag: "N"
                            };
                          })
                        );
                    }else{
                        setActiveTabIndex(nextIndex);
                    }
                  } else {
                    setFinalTabSubmitSuccess(true)
                    // All tabs completed, close modal
                    // resetTabsForm();
                }
            } else {
                const message = responseMessageFlag?.Message || 'Submission failed';
                toast.warning(message);
                setIsFormSubmit(false);
            }
        } catch (error) {
            console.error('Error submitting tab form:', error);
            toast.error('Failed to submit the form. Please try again.');
            setIsFormSubmit(false);
        } finally {
            setIsFormSubmit(false)
        }

    };

    const FinalSubmitTabsFormData = async () => {
        const currentTab = tabsData[activeTabIndex];
        const currentTabKey = `tab_${activeTabIndex}`;
        const currentTabFormValues = tabFormValues[currentTabKey] || {};


        const allData = {
            Master: [masterFormValues],
        }

        tabsData.forEach((tabs, index) => {
            const currentKey = `tab_${index}`
            if (tabs.Settings.isTable === "true") {
                allData[tabs.TabName] = tabTableData[currentKey]
            } else {
                allData[tabs.TabName] = Object.keys(tabFormValues[currentKey]).length > 0
                    ? [tabFormValues[currentKey]]
                    : [];
            }
            // allData[tabs.TabName] = tabFormValues[currentKey]
        })


        const xDataJson = JSON.stringify(sanitizePayload(allData));

        setIsFormSubmit(true);
        try {
            const saveNextAPI = currentTab.Settings.MakerSaveAPI;

            const jUi = Object.entries(saveNextAPI.J_Ui)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            const jApi = Object.entries(saveNextAPI.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            // Create X_DataJson with current tab form values
            // const xDataJson = JSON.stringify(currentTabFormValues);

            // Replace placeholders in X_Filter_Multiple
            let xFilterMultiple = '';
            Object.entries(saveNextAPI.X_Filter_Multiple).forEach(([key, value]) => {
                if (editData && editData[key] !== undefined && editData[key] !== null) {
                    xFilterMultiple += `<${key}>${editData[key]}</${key}>`;
                }
                // Otherwise use the default value from masterEntry
                else if (masterFormValues[key] || currentTabFormValues[key]) {
                    xFilterMultiple += `<${key}>${masterFormValues[key] || currentTabFormValues[key]}</${key}>`;
                } else {
                    let finalValue = value;
                    if (typeof value === 'string' && value.includes('##')) {
                    // Replace placeholders with actual values
                    finalValue = value.replace(/##(\w+)##/g, (match, placeholder) => {
                        return currentTabFormValues[placeholder] || '';
                    });
                }
                    xFilterMultiple += `<${key}>${finalValue}</${key}>`;
                }
            });

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql></Sql>
                <X_Filter></X_Filter>
                <X_Filter_Multiple>${xFilterMultiple}</X_Filter_Multiple>
                <X_DataJson>${xDataJson}</X_DataJson>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            const responseMessageFlag = response?.data?.data?.rs0?.[0]

            if (response?.data?.success && responseMessageFlag.Flag?.toLowerCase() === "s") {
                toast.success(responseMessageFlag?.Message || "Form Submitted")
                setIsFormSubmit(false);
                resetTabsForm();
            }else if(response?.data?.success && responseMessageFlag?.Flag?.toLowerCase() === "e"){
                toast.error(responseMessageFlag?.Message || "Submission failed");
                setIsFormSubmit(false);
            }
            else if(response?.data?.success){
                const message1 = response?.data?.message.replace(/<\/?Message>/g, '');
                toast.success(message1 || "Form Submitted");
                setIsFormSubmit(false);
                resetTabsForm();
            } else {
                const message1 = response?.data?.message.replace(/<\/?Message>/g, '');
                const message = message1 || responseMessageFlag?.Message || 'Submission failed';
                toast.warning(message);
                setIsFormSubmit(false);
            }
        } catch (error) {
            console.error('Error submitting tab form:', error);
            toast.error('Failed to submit the form. Please try again.');
            setIsFormSubmit(false);
        }

    };

    // Helper to generate unique id for table rows
    const generateUniqueId = () => {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    // Get columns for current tab table (only those with isVisibleinTable === "true")
    const getTabTableColumns = (tab) => {
        if (!tab || !tab.Data) return [];
        return tab.Data.filter(field => field.isVisibleinTable === "true").map(field => field.wKey);
    };

    const resetTabsForm = () => {
        setTabsData([]);
        setActiveTabIndex(0);
        setTabFormValues({});
        setTabDropdownOptions({});
        setTabLoadingDropdowns({});
        setTabTableData({});
        setFieldErrors({});
        setIsEdit(false);
        setEntryEditData?.(null);
        onClose();
        setViewMode(false);
        refreshFunction?.();
        setFinalTabSubmitSuccess(false);
    };


    const checkIfMinor = (dob: string) => {
        if (!dob) {
            setIsMinor(false);
            return false;
        }

        const birthDate = moment(dob, 'YYYYMMDD');
        if (!birthDate.isValid()) {
            setIsMinor(false);
            return false;
        }

        const age = moment().diff(birthDate, 'years');
        const minor = age < 18;
        setIsMinor(minor);
        return minor;
    };

    const checkIfMinorforTable = (dob: string) => {
        if (!dob) {
            return false;
        }

        const birthDate = moment(dob, 'YYYYMMDD');
        if (!birthDate.isValid()) {
            return false;
        }

        const age = moment().diff(birthDate, 'years');
        const minor = age < 18;
        return minor;
    };

    // In your component
    const dynamicColumns = getAllColumns(childEntriesTable);

    const handleTabTableDataEdit = (row: any, idx: any) => {
        const currentTab = tabsData[activeTabIndex];
        const currentTabKey = `tab_${activeTabIndex}`;
        const currentTabFormValues = row || {};

        // Check if guardian details are needed
        const needsGuardianDetails = currentTab.Settings.IsChildEntryAllowed === "true" &&
            currentTab.TabName === "NomineeDetails" &&
            checkIfMinor(currentTabFormValues?.NomineeDOB);


        if (needsGuardianDetails) {
            setIsMinor(true);
            if (Object.keys(row?.guardianDetails || {}).length) {
                setGuardianFormValues(row?.guardianDetails)
            }
        }
        setTabFormValues(pre => ({
            ...pre,
            [`tab_${activeTabIndex}`]: row
        }))
        setTabsModal(true);
        setEditTabModalData(true);
        setEditTabRowIndex(idx);
    }

    const handleAddTabsFormTableRow = () => {
        const currentTab = tabsData[activeTabIndex];
        const currentTabKey = `tab_${activeTabIndex}`;
        const currentTabFormValues = tabFormValues[currentTabKey] || {};

        // Validate current tab
        const tabErrors = validateTabForm(currentTab, currentTabFormValues);
        const allErrors = { ...tabErrors };

        if (Object.keys(allErrors).length > 0) {
            setFieldErrors(allErrors);
            toast.error("Please fill all mandatory fields in the current tab before submitting.");
            return;
        }

        // Check if guardian details are needed
        const needsGuardianDetails = currentTab.Settings.IsChildEntryAllowed === "true" &&
            currentTab.TabName === "NomineeDetails" &&
            checkIfMinor(currentTabFormValues?.NomineeDOB);

        if (needsGuardianDetails) {
            const guardianTabsError = validateForm(guardianFormData, guardianFormValues);

            if (Object.keys(guardianFormValues).length === 0 || Object.keys(guardianTabsError).length > 0) {
                toast.error("Please fill all mandatory fields in Guardian details before submitting.");
                return;
            }
        }

        if (editTabModalData && editTabRowIndex !== null) {
            // Update existing row in tabTableData
            setTabTableData(prev => ({
                ...prev,
                [currentTabKey]: prev[currentTabKey].map((row, idx) =>
                    idx === editTabRowIndex ? {
                        ...currentTabFormValues,
                        _id: row._id,
                        isModified: action === "edit" && editData ? true : false,
                        isInserted: action !== "edit",
                        // Update guardian details if they exist and are being edited
                        ...(needsGuardianDetails && row.guardianDetails && {
                            guardianDetails: {
                                ...guardianFormValues,
                                _id: row.guardianDetails._id // Keep the same ID
                            }
                        }),
                        // Add guardian details if they didn't exist before but are needed now
                        ...(needsGuardianDetails && !row.guardianDetails && {
                            guardianDetails: {
                                ...guardianFormValues,
                                _id: generateUniqueId()
                            }
                        })
                    } : row
                )
            }));
        } else {
            // Add new row - conditionally include guardian details
            const newRow = {
                ...currentTabFormValues,
                _id: generateUniqueId(),
                isModified: false,
                isInserted: true,
                // Only add guardian details if conditions are met
                ...(needsGuardianDetails && {
                    guardianDetails: {
                        ...guardianFormValues,
                        _id: generateUniqueId()
                    }
                })
            };

            setTabTableData(prev => ({
                ...prev,
                [currentTabKey]: [...(prev[currentTabKey] || []), newRow]
            }));
        }

        // Reset states
        setIsMinor(false);
        setGuardianFormValues({});
        setEditTabModalData(false);
        setEditTabRowIndex(null);

        // Optionally clear form values for next entry
        setTabFormValues(prev => ({
            ...prev,
            [currentTabKey]: {}
        }));

        setTabsModal(false); // Close modal after adding/editing
    }

    const fetchGuardianFormData = async (guardianDetails,nomineeDetails?: any) => {
        setGuardianLoading(true);
        const currentTab = tabsData[activeTabIndex];
        const guardianFormFetchAPI = currentTab?.Settings?.ChildEntryAPI;
        const currentTabKey = `tab_${activeTabIndex}`;

        const currentTabFormValues = tabFormValues[currentTabKey] || {};
        try {

            const jUi = Object.entries(guardianFormFetchAPI?.J_Ui)
                ?.map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            const jApi = Object.entries(guardianFormFetchAPI?.J_Api)
                ?.map(([key, value]) => `"${key}":"${value}"`)
                .join(',');



            let xFilter = '';
            Object.entries(guardianFormFetchAPI.X_Filter).forEach(([key, value]) => {
                if (key === 'NomSerial') {
                    xFilter += `<${key}>${currentTabFormValues[key] || ""}</${key}>`;
                } else {
                    xFilter += `<${key}>${masterFormValues[key] || currentTabFormValues[key] || nomineeDetails?.[key] || value}</${key}>`;
                }
            });



            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql></Sql>
                <X_Filter>${xFilter}</X_Filter>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            let formData = response?.data?.data?.rs0[0].Data || [];


            if (editData && action === "view") {
                formData = formData.map((field: any) => ({
                    ...field,
                    FieldEnabledTag: "N"
                }));
            }

            setGuardianFormData(formData)
            const initialValues: Record<string, any> = {};
            formData.forEach((field: any) => {
                if (field.type === 'WDateBox' && field.wValue) {
                    initialValues[field.wKey] = moment(field.wValue).format('YYYYMMDD');
                } else {
                    initialValues[field.wKey] = guardianFormValues[field.wKey] || guardianDetails?.[field.wKey]  || "";
                }
            });
            setGuardianFormValues(initialValues);
            await Promise.all(
                formData?.map(async (field: FormField) => {
                    if (field.type === 'WDropDownBox' && field.wQuery) {
                        await fetchDropdownOptionsForGuardianTab(field);
                    }
                })
            );

        } catch (error) {
            console.error('Error fetching childEntry data:', error);
        } finally {
            setGuardianLoading(false);
        }

    }
  
    const handleAddNominee = (guardianDetails = {},nomineeDetails?: any) => {
        setIsGuardianModalOpen(true)
        fetchGuardianFormData(guardianDetails,nomineeDetails)
    }

    const handleClearTabTableRowEntry = () => {
        const currentTab = tabsData[activeTabIndex];
        const currentTabKey = `tab_${activeTabIndex}`;
        const currentTabFormValues = tabFormValues[currentTabKey] || {};

        // setTabsModal(false);
        // setTabTableData(prev => ({
        //     ...prev,
        //     [activeTabIndex]: []
        // }));

        setTabFormValues(pre => ({
            ...pre,
            [currentTabKey]: {}
        }))
        setIsMinor(false);
        setGuardianFormValues(null)
    }

    const handleTabTableDataDelete = (idx) => {
        const currentTabKey = `tab_${activeTabIndex}`;
        setTabTableData(prev => ({
            ...prev,
            [currentTabKey]: prev[currentTabKey].filter((_, i) => i !== idx)
        }
    ));
        setTabsData(prevTabs => {
            const newTabs = [...prevTabs];
            newTabs[activeTabIndex].tableData = newTabs[activeTabIndex]?.tableData.filter((_, i) => i !== idx);
            return newTabs;
        });
    }

    const handleGuardianFormSubmit = () => {
        setIsGuardianModalOpen(false);
    }


    if (!isOpen) return null;
    return (
        <>
            {isOpen && (
         <AccessibleModalEntry
            isOpen={isOpen}
            onClose={resetParentForm}
            title={pageName}
            parentZIndex={parentModalZindex}
            width="max-w-[80vw]"
            height="min-h-[80vh] max-h-[80vh]"
        >
                    <div className="bg-white rounded-lg w-full flex flex-col h-full">
                        <div className="sticky top-0 bg-white z-10 px-6 pt-6">
                            <div className="flex justify-between items-center mb-1 border-b pb-2">
                                <div>
                                    <h2 className="text-xl font-semibold">
                                        {pageName}
                                    </h2>
                                    {(Object.keys(filtersValueObject).length > 0 && editData && (action === "edit" || action === "view")) && (
                                        <div className="text-sm text-gray-600 mt-1">
                                            {Object.entries(filtersValueObject).map(([key, value], index) => (
                                                <span key={key} className="mr-3">
                                                    {key}: {value}
                                                    {index < Object.entries(filtersValueObject).length - 1 ? ',' : ''}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                              
                               <Button
                                className={`flex items-center text-white`}
                                onClick={() => { resetParentForm() }}
                                >
                                 <MdOutlineClose/>     Close
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            {isLoading ? (
                            <div className="text-center py-4">Loading...</div>
                        ) : isTabs ? (
                            // Tabs-based form rendering with Master always shown first
                            <>
                                {/* Master Form - Always visible at top */}
                                <div className="mb-1">
                                    <EntryForm
                                        formData={masterFormData}
                                        formValues={masterFormValues}
                                        setFormValues={setMasterFormValues}
                                        dropdownOptions={masterDropdownOptions}
                                        setDropDownOptions={setMasterDropdownOptions}
                                        loadingDropdowns={masterLoadingDropdowns}
                                        onDropdownChange={handleMasterDropdownChange}
                                        fieldErrors={fieldErrors}
                                        setFieldErrors={setFieldErrors}
                                        masterValues={masterFormValues}
                                        setFormData={setMasterFormData}
                                        setValidationModal={setValidationModal}
                                    />
                                </div>

                                {/* Other Tabs Navigation and Content - Only show if there are non-Master tabs */}
                                {tabsData.length > 0 && (
                                    <div className="border-t pt-1 relative">
                                        <div className="mb-1" style={{position: 'sticky', top: '0', zIndex: 100}}>
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
                                                                    if(isViewMode){
                                                                        setActiveTabIndex(index)
                                                                        handleTabChangeViewMode();
                                                                    }
                                                                }}
                                                                className={`py-2 px-6 border-b-2 font-medium text-sm whitespace-nowrap rounded-t-lg transition-all duration-200 ease-in-out ${
                                                                    isActive 
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

                                        {tabsData.length > 0 && tabsData[activeTabIndex] && (
                                            <>
                                                <div className="flex justify-end mb-1 gap-2">
                                                    <div className="flex item-start mr-auto">
                                                        {activeTabIndex > 0 && (

                                                                  <Button
                                                                    className={`flex items-center text-white`}
                                                                    onClick={goToPreviousTab}>                        
                                                                    <MdArrowBack/> Back                   
                                                                </Button>
                                                          
                                                        )}
                                                    </div>
                                                    {
                                                        isViewMode ?  (
                                                            <div>
                                                                {!(activeTabIndex === tabsData.length - 1) && 
                                                                
                                                                <Button
                                                                    className={`flex items-center bg-blue-500 hover:bg-blue-600 text-white`}
                                                                    onClick={() => {
                                                                        setActiveTabIndex((prev) => prev + 1)
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
                                                                const noOfRecordsAllowed = Number(tabsData[activeTabIndex]?.Settings?.maxAllowedRecords)
                                                                const currentRecords = (tabTableData[`tab_${activeTabIndex}`] || [])?.length;
                                                                if (currentRecords >= noOfRecordsAllowed) {
                                                                    toast.warning(`Max number of records allowed ${noOfRecordsAllowed}`);
                                                                }else{
                                                                    setTabsModal(true)
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
                                                                        setTabsModal(false)
                                                                        setIsMinor(false)
                                                                    }}
                                                                     >
                                                                      <MdOutlineClose/>     Close
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
                                                                            onClick={handleAddNominee}
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
                                                                            onClick={handleAddNominee}
                                                                        >
                                                                            View Guardian Details
                                                                        </Button>)
                                                                    }
                                                                </div>
                                                            )}
                                                            {(isMinor && tabsData[activeTabIndex]?.TabName === "NomineeDetails") && (
                                                                 <div className="bg-yellow-100 border-l-4 border-orange-500 text-yellow-700 p-4 mb-4">
                                                                     <p>{isViewMode ? "Click on above view Guardian button to see the Guardian details":
                                                                     "Click on above add/edit button to change or add the Nominee Guardian."}</p>
                                                                 </div>)
                                                            }
                                                            {(() => {
                                                                const currentTab = tabsData[activeTabIndex];
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
                                                                                            fontSize:"14px"
                                                                                        }}
                                                                                    >
                                                                                        {group.groupName}
                                                                                    </h6>
                                                                                )}

                                                                                <EntryForm
                                                                                    formData={group.fields}
                                                                                    formValues={tabFormValues[`tab_${activeTabIndex}`] || {}}
                                                                                    setFormValues={(values) => {
                                                                                        setTabFormValues((prev) => ({
                                                                                            ...prev,
                                                                                            [`tab_${activeTabIndex}`]:
                                                                                                typeof values === "function"
                                                                                                    ? values(prev[`tab_${activeTabIndex}`] || {})
                                                                                                    : values,
                                                                                        }));
                                                                                    }}
                                                                                    dropdownOptions={tabDropdownOptions[`tab_${activeTabIndex}`] || {}}
                                                                                    setDropDownOptions={(options) => {
                                                                                        setTabDropdownOptions((prev) => ({
                                                                                            ...prev,
                                                                                            [`tab_${activeTabIndex}`]:
                                                                                                typeof options === "function"
                                                                                                    ? options(prev[`tab_${activeTabIndex}`] || {})
                                                                                                    : options,
                                                                                        }));
                                                                                    }}
                                                                                    loadingDropdowns={tabLoadingDropdowns[`tab_${activeTabIndex}`] || {}}
                                                                                    onDropdownChange={(field) =>
                                                                                        handleTabDropdownChange(field, `tab_${activeTabIndex}`)
                                                                                    }
                                                                                    fieldErrors={fieldErrors}
                                                                                    setFieldErrors={setFieldErrors}
                                                                                    masterValues={tabFormValues[`tab_${activeTabIndex}`] || {}}
                                                                                    setFormData={(updatedFormData: FormField[]) => { 
                                                                                        const currentTab = tabsData[activeTabIndex];
                                                                                        const currentTabName = currentTab?.TabName                                                                                  ;

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
                                                                                fontSize:"14px"
                                                                            }}
                                                                        >
                                                                            {group.groupName}
                                                                        </h6>
                                                                    )}

                                                                    <EntryForm
                                                                        formData={group.fields}
                                                                        formValues={tabFormValues[`tab_${activeTabIndex}`] || {}}
                                                                        setFormValues={(values) => {
                                                                            setTabFormValues((prev) => ({
                                                                                ...prev,
                                                                                [`tab_${activeTabIndex}`]:
                                                                                    typeof values === "function"
                                                                                        ? values(prev[`tab_${activeTabIndex}`] || {})
                                                                                        : values,
                                                                            }));
                                                                        }}
                                                                        dropdownOptions={tabDropdownOptions[`tab_${activeTabIndex}`] || {}}
                                                                        setDropDownOptions={(options) => {
                                                                            setTabDropdownOptions((prev) => ({
                                                                                ...prev,
                                                                                [`tab_${activeTabIndex}`]:
                                                                                    typeof options === "function"
                                                                                        ? options(prev[`tab_${activeTabIndex}`] || {})
                                                                                        : options,
                                                                            }));
                                                                        }}
                                                                        loadingDropdowns={tabLoadingDropdowns[`tab_${activeTabIndex}`] || {}}
                                                                        onDropdownChange={(field) =>
                                                                            handleTabDropdownChange(field, `tab_${activeTabIndex}`)
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
                                                    <DataGrid
                                                        columns={[
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
                                                                                            onClick={()=>{
                                                                                                    handleAddNominee(row.guardianDetails,row)
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
                                                                                            onClick={()=>{
                                                                                                if(hasGuardianDetails){
                                                                                                    handleTabTableDataEdit(row, row._index);
                                                                                                    setTimeout(()=>{
                                                                                                        handleAddNominee(row.guardianDetails)
                                                                                                    },400)
                                                                                                }else{
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
                                                                renderCell: ({ row }) => {
                                                                    return(
                                                                    <div style={{ 
                                                                        color: row.isModified || row.isInserted ? 'green' : 'inherit'
                                                                    }}>
                                                                        {row[col]}
                                                                    </div>
                                                                )}
                                                            }))
                                                        ]}
                                                        rows={(tabTableData[`tab_${activeTabIndex}`] || []).map((row, index) => ({
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
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            // Regular form rendering (existing logic)
                            <>
                                {isThereChildEntry && (
                                    <div className="flex justify-end">
                                        <button
                                            className={`flex items-center gap-2 px-4 py-2 ${(isFormInvalid || viewMode) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-600'} text-white rounded-md`}
                                            onClick={handleFormSubmitWhenMasterOnly}
                                            disabled={isFormInvalid || viewMode || isFormSubmit}
                                        >
                                            {isFormSubmit ? "Submitting..." : (
                                                <>
                                                    <FaSave /> Save
                                                </>
                                            )}

                                        </button>
                                    </div>
                                )}
                                <EntryForm
                                    formData={masterFormData}
                                    formValues={masterFormValues}
                                    setFormValues={setMasterFormValues}
                                    dropdownOptions={masterDropdownOptions}
                                    setDropDownOptions={setMasterDropdownOptions}
                                    loadingDropdowns={masterLoadingDropdowns}
                                    onDropdownChange={handleMasterDropdownChange}
                                    fieldErrors={fieldErrors} // Pass fieldErrors
                                    setFieldErrors={setFieldErrors} // Pass setFieldErrors
                                    masterValues={masterFormValues}
                                    setFormData={setMasterFormData}
                                    setValidationModal={setValidationModal}
                                />
                                <div className="mt-1">
                                    <div className="flex justify-between items-end mb-2">

                                        {!isThereChildEntry && (
                                            <>
                                                <h3 className="text-lg font-semibold">Child Entries</h3>
                                                <div className="flex gap-3">
                                                    <Button
                                                        onClick={handleAddChildEntry}
                                                        className={`flex items-center ${isFormInvalid || viewMode || isThereChildEntry
                                                            ? 'bg-gray-400 cursor-not-allowed'
                                                            : 'bg-blue-500 hover:bg-blue-600'
                                                            } text-white rounded-md`}
                                                        disabled={isFormInvalid || viewMode || isThereChildEntry || isFormSubmit}
                                                    >
                                                        {isFormSubmit ? "Submitting..." : (
                                                            <>
                                                                <FaPlus /> Add Entry
                                                            </>
                                                        )}
                                                    </Button>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            className={`flex items-center ${(isFormInvalid || viewMode) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md`}
                                                            onClick={() => {
                                                                handleFormSubmitWhenMasterOnly()
                                                            }}
                                                            disabled={isFormInvalid || viewMode || isFormSubmit}
                                                        >
                                                            {isFormSubmit ? "Submitting..." : (
                                                                <>
                                                                    <FaSave /> Save
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            className={`flex items-center ${(!hasSelectedRecords() || viewMode) ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'} text-white rounded-md`}
                                                            onClick={()=>setIsConfirmationModalOpen(true)}
                                                            disabled={!hasSelectedRecords() || viewMode}
                                                        >
                                                            <FaTrash className="mr-2" /> Delete Selected
                                                        </Button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                        {(!isThereChildEntry && childEntriesTable?.length > 0) && (
                                         <div className="flex flex-col">
                                            <div className="overflow-x-auto overflow-y-auto flex-1">
                                            <DataGrid
                                              columns={[
                                                {
                                                    key: "",
                                                    name:"",
                                                    width: 50,
                                                    renderCell: ({row}) =>(
                                                        <input
                                                        aria-label='checked'
                                                        type="checkbox"
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
                                                        className={`mr-2 px-3 py-1 rounded-md transition-colors ${
                                                          viewMode
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
                                                        renderCell: ({ row }) => {
                                                          const value =
                                                            row[key] == null || row[key] === "" ? "-" : String(row[key]);
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
                                                height:"100%"
                                              }}
                                            />
                                            </div>
                                          </div>
                                        )}
                                </div>
                            </>
                        )}
                        </div>
                    </div>
                </AccessibleModalEntry>
            )}
            <ConfirmationModal
                isOpen={isConfirmationModalOpen}
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
            />
            <SaveConfirmationModal
                isOpen={formSubmitConfirmation}
                onConfirm={handleConfirmSaveEdit}
                onCancel={handleCancelSaveEdit}
                confirmationHeading="Please Confirm "
                confirmationMessage={`Are you sure you want to ${isEdit ? 'edit' : 'Add'} this record?`}
                cancelText="Cancel"
                confirmText="Confirm"
            />
            <CaseConfirmationModal
                isOpen={validationModal.isOpen}
                message={validationModal.message}
                type={validationModal.type}
                onConfirm={() => validationModal.callback?.(true)}
                onCancel={() => validationModal.callback?.(false)}
            />
            <div>
            </div>
            {isChildModalOpen && (
                <ChildEntryModal
                    isOpen={isChildModalOpen}
                    pageName={pageName}
                    onClose={() => {
                        setIsChildModalOpen(false);
                        setChildDropdownOptions({});
                        setChildFormData([]);
                        setChildFormValues({});
                        resetChildForm();
                    }}
                    isLoading={isLoading}
                    setChildEntriesTable={setChildEntriesTable}
                    masterValues={masterFormValues}
                    formData={childFormData}
                    masterFormData={masterFormData}
                    formValues={childFormValues}
                    setFormValues={setChildFormValues}
                    dropdownOptions={childDropdownOptions}
                    setDropDownOptions={setChildDropdownOptions}
                    loadingDropdowns={childLoadingDropdowns}
                    onDropdownChange={handleChildDropdownChange}
                    fieldErrors={fieldErrors} // Pass fieldErrors
                    setFieldErrors={setFieldErrors} // Pass setFieldErrors
                    setFormData={setChildFormData}
                    resetChildForm={resetChildForm}
                    isEdit={isEdit}
                    onChildFormSubmit={onChildFormSubmit}
                    setValidationModal={setValidationModal}
                    viewAccess={viewMode}
                    childModalZindex={childModalZindex}
                />
            )}

            {isGuardianModalOpen && (
                <GuardianFEntryForm
                    isOpen={isGuardianModalOpen}
                    onClose={() => setIsGuardianModalOpen(false)}
                    isLoading={guardianLoading}
                    formData={guardianFormData}
                    formValues={guardianFormValues}
                    setFormValues={setGuardianFormValues}
                    dropdownOptions={guardianDropdownOptions}
                    setDropDownOptions={setGuardianDropdownOptions}
                    loadingDropdowns={guardianLoadingDropdowns}
                    onDropdownChange={handleGuardianDependentOptions}
                    setValidationModal={setValidationModal}
                    childModalZindex={childModalZindex}
                    viewAccess={viewMode}
                    fieldErrors={fieldErrors}
                    setFieldErrors={setFieldErrors}
                    onChildFormSubmit={handleGuardianFormSubmit}
                    isEdit={editTabModalData}
                    colors={colors}
                />
            )}
        </>
    );
};

export default EntryFormModal;
