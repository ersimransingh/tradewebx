"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import moment from 'moment';
import { FaPlus, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ConfirmationModal from './Modals/ConfirmationModal';
import CaseConfirmationModal from './Modals/CaseConfirmationModal';

import { ApiResponse, EntryFormModalProps, FormField, ChildEntryModalProps, TabData, GroupedFormData, GuardianEntryModalProps } from '@/types';
import EntryForm from './component-forms/EntryForm';
import { handleValidationForDisabledField } from './component-forms/form-helper';
import apiService from '@/utils/apiService';
import SaveConfirmationModal from './Modals/SaveConfirmationModal';
import { groupFormData } from './component-forms/form-helper/utils';
import { getLocalStorage } from '@/utils/helper';



const validateForm = (formData, formValues) => {
    const errors = {};

    formData.forEach(field => {
        if (field.FieldEnabledTag === "Y" && field.isMandatory === "true" && field.type !== "WDisplayBox") {
            if (!formValues[field.wKey] || formValues[field.wKey]?.toString()?.trim() === "") {
                errors[field.wKey] = `${field.label} is required`;
            }
        }
    });

    return errors;
};


// Helper function to generate unique ID
const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const ChildEntryModal: React.FC<ChildEntryModalProps> = ({
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
                    Id: generateUniqueId()
                };
                return [...updatedEntries, entryToAdd];
            });

            onChildFormSubmit();
        }
    };
    return (
        <div className={`fixed inset-0 flex items-center justify-center ${childModalZindex}`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-lg p-6 w-full max-w-[80vw] overflow-y-auto min-h-[75vh] max-h-[75vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{isEdit ? "Edit " : "Add "} Child Entry Form</h2>
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
                            <button
                                onClick={resetChildForm}
                                className={`px-4 py-2 rounded-md mr-2 ${viewAccess
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                disabled={viewAccess}
                            >
                                Reset
                            </button>
                            <button
                                onClick={handleFormSubmit}
                                disabled={viewAccess || isChildInvalid}
                                className={`px-4 py-2 rounded-md ${(viewAccess || isChildInvalid)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                    }`}
                            >
                                Submit
                            </button>
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

    console.log("check form data", formData)
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
                    <h2 className="text-xl font-semibold">Add Guardian Details</h2>
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
                            <button
                                onClick={resetChildForm}
                                className={`px-4 py-2 rounded-md mr-2 ${viewAccess
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                disabled={viewAccess}
                            >
                                Reset
                            </button>
                            <button
                                onClick={handleFormSubmit}
                                disabled={viewAccess || isChildInvalid}
                                className={`px-4 py-2 rounded-md ${(viewAccess || isChildInvalid)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                    }`}
                            >
                                Submit
                            </button>
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
                                                    border: group.groupName ? "1px solid #ccc" : "none",
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
                                                            background: "#f7f7f7",
                                                            padding: "6px 10px",
                                                            borderRadius: "4px",
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
const EntryFormModal: React.FC<EntryFormModalProps> = ({ isOpen, onClose, pageData, editData, action, setEntryEditData, refreshFunction, isTabs, childModalZindex = 'z-200', parentModalZindex = 'z-100' }) => {

    const [formSubmitConfirmation, setFormSubmitConfirmation] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(false);
    const [masterFormData, setMasterFormData] = useState<FormField[]>([]);
    const [masterFormValues, setMasterFormValues] = useState<Record<string, any>>({});
    const [masterDropdownOptions, setMasterDropdownOptions] = useState<Record<string, any[]>>({});
    const [masterLoadingDropdowns, setMasterLoadingDropdowns] = useState<Record<string, boolean>>({});
    const [isChildModalOpen, setIsChildModalOpen] = useState(false);
    const [childEntriesTable, setChildEntriesTable] = useState<any[]>([]);
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
    console.log("<------------------check data--------------------->", tabTableData)


    console.log("check tabs data===>", tabsData[activeTabIndex]?.Settings?.isTable, tabFormValues, tabsData, masterFormValues)

    const childEntryPresent = pageData[0]?.Entry?.ChildEntry;
    const isThereChildEntry = !isTabs && (!childEntryPresent || Object.keys(childEntryPresent).length === 0);
    const isViewMode = action === "view" ? true : false

    const [validationModal, setValidationModal] = useState<{
        isOpen: boolean;
        message: string;
        type: 'M' | 'S' | 'E' | 'D';
        callback?: (confirmed: boolean) => void;
    }>({ isOpen: false, message: '', type: 'M' });

    const [viewMode, setViewMode] = useState<boolean>(false);

    const fetchTabsData = async (editData?: any, viewMode: boolean = false) => {
        console.log('fetchTabsData called with:', { pageData, isTabs, isOpen });
        if (!pageData?.[0]) {
            console.error('fetchTabsData: pageData[0] is not available');
            return;
        }

        console.log('fetchTabsData: pageData[0]:', pageData[0]);
        console.log('fetchTabsData: pageData[0].Entry:', pageData[0].Entry);

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

            console.log('fetchTabsData: masterEntry:', masterEntry);
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
                    // If we have edit data and the key exists in it, use that value
                    if (editData && editData[key] !== undefined && editData[key] !== null) {
                        xFilter += `<${key}>${editData[key]}</${key}>`;
                    }
                    // Otherwise use the default value from masterEntry
                    else if (value === '##InstrumentType##' || value === '##IntRefNo##') {
                        xFilter += `<${key}></${key}>`;
                    } else {
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

            if (response?.data?.data?.rs0) {
                const allTabs: TabData[] = response.data.data.rs0;
                console.log('All tabs received:', allTabs.map(tab => ({ TabName: tab.TabName })));

                // Find and extract Master tab data
                const masterTab = allTabs.find(tab =>
                    tab.TabName && tab.TabName.toLowerCase().trim() === 'master'
                );

                console.log('Master tab found:', masterTab ? masterTab.TabName : 'Not found');

                // Filter out Master tab from tabs navigation - be more comprehensive
                const tabs = allTabs.filter(tab =>
                    tab.TabName &&
                    tab.TabName.toLowerCase().trim() !== 'master' &&
                    tab.TabName.toLowerCase().trim() !== 'master form'
                );

                console.log('Filtered tabs:', tabs.map(tab => ({ TabName: tab.TabName })));

                // Set up master form data from Master tab
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
                    const initialMasterValues: Record<string, any> = {};
                    masterFormData.forEach((field: FormField) => {
                        if (field.type === 'WDateBox' && field.wValue) {
                            initialMasterValues[field.wKey] = moment(field.wValue).format('YYYYMMDD');
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
                    console.log("-------------->", initialTabTableData[tabKey])

                    // Initialize form values with any preset values
                    tab.Data.forEach((field: FormField) => {
                        if (field.type === 'WDateBox' && field.wValue) {
                            initialTabFormValues[tabKey][field.wKey] = moment(field.wValue).format('YYYYMMDD');
                        } else if (tab.tableData.length && tab.Settings.isTable === "false") {
                            initialTabFormValues[tabKey][field.wKey] = tab.tableData[0][field.wKey];
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
        const formValues = isChild ? childFormValues : masterFormValues;

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

    const fetchGuardianDependentOptions = async (field: FormField, parentValue: string, isChild: boolean = false) => {
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
                            if (!guardianFormValues[fieldName] && !masterFormValues[fieldName]) {
                                toast.error(`Please select the field: ${fieldName}`);
                                return;
                            }
                            xFilter += `<${fieldName}>${guardianFormValues[fieldName] || masterFormValues[fieldName] || ''}</${fieldName}>`;
                        }
                    });
                } else {
                    xFilter = `<${field.dependsOn.field}>${parentValue}</${field.dependsOn.field}>`;
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
    const fetchDependentOptions = async (field: FormField, parentValue: string, isChild: boolean = false) => {
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
                            if (!childFormValues[fieldName] && !masterFormValues[fieldName]) {
                                toast.error(`Please select the field: ${fieldName}`);
                                return;
                            }
                            xFilter += `<${fieldName}>${childFormValues[fieldName] || masterFormValues[fieldName] || ''}</${fieldName}>`;
                        }
                    });
                } else {
                    xFilter = `<${field.dependsOn.field}>${parentValue}</${field.dependsOn.field}>`;
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

            //setting the dependent field value to empty if master dropdown values is changed to reselect the value
            // setDependentfieldEmpty(prev => ({ ...prev, [field.wKey]: '' }));

        } catch (error) {
            console.error(`Error fetching dependent options for ${field.wKey}:`, error);
        } finally {
            setLoadingDropdowns(prev => ({ ...prev, [field.wKey]: false }));
        }
    };

    const fetchTabsDependentOptions = async (field: FormField, tabKey: string) => {
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
                                console.log("check list array", individualField, tabFormValues?.[tabKey][individualField]);
                                if (!tabFormValues?.[tabKey][individualField] && !masterFormValues[individualField]) {
                                    toast.error(`Please select the field: ${individualField}`);
                                    return;
                                }
                                xFilter += `<${individualField}>${tabFormValues?.[tabKey][individualField] || masterFormValues[individualField] || ''}</${individualField}>`;
                            });
                        } else {
                            // Normal case - fieldName is already a single field name
                            console.log("check list array", fieldName, tabFormValues?.[tabKey][fieldName]);
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
        console.log('fetchMasterEntryData called with:', { pageData, isTabs, isOpen });

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
            console.log("check isEditData", isEditData);

            console.log('fetchMasterEntryData: masterEntry:', masterEntry);
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

            // THEN: Process validations sequentially
            for (const field of formData) {
                if (Object.keys(field?.ValidationAPI).length > 0 && isEditData && !isViewMode) {
                    await handleValidationForDisabledField(
                        field,
                        editData,
                        masterFormValues,
                        (updates) => allUpdates.push(...updates)
                    );
                }
            }

            if (isEditData && !isViewMode) {
                console.log("check all updates===>", allUpdates);
                setMasterFormData(() => {
                    const newFormData = [...formData];
                    console.log("check updates", allUpdates);
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

            console.log("check all updates", allUpdates);

            // FIRST: Process all dropdown options in parallel
            await Promise.all(
                response.data?.data?.rs0?.map(async (field: FormField) => {
                    if (field.type === 'WDropDownBox' && field.wQuery) {
                        await fetchDropdownOptions(field, true);
                    }
                })
            );

            // THEN: Process validations sequentially
            for (const field of response.data?.data?.rs0 || []) {
                if (Object.keys(field?.ValidationAPI).length > 0 && isEditData && !isViewMode) {
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
                    console.log("check updates", allUpdates);
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
                    console.log("check new values", allUpdates)
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

    const deleteChildRecord = async () => {
        try {

            const entry = pageData[0].Entry;
            const masterEntry = entry.MasterEntry;
            const pageName = pageData[0]?.wPage || "";

            const sql = Object.keys(masterEntry?.sql || {}).length ? masterEntry.sql : "";

            const jUi = Object.entries(masterEntry.J_Ui)
                .map(([key, value]) => {
                    if (key === 'Option') {
                        return `"${key}":"edit"`;
                    }
                    if (key === 'ActionName') {
                        return `"${key}":"${pageName}"`;
                    }
                    return `"${key}":"${value}"`

                })
                .join(',');

            const jApi = Object.entries(masterEntry.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            const createXmlTags = (data) => {
                const seenTags = new Set(); // Track seen tags to avoid duplicates

                return Object.entries(data).map(([key, value]) => {
                    if (seenTags.has(key)) {
                        return ''; // Skip duplicate tags
                    }
                    seenTags.add(key);

                    if (Array.isArray(value)) {
                        return `<${key}>${value.map(item => `<item>${createXmlTags(item)}</item>`).join('')}</${key}>`;
                    } else if (typeof value === 'object' && value !== null) {
                        return `<${key}>${createXmlTags(value)}</${key}>`;
                    } else if (value) {
                        return `<${key}>${value}</${key}>`;
                    } else {
                        return `<${key}></${key}>`; // Keep empty tag if no value
                    }
                }).filter(Boolean).join(''); // Remove any empty strings
            };


            const xData = createXmlTags({
                ...masterFormValues,
                items: { item: { ...childFormValues, IsDeleted: true } },
                UserId: "ANUJ"
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
                fetchMasterEntryData(masterFormValues)
                setIsConfirmationModalOpen(false);
                toast.success('Child Record Deleted')
            }

        } catch (error) {
            console.error(`Error fetching options for   `);
        } finally {
            console.log("check delete record");
        }


    }

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
        if (childFormValues && childFormValues?.Id) {
            const filteredData = childEntriesTable.filter((item: any) => item.Id !== childFormValues?.Id);
            setChildEntriesTable(filteredData);
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
                .map(([key, value]) => `<${key}>${value}</${key}>`)
                .join('');
            return `<item>${itemTags}</item>`;
        }).join('');

        const masterXml = Object.entries(masterValues)
            .map(([key, value]) => `<${key}>${value}</${key}>`)
            .join('');

        const xData = `<X_Data>
        ${masterXml}
        <items>
            ${itemsXml}
        </items>
        <UserId>ANUJ</UserId>
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
                toast.success('Form submitted successfully!');
                setIsFormSubmit(false);
                resetParentForm();
                if (response?.data?.message) {
                    const messageTxtPresent = response?.data?.message
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
                fetchTabsDependentOptions(field, tabKey);
                console.log('Handle dependent dropdown for tab:----------->', tabKey, tabFormValues?.[tabKey]['PinCode']);
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

    const submitTabsFormData = async () => {
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

        const allData = {
            Master: [masterFormValues],
        }

        if (currentTab.Settings.isTable === "true") {
            allData[currentTab.TabName] = tabTableData[currentTabKey] || []
        } else {
            allData[currentTab.TabName] = Object.keys(currentTabFormValues).length > 0
                ? [currentTabFormValues]
                : [];

        }

        console.log("check xdatajson", allData);
        const xDataJson = JSON.stringify(allData);
        console.log("check xdatajson", allData);

        setIsFormSubmit(true);
        try {
            const saveNextAPI = currentTab.Settings.SaveNextAPI;

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

            if (response?.data?.success) {
                toast.success('Tab form submitted successfully!');
                setIsFormSubmit(false);

                // Check if there are more tabs to navigate to
                if (activeTabIndex < tabsData.length - 1) {
                    setActiveTabIndex(activeTabIndex + 1);
                    toast.info(`Moved to next tab: ${tabsData[activeTabIndex + 1].TabName}`);
                } else {
                    // All tabs completed, close modal
                    // resetTabsForm();
                }
            } else {
                const message = response?.data?.message?.replace(/<\/?Message>/g, '') || 'Submission failed';
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
            Master: masterFormValues,
        }

        tabsData.forEach((tabs, index) => {
            const currentKey = `tab_${index}`
            if (tabs.Settings.isTable === "true") {
                allData[tabs.TabName] = tabTableData[currentKey]
            } else {
                allData[tabs.TabName] = tabFormValues[currentKey]
            }
        })

        console.log("check all data", allData);


        const xDataJson = JSON.stringify(allData);
        console.log("json", xDataJson)

        setIsFormSubmit(true);
        try {
            const saveNextAPI = currentTab.Settings.SaveNextAPI;

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

            if (response?.data?.success) {
                toast.success('Tab form submitted successfully!');
                setIsFormSubmit(false);
                // resetTabsForm();
            } else {
                const message = response?.data?.message?.replace(/<\/?Message>/g, '') || 'Submission failed';
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
    };

    // In your component
    const dynamicColumns = getAllColumns(childEntriesTable);

    const handleTabTableDataEdit = (row: any, idx: any) => {
        setTabFormValues(pre => ({
            ...pre,
            [`tab_${activeTabIndex}`]: row
        }))
        setTabsModal(true);
        setEditTabModalData(true);
        setEditTabRowIndex(idx);
    }


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
            console.log("in this loop----------->", guardianFormValues, guardianTabsError, guardianFormData);

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
                    idx === editTabRowIndex ? { ...currentTabFormValues, _id: row._id } : row
                )
            }));
        } else {
            // Add new row - conditionally include guardian details
            const newRow = {
                ...currentTabFormValues,
                _id: generateUniqueId(),
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
            setIsMinor(false);
            setGuardianFormValues(null)

        }

        // Reset edit state
        setEditTabModalData(false);
        setEditTabRowIndex(null);

        // Optionally clear form values for next entry
        setTabFormValues(pre => ({
            ...pre,
            [currentTabKey]: {}
        }));

        setTabsModal(false); // Close modal after adding/editing
    }

    const fetchGuardianFormData = async () => {
        const currentTab = tabsData[activeTabIndex];
        const guardianFormFetchAPI = currentTab?.Settings?.ChildEntryAPI;
        const currentTabKey = `tab_${activeTabIndex}`;

        const currentTabFormValues = tabFormValues[currentTabKey] || {};

        try {

            const jUi = Object.entries(guardianFormFetchAPI.J_Ui)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            const jApi = Object.entries(guardianFormFetchAPI.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');



            let xFilter = '';
            Object.entries(guardianFormFetchAPI.X_Filter).forEach(([key, value]) => {
                if (key === 'NomSerial') {
                    xFilter += `<${key}>${currentTabFormValues[key] || ""}</${key}>`;
                } else {
                    xFilter += `<${key}>${masterFormValues[key] || currentTabFormValues[key] || value}</${key}>`;
                }
            });



            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql></Sql>
                <X_Filter>${xFilter}</X_Filter>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            const formData = response?.data?.data?.rs0[0].Data || [];

            setGuardianFormData(formData)
            const initialValues: Record<string, any> = {};
            formData.forEach((field: any) => {
                if (field.type === 'WDateBox' && field.wValue) {
                    initialValues[field.wKey] = moment(field.wValue).format('YYYYMMDD');
                } else {
                    initialValues[field.wKey] = '';
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
        }

    }

    const handleAddNominee = () => {
        setIsGuardianModalOpen(true)
        fetchGuardianFormData()
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
        }));
        setTabsData(prevTabs => {
            const newTabs = [...prevTabs];
            newTabs[activeTabIndex].tableData = newTabs[activeTabIndex].tableData.filter((_, i) => i !== idx);
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
                <div className={`fixed inset-0 flex items-center justify-center ${parentModalZindex}`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <div className="bg-white rounded-lg p-6 w-full max-w-[80vw] overflow-y-auto min-h-[75vh] max-h-[75vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">
                                {isTabs
                                    ? `${isEdit ? "Edit " : "Add "}Master Form`
                                    : `${isEdit ? "Edit " : "Add "}Entry Form`
                                }
                            </h2>
                            <button
                                onClick={() => { resetParentForm() }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-4">Loading...</div>
                        ) : isTabs ? (
                            // Tabs-based form rendering with Master always shown first
                            <>
                                {/* Master Form - Always visible at top */}
                                <div className="mb-8">
                                    {/* <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                                        <h3 className="text-lg font-semibold text-blue-800">Master</h3>
                                    </div> */}
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
                                    <div className="border-t pt-6">
                                        <div className="mb-6">
                                            <div className="border-b border-gray-200">
                                                <nav className="-mb-px flex space-x-8">
                                                    {tabsData.map((tab, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => setActiveTabIndex(index)}
                                                            className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTabIndex === index
                                                                ? 'border-blue-500 text-blue-600'
                                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                                }`}
                                                        >
                                                            {tab.TabName}
                                                        </button>
                                                    ))}
                                                </nav>
                                            </div>
                                        </div>

                                        {tabsData.length > 0 && tabsData[activeTabIndex] && (
                                            <>
                                                <div className="flex justify-end mb-4 gap-2">
                                                    {tabsData[activeTabIndex].Settings.isTable === "true" && (
                                                        <button
                                                            className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md`}
                                                            onClick={() => setTabsModal(true)}
                                                        >
                                                            Add Entry
                                                        </button>
                                                    )}
                                                    <button
                                                        className={`flex items-center gap-2 px-4 py-2 ${isFormInvalid || viewMode
                                                            ? 'bg-gray-400 cursor-not-allowed'
                                                            : 'bg-blue-500 hover:bg-blue-600'
                                                            } text-white rounded-md`}
                                                        onClick={submitTabsFormData}
                                                        disabled={isFormInvalid || viewMode || isFormSubmit}
                                                    >
                                                        {isFormSubmit ? "Submitting..." : (
                                                            <>
                                                                <FaSave />
                                                                {activeTabIndex < tabsData.length - 1 ? "Save & Next" : "Save"}
                                                            </>
                                                        )}
                                                    </button>
                                                    {
                                                        activeTabIndex === tabsData.length - 1 && (
                                                            <button
                                                                className={`flex items-center gap-2 px-4 py-2 ${isFormInvalid || viewMode
                                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                                    : 'bg-blue-500 hover:bg-blue-600'
                                                                    } text-white rounded-md`}
                                                                onClick={FinalSubmitTabsFormData}
                                                                disabled={isFormInvalid || viewMode || isFormSubmit}
                                                            >
                                                                {isFormSubmit ? "Submitting..." : (
                                                                    <>
                                                                        <FaSave />
                                                                        {"Final Submit"}
                                                                    </>
                                                                )}
                                                            </button>
                                                        )
                                                    }
                                                </div>
                                                {tabsModal && (
                                                    <div className={`fixed inset-0 flex items-center justify-center z-400`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                                                        <div className="bg-white rounded-lg p-6 w-full max-w-[80vw] overflow-y-auto min-h-[75vh] max-h-[75vh]">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h2 className="text-xl font-semibold">
                                                                    {editTabModalData ? 'Edit Data' : "Add Data"}
                                                                </h2>
                                                                <button
                                                                    onClick={() => setTabsModal(false)}
                                                                    className="text-gray-500 hover:text-gray-700"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                            <div className='flex justify-end mb-2 gap-2'>
                                                                <button
                                                                    className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md`}
                                                                    onClick={handleClearTabTableRowEntry}
                                                                >
                                                                    cancel
                                                                </button>
                                                                <button
                                                                    className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md`}
                                                                    onClick={handleAddTabsFormTableRow}
                                                                >
                                                                    Add
                                                                </button>
                                                                {
                                                                    isMinor && (<button
                                                                        className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md`}
                                                                        onClick={handleAddNominee}
                                                                    >
                                                                        Add Guardian Details
                                                                    </button>)
                                                                }
                                                            </div>
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
                                                                                    border: group.groupName ? "1px solid #ccc" : "none",
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
                                                                                            background: "#f7f7f7",
                                                                                            padding: "6px 10px",
                                                                                            borderRadius: "4px",
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
                                                                                    setFormData={() => { }}
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
                                                                        border: group.groupName ? "1px solid #ccc" : "none",
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
                                                                                background: "#f7f7f7",
                                                                                padding: "6px 10px",
                                                                                borderRadius: "4px",
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
                                                                        setFormData={() => { }}
                                                                        setValidationModal={setValidationModal}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}

                                                {tabsData[activeTabIndex]?.Settings?.isTable === "true" && (
                                                    <div className="overflow-x-auto mt-4">
                                                        <table className="min-w-full bg-white border border-gray-200">
                                                            <thead>
                                                                <tr>
                                                                    <th className="px-4 py-2 border-b">Actions</th>
                                                                    {getTabTableColumns(tabsData[activeTabIndex]).map(col => (
                                                                        <th key={col} className="px-4 py-2 border-b capitalize">{col}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(tabTableData[`tab_${activeTabIndex}`] || [])?.map((row, idx) => (
                                                                    <tr key={row._id}>
                                                                        <td className="px-4 py-2 border-b">
                                                                            {/* Add Edit/Delete buttons here if needed */}
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    className={`mr-2 px-3 py-1 rounded-md transition-colors bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700`}
                                                                                    onClick={() => {
                                                                                        handleTabTableDataEdit(row, idx);
                                                                                    }}>
                                                                                    Edit
                                                                                </button>
                                                                                <button
                                                                                    className={`px-3 py-1 rounded-md transition-colors bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700`}
                                                                                    onClick={() => handleTabTableDataDelete(idx)}
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            </div>

                                                                        </td>
                                                                        {getTabTableColumns(tabsData[activeTabIndex]).map(col => (
                                                                            <td key={col} className="px-4 py-2 border-b">{row[col] ?? "-"}</td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
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
                                            className={`flex items-center gap-2 px-4 py-2 ${(isFormInvalid || viewMode) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md`}
                                            onClick={handleFormSubmitWhenMasterOnly}
                                            disabled={isFormInvalid || viewMode || isFormSubmit}
                                        >
                                            {isFormSubmit ? "Submitting..." : (
                                                <>
                                                    <FaSave /> Save Form
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
                                <div className="mt-8">
                                    <div className="flex justify-between items-end mb-4">

                                        {!isThereChildEntry && (
                                            <>
                                                <h3 className="text-lg font-semibold">Child Entries</h3>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={handleAddChildEntry}
                                                        className={`flex items-center gap-2 px-4 py-2 ${isFormInvalid || viewMode || isThereChildEntry
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
                                                    </button>
                                                    <button
                                                        className={`flex items-center gap-2 px-4 py-2 ${(isFormInvalid || viewMode) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md`}
                                                        onClick={() => {
                                                            handleFormSubmitWhenMasterOnly()
                                                        }}
                                                        disabled={isFormInvalid || viewMode || isFormSubmit}
                                                    >
                                                        {isFormSubmit ? "Submitting..." : (
                                                            <>
                                                                <FaSave /> Save Form
                                                            </>
                                                        )}

                                                    </button>
                                                </div>
                                            </>
                                        )}


                                    </div>
                                    {!isThereChildEntry && (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full bg-white border border-gray-200">
                                                <thead>
                                                    <tr>
                                                        {/* Static headers */}
                                                        <th className="px-4 py-2 border-b" style={{ width: columnWidthMap['Sr. No'] || 'auto', minWidth: columnWidthMap['Sr. No'] ? '50px' : '80px' }}>Sr. No</th>
                                                        <th className="px-4 py-2 border-b" style={{ width: columnWidthMap['Actions'] || 'auto', minWidth: columnWidthMap['Actions'] ? '50px' : '120px' }}>Actions</th>

                                                        {/* Dynamic headers - get all unique keys from the first entry */}
                                                        {childEntriesTable.length > 0 && Object.keys(childEntriesTable[0]).map((key) => (
                                                            key !== "SerialNo" && // Exclude SerialNo as it has its own column
                                                            <th
                                                                key={key}
                                                                className="px-4 py-2 border-b capitalize"
                                                                style={{
                                                                    width: columnWidthMap[key] || 'auto',
                                                                    minWidth: columnWidthMap[key] ? Math.min(50, Math.floor(columnWidthMap[key] * 0.5)) + 'px' : '80px',
                                                                    maxWidth: columnWidthMap[key] ? Math.max(400, Math.floor(columnWidthMap[key] * 2)) + 'px' : '300px'
                                                                }}
                                                            >
                                                                {key}
                                                            </th>
                                                        ))}

                                                        {/* Static headers */}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {childEntriesTable.map((entry, index) => {
                                                        // Create a safe entry object with all dynamic columns initialized
                                                        const safeEntry = { ...entry };
                                                        dynamicColumns.forEach(col => {
                                                            if (!(col in safeEntry)) {
                                                                safeEntry[col] = "";
                                                            }
                                                        });

                                                        return (
                                                            <tr key={index}>
                                                                {/* Serial number */}
                                                                <td
                                                                    className="px-4 py-2 border-b text-center"
                                                                    style={{
                                                                        width: columnWidthMap['Sr. No'] || 'auto',
                                                                        minWidth: columnWidthMap['Sr. No'] ? '50px' : '80px'
                                                                    }}
                                                                >
                                                                    {index + 1}
                                                                </td>

                                                                {/* Actions */}
                                                                <td
                                                                    className="px-4 py-2 text-center border-b"
                                                                    style={{
                                                                        width: columnWidthMap['Actions'] || 'auto',
                                                                        minWidth: columnWidthMap['Actions'] ? '50px' : '120px'
                                                                    }}
                                                                >
                                                                    <div className='flex gap-1'>
                                                                        {viewMode && (
                                                                            <button
                                                                                className="bg-green-50 text-green-500 hover:bg-green-100 hover:text-green-700 mr-2 px-3 py-1 rounded-md transition-colors"
                                                                                onClick={() => {
                                                                                    setChildFormValues(entry);
                                                                                    handleChildEditNonSavedData(entry);
                                                                                }}
                                                                            >
                                                                                view
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            className={`mr-2 px-3 py-1 rounded-md transition-colors ${viewMode
                                                                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                                                : 'bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700'
                                                                                }`}
                                                                            onClick={() => {
                                                                                setChildFormValues(entry);
                                                                                handleChildEditNonSavedData(entry);

                                                                            }}
                                                                            disabled={viewMode}
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            className={`px-3 py-1 rounded-md transition-colors ${viewMode
                                                                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                                                : 'bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700'
                                                                                }`}
                                                                            onClick={() => {
                                                                                setChildFormValues(entry);
                                                                                setIsConfirmationModalOpen(true);
                                                                            }}
                                                                            disabled={viewMode}
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </td>

                                                                {/* Dynamic values */}
                                                                {dynamicColumns.map((key) => {
                                                                    const cellValue = safeEntry[key] == null || safeEntry[key] === "" ? "-" : String(safeEntry[key]);

                                                                    return (
                                                                        <td
                                                                            key={key}
                                                                            className="px-4 py-2 border-b text-center truncate"
                                                                            style={{
                                                                                width: columnWidthMap[key] || 'auto',
                                                                                minWidth: columnWidthMap[key] ? Math.min(50, Math.floor(columnWidthMap[key] * 0.5)) + 'px' : '80px',
                                                                                maxWidth: columnWidthMap[key] ? Math.max(400, Math.floor(columnWidthMap[key] * 2)) + 'px' : '300px',
                                                                                whiteSpace: 'nowrap',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis',
                                                                            }}
                                                                            title={cellValue} // Show full text on hover
                                                                        >
                                                                            {cellValue}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                </div>
                            </>
                        )}
                    </div>
                </div>
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
                />
            )}
        </>
    );
};

export default EntryFormModal;