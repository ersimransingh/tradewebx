"use client";
import React, { useState, useEffect } from 'react';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import moment from 'moment';
import { FaPlus, FaSave, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ConfirmationModal from './Modals/ConfirmationModal';
import CaseConfirmationModal from './Modals/CaseConfirmationModal';
import { MdArrowBack, MdOutlineClose } from "react-icons/md";
import { EntryFormModalProps, FormField, ChildEntryModalProps, TabData, GroupedFormData, GuardianEntryModalProps } from '@/types';
import EntryForm from './component-forms/EntryForm';
import { handleValidationForDisabledField } from './component-forms/form-helper';
import apiService from '@/utils/apiService';
import SaveConfirmationModal from './Modals/SaveConfirmationModal';
import { extractTagsForTabsDisabling, generateUniqueId, getFieldValue, groupFormData, parseXMLStringToObject, validateForm, convertXmlToModifiedFormData } from './component-forms/form-helper/utils';
import { formatTextSplitString, getLocalStorage, sanitizeValueSpecialChar, sanitizePayload } from '@/utils/helper';
import { useTheme } from '@/context/ThemeContext';
import Button from './ui/button/Button';
import { DataGrid } from 'react-data-grid';
import { handleNextValidationFields, executeEditValidateApi } from './component-forms/form-helper/apiHelper';
import AccessibleModalEntry from './a11y/AccessibleModalEntry';
import ChildEntryModal from './EntryForm/ChildEntryModal';
import GuardianEntryForm from './EntryForm/GuardianEntryForm';
import TabContent from './EntryForm/TabContent';
import ChildEntriesTable from './EntryForm/ChildEntriesTable';
// Placeholder if columnWidthMap is not defined
const columnWidthMap: Record<string, number> = {};


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
  
    const [childFormData, setChildFormData] = useState<FormField[]>([]);
    const [childFormValues, setChildFormValues] = useState<Record<string, any>>({});
    const [childDropdownOptions, setChildDropdownOptions] = useState<Record<string, any[]>>({});
    const [childRowDropdownOptions, setChildRowDropdownOptions] = useState<Record<string, Record<string, any[]>>>({});
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
    const [editValidateData, setEditValidateData] = useState<any>(null);

    useEffect(() => {
        const triggerEditValidate = async () => {
             if (editValidateData && editData && (action === 'edit' || action === 'view')) {
                 if(isLoading) return;

                 // Check if any dropdowns are loading
                 if (Object.values(masterLoadingDropdowns).some(loading => loading)) return;
                 if (Object.values(tabLoadingDropdowns).some(tab => Object.values(tab).some(loading => loading))) return;

                 // Check Master Data
                 if (masterFormData.length === 0) return;
                 if (Object.keys(masterFormValues).length === 0) return;

                 // Check Tabs Data if exists
                 if (tabsData.length > 0) {
                     const tabKeys = Object.keys(tabFormValues);
                     if (tabKeys.length < tabsData.length) return;
                     
                     if (Object.keys(tabTableData).length < tabsData.length) return;
                 }

                 const response = await executeEditValidateApi(editValidateData, masterFormValues);
                 if (response) {
                      const finalObject = convertXmlToModifiedFormData(response, {
                          preserveLeadingZeros: true
                      });
                      console.log("check final Object", finalObject);
                      validationMethodToModifyTabsForm(finalObject);
                 }
                 setEditValidateData(null);
             }
        };
        triggerEditValidate();
    }, [editValidateData, masterFormValues, action, isLoading, masterLoadingDropdowns, tabLoadingDropdowns, masterFormData, tabsData, tabFormValues, tabTableData]);

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

                    if ((action === 'edit' || action === 'view') && masterTab?.Settings?.EditValidate) {
                         setEditValidateData(masterTab.Settings.EditValidate);
                    }

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
                    const tabKey = tab.TabName;
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

    const validationMethodToModifyTabsForm = (data: any) => {
        if (!data) return;

        const { tabsToBeDisabled = [], tabsDataChange = {} } = data;

        // --- Part 1: Handle Tab Removal ---
        
        let newTabsData: TabData[] = [...tabsData];

        // Filter out disabled tabs if any
        if (tabsToBeDisabled && tabsToBeDisabled.length > 0) {
            newTabsData = newTabsData.filter(tab => {
                const tabName = tab.TabName;
                const isDisabled = tabsToBeDisabled.some((disabledName: string) => 
                     disabledName.trim().toLowerCase() === tabName?.trim().toLowerCase()
                );
                return !isDisabled;
            });
        }

        // Clone state objects to apply updates
        const newTabFormValues = { ...tabFormValues };
        const newTabDropdownOptions = { ...tabDropdownOptions };
        const newTabLoadingDropdowns = { ...tabLoadingDropdowns };
        const newTabTableData = { ...tabTableData };

        // Remove data for disabled tabs
        if (tabsToBeDisabled && tabsToBeDisabled.length > 0) {
             tabsToBeDisabled.forEach((disabledTabName: string) => {
                 // Ensure we use the exact key (assuming casing matches or is handled)
                 // The keys in state are the exact TabName strings.
                 const tabToDelete = newTabsData.find(t => t.TabName?.trim().toLowerCase() === disabledTabName.trim().toLowerCase())?.TabName || disabledTabName;
                 
                 delete newTabFormValues[tabToDelete];
                 delete newTabDropdownOptions[tabToDelete];
                 delete newTabLoadingDropdowns[tabToDelete];
                 delete newTabTableData[tabToDelete];
             });
        }


        // --- Part 2: Handle Master Data Updates ---
        // We clone current master state
        let newMasterFormData = [...masterFormData];
        const newMasterFormValues = { ...masterFormValues };

        if (tabsDataChange["Master"]) {
            const masterChange = tabsDataChange["Master"];
            const { fieldsValueChange = {}, fieldDisabled = [] } = masterChange;

            // Update Field Values
             if (fieldsValueChange && Object.keys(fieldsValueChange).length > 0) {
                 const changesToApply: Record<string, any> = {};
                 Object.keys(fieldsValueChange).forEach(key => {
                        const isEditOrView = action === "edit" || action === "view";
                        const currentValue = newMasterFormValues[key];
                        // Only update if current value is empty or not in edit/view mode, 
                        // OR if we want to force update (logic from original code seems to protect existing values in edit/view)
                        // Original logic:
                        const hasValue = currentValue !== undefined && currentValue !== null && currentValue !== "";
                         if (!(isEditOrView && hasValue)) {
                             changesToApply[key] = fieldsValueChange[key];
                         }
                 });
                 Object.assign(newMasterFormValues, changesToApply);
            }

            // Disable Fields
            if (Array.isArray(fieldDisabled) && fieldDisabled.length > 0) {
                newMasterFormData = newMasterFormData.map(field => {
                    if (fieldDisabled.includes(field.wKey)) {
                        return { ...field, FieldEnabledTag: "N" };
                    }
                    return field;
                });
            }
        }

        // --- Part 3: Handle Other Tabs Data Updates ---
        Object.keys(tabsDataChange).forEach(tabChangeName => {
            if (tabChangeName === "Master") return; 

            // use tab name directly
            const tabKey = tabChangeName;
            
            // Find the tab in our newTabsData (to update field definitions if needed)
            const tabIndex = newTabsData.findIndex(t => 
                t.TabName?.trim() === tabChangeName.trim()
            );

            if (tabIndex !== -1) {
                const tabChange = tabsDataChange[tabChangeName];
                const { fieldsValueChange = {}, fieldDisabled = [] } = tabChange;

                // Update Values
                if (fieldsValueChange && Object.keys(fieldsValueChange).length > 0) {
                    const changesToApply: Record<string, any> = {};
                    Object.keys(fieldsValueChange).forEach(key => {
                        const isEditOrView = action === "edit" || action === "view";
                        const currentValue = newTabFormValues[tabKey]?.[key];
                        const hasValue = currentValue !== undefined && currentValue !== null && currentValue !== "";

                        if (!(isEditOrView && hasValue)) {
                            changesToApply[key] = fieldsValueChange[key];
                        }
                    });

                    newTabFormValues[tabKey] = {
                        ...(newTabFormValues[tabKey] || {}),
                        ...changesToApply
                    };
                }

                // Disable Fields (Update Data definitions)
                if (Array.isArray(fieldDisabled) && fieldDisabled.length > 0) {
                    newTabsData[tabIndex] = {
                        ...newTabsData[tabIndex],
                        Data: newTabsData[tabIndex].Data.map((field: FormField) => {
                             if (fieldDisabled.includes(field.wKey)) {
                                 return { ...field, FieldEnabledTag: "N" };
                             }
                             return field;
                        })
                    };
                }
            }
        });

        // --- Part 3.1: Fetch Dependent Options for Master ---
        newMasterFormData.forEach((field: FormField) => {
            if (field.type === 'WDropDownBox' && field.dependsOn && !field.wQuery) {
                let shouldInitialize = false;
                let parentFieldValue: any = null;

                if (Array.isArray(field.dependsOn.field)) {
                    // Handle multiple dependencies
                    const parentValues: Record<string, any> = {};
                    let allFieldsHaveValues = true;

                    field.dependsOn.field.forEach(fieldName => {
                        // Check multiple sources for the parent field value
                        // In validation we prioritized the *new* values which are in newMasterFormValues
                        const currentVal = newMasterFormValues[fieldName];
                        parentValues[fieldName] = currentVal;

                        if (!currentVal) {
                            allFieldsHaveValues = false;
                        }
                    });

                    if (allFieldsHaveValues) {
                        shouldInitialize = true;
                        parentFieldValue = parentValues;
                    }
                } else {
                    // Single dependency
                    const parentVal = newMasterFormValues[field.dependsOn.field];
                    if (parentVal) {
                        shouldInitialize = true;
                        parentFieldValue = parentVal;
                    }
                }

                if (shouldInitialize) {
                    fetchDependentOptions(field, parentFieldValue);
                }
            }
        });

        // --- Part 3.2: Fetch Dependent Options for Tabs ---
        newTabsData.forEach((tab, index) => {
            const tabKey = tab.TabName;
            
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
                            // Correctly access values from the NEW logic
                            const value = newMasterFormValues[fieldName] ||
                                         newTabFormValues[tabKey]?.[fieldName] ||
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
                        // Handle single dependency
                        const parentField = tab.Data.find(f => f.wKey === field.dependsOn.field);
                        parentFieldValue = newTabFormValues[tabKey]?.[field.dependsOn.field] ||
                            parentField?.wValue || newMasterFormValues?.[field.dependsOn.field] ;
                        
                        if (parentFieldValue) {
                            shouldInitialize = true;
                        }
                    }

                    if (shouldInitialize) {
                         // Use fetchTabsDependentOptions which accepts the state dictionaries
                         fetchTabsDependentOptions(field, tabKey, newTabFormValues, newMasterFormValues);
                    }
                }
            });
        });

        // --- Part 4: Commit Updates to State ---
        
        // 1. Master State
        setMasterFormData(newMasterFormData);
        setMasterFormValues(newMasterFormValues);

        // 2. Tabs State
        setTabsData(newTabsData);
        setTabFormValues(newTabFormValues);
        setTabDropdownOptions(newTabDropdownOptions);
        setTabLoadingDropdowns(newTabLoadingDropdowns);
        setTabTableData(newTabTableData);

        // 3. Handle Active Tab safety
        // If we removed tabs, the activeTabIndex might be out of bounds.
        // Or if the logic implies we should reset to the start.
        // For safety, if current index is >= new length, reset to 0.
        if (activeTabIndex >= newTabsData.length) {
            setActiveTabIndex(0);
        }
    }

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
                                xFilter += `<${fieldName}>${fieldValue || childFormValues[fieldName] || masterFormValues[fieldName] || ''}</${fieldName}>`;
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

    const fetchRowDependentOptions = async (field: FormField, parentValues: Record<string, any>) => {
        if (!field.dependsOn) return;
        
        // Generate a unique key for this combination of parent values
        const dependencyKey = JSON.stringify(parentValues);

        // Check if we already have options for this combination
        if (childRowDropdownOptions[field.wKey]?.[dependencyKey]) {
            return;
        }

        try {
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
                             fieldNames.forEach(individualField => {
                                 const val = parentValues[individualField] || masterFormValues[individualField] || '';
                                 xFilter += `<${individualField}>${val}</${individualField}>`;
                             });

                        } else {
                            const val = parentValues[fieldName] || masterFormValues[fieldName] || '';
                            xFilter += `<${fieldName}>${val}</${fieldName}>`;
                        }
                    });
                } else {
                     const fieldName = field.dependsOn.field;
                     const val = parentValues[fieldName] || masterFormValues[fieldName] || '';
                     xFilter += `<${fieldName}>${val}</${fieldName}>`;
                }
            } else {
                 // Fallback for simple filters
                 const fieldName = typeof field.dependsOn.field === 'string' ? field.dependsOn.field : field.dependsOn.field[0];
                 const val = parentValues[fieldName] || masterFormValues[fieldName] || '';
                 xFilter = `<${fieldName}>${val}</${fieldName}>`;
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

            setChildRowDropdownOptions(prev => ({
                ...prev,
                [field.wKey]: {
                    ...(prev[field.wKey] || {}),
                    [dependencyKey]: options
                }
            }));

        } catch (error) {
            console.error(`Error fetching dependent options for row ${field.wKey}:`, error);
        }
    };

    // Effect to fetch dependent options for child table rows
    useEffect(() => {
        if (childEntriesTable.length > 0 && childFormData.length > 0) {
            childFormData.forEach(field => {
                if (field.type === 'WDropDownBox' && field.dependsOn && !field.wQuery) {
                    // Process each row to find unique parent value combinations
                    const parentValuesSet = new Set<string>();
                    
                    childEntriesTable.forEach(row => {
                        const parentValues: Record<string, any> = {};
                        let hasAllParents = true;

                        if (Array.isArray(field.dependsOn.field)) {
                            field.dependsOn.field.forEach(fieldName => {
                                 if (typeof fieldName === 'string' && fieldName.includes(',')) {
                                     const fieldNames = fieldName.split(',').map(name => name.trim());
                                     fieldNames.forEach(f => {
                                         const val = row[f] || masterFormValues[f];
                                          // if (!val) hasAllParents = false; // Allow empty values if backend handles it, or strict?
                                          // For now, let's treat it as valid to pass empty string
                                         parentValues[f] = val;
                                     })
                                 } else {
                                    const val = row[fieldName] || masterFormValues[fieldName];
                                     // if (!val) hasAllParents = false;
                                    parentValues[fieldName] = val;
                                 }
                            });
                        } else {
                            const fieldName = field.dependsOn.field;
                            const val = row[fieldName] || masterFormValues[fieldName];
                             // if (!val) hasAllParents = false;
                            parentValues[fieldName] = val;
                        }

                        if (hasAllParents) {
                             const key = JSON.stringify(parentValues);
                             if (!parentValuesSet.has(key)) {
                                 parentValuesSet.add(key);
                                 // Check if we need to fetch
                                 if (!childRowDropdownOptions[field.wKey]?.[key]) {
                                     fetchRowDependentOptions(field, parentValues);
                                 }
                             }
                        }
                    });
                }
            });
        }
    }, [childEntriesTable, childFormData]);

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
                console.log("check this ------>",field,isEditData,!isViewMode,editData,masterFormValues);
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
                if (!isThereChildEntry) {
                     fetchChildEntryData();
                }
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
                 if (!isThereChildEntry) {
                     fetchChildEntryData(editData);
                }
            }
            setIsEdit(true);
        } else if (action === 'view' && editData) {
            setViewMode(true);
            if (isTabs) {
                fetchTabsData(editData, true);
            } else {
                fetchMasterEntryData(editData, true);
                 if (!isThereChildEntry) {
                     fetchChildEntryData(editData);
                }
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
    
    // Filter tabsData to remove tabs
    const updatedTabsData = tabsData.filter(tab => !tabsToRemoveNames.includes(tab.TabName));
    
    // With name-based keys, we don't need to reindex the state maps.
    // The keys remain valid for the tabs that are kept.
    // We update tabsData so they are hidden from UI.
    setTabsData(updatedTabsData);
    
    // If you want to cleanup state for removed tabs:
    
    const updatedTabFormValue = { ...tabFormValues };
    const updatedDropdownOptions = { ...tabDropdownOptions };
    const updatedTabTableData = { ...tabTableData };
    const updatedTabLoadingDropdowns = { ...tabLoadingDropdowns };

    tabsToRemoveNames.forEach(name => {
        delete updatedTabFormValue[name];
        delete updatedDropdownOptions[name];
        delete updatedTabTableData[name];
        delete updatedTabLoadingDropdowns[name];
    });
    setTabFormValues(updatedTabFormValue);
    setTabDropdownOptions(updatedDropdownOptions);
    setTabTableData(updatedTabTableData);
    setTabLoadingDropdowns(updatedTabLoadingDropdowns);
    
    // For now, leaving the data in state is safer and keeps it if tab reappears.
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
        const currentTabKey = currentTab.TabName;
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
        const currentTabKey = currentTab?.TabName;
        const currentTabFormValues = tabFormValues[currentTabKey] || {};


        const allData = {
            Master: [masterFormValues],
        }

        tabsData.forEach((tabs, index) => {
            const currentKey = tabs.TabName;
            if (tabs.Settings.isTable === "true") {
                allData[tabs.TabName] = tabTableData[currentKey]
            } else {
                allData[tabs.TabName] = Object.keys(tabFormValues[currentKey] || {}).length > 0
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
        const currentTabKey = currentTab.TabName;
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
            [currentTabKey]: row
        }))
        setTabsModal(true);
        setEditTabModalData(true);
        setEditTabRowIndex(idx);
    }

    const handleAddTabsFormTableRow = () => {
        const currentTab = tabsData[activeTabIndex];
        const currentTabKey = currentTab.TabName;
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
        const currentTabKey = currentTab.TabName;

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
        const currentTabKey = currentTab.TabName;
        setTabFormValues(pre => ({
            ...pre,
            [currentTabKey]: {}
        }))
        setIsMinor(false);
        setGuardianFormValues(null)
    }

    const handleTabTableDataDelete = (idx) => {
        const currentTabKey = tabsData[activeTabIndex]?.TabName;
        setTabTableData(prev => ({
            ...prev,
            [currentTabKey]: prev[currentTabKey].filter((_, i) => i !== idx)
        }
    ));
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
                                        validationMethodToModifyTabsForm={validationMethodToModifyTabsForm}
                                    />
                                </div>

                            {tabsData.length > 0 && (
                                <TabContent
                                    tabsData={tabsData}
                                    activeTabIndex={activeTabIndex}
                                    setActiveTabIndex={setActiveTabIndex}
                                    isViewMode={isViewMode}
                                    viewMode={viewMode}
                                    colors={colors}
                                    fonts={fonts}
                                    tabFormValues={tabFormValues}
                                    setTabFormValues={setTabFormValues}
                                    tabDropdownOptions={tabDropdownOptions}
                                    setTabDropdownOptions={setTabDropdownOptions}
                                    tabLoadingDropdowns={tabLoadingDropdowns}
                                    handleTabDropdownChange={handleTabDropdownChange}
                                    fieldErrors={fieldErrors}
                                    setFieldErrors={setFieldErrors}
                                    masterFormValues={masterFormValues}
                                    setTabsData={setTabsData}
                                    setValidationModal={setValidationModal}
                                    handleTabTableDataEdit={handleTabTableDataEdit}
                                    handleAddNominee={handleAddNominee}
                                    handleTabTableDataDelete={handleTabTableDataDelete}
                                    tabTableData={tabTableData}
                                    tabsModal={tabsModal}
                                    setTabsModal={setTabsModal}
                                    isMinor={isMinor}
                                    setIsMinor={setIsMinor}
                                    handleClearTabTableRowEntry={handleClearTabTableRowEntry}
                                    handleAddTabsFormTableRow={handleAddTabsFormTableRow}
                                    submitTabsFormData={submitTabsFormData}
                                    FinalSubmitTabsFormData={FinalSubmitTabsFormData}
                                    isFormInvalid={isFormInvalid}
                                    isFormSubmit={isFormSubmit}
                                    finalTabSubmitSuccess={finalTabSubmitSuccess}
                                    goToPreviousTab={goToPreviousTab}
                                    handleTabChangeViewMode={handleTabChangeViewMode}
                                    checkIfMinorforTable={checkIfMinorforTable}
                                    getTabTableColumns={getTabTableColumns}
                                    action={action}
                                    editData={editData}
                                />
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
                                            <ChildEntriesTable
                                                childEntriesTable={childEntriesTable}
                                                setChildEntriesTable={setChildEntriesTable}
                                                viewMode={viewMode}
                                                setChildFormValues={setChildFormValues}
                                                handleChildEditNonSavedData={handleChildEditNonSavedData}
                                                columnWidthMap={columnWidthMap}
                                                childFormData={childFormData}
                                                childDropdownOptions={childDropdownOptions}
                                                childRowDropdownOptions={childRowDropdownOptions}
                                            />
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
                <GuardianEntryForm
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
