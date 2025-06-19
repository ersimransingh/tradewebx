"use client";
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import moment from 'moment';
import { FaPlus, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ConfirmationModal from './Modals/ConfirmationModal';
import CaseConfirmationModal from './Modals/CaseConfirmationModal';

import { ApiResponse, EntryFormModalProps, FormField, ChildEntryModalProps } from '@/types';
import EntryForm from './component-forms/EntryForm';


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
        <div className="fixed inset-0 flex items-center justify-center z-[500]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
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


const EntryFormModal: React.FC<EntryFormModalProps> = ({ isOpen, onClose, pageData, editData, action, setEntryEditData, refreshFunction }) => {
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

    console.log(pageData[0].Entry.ChildEntry,'entry page datat');
    

    const childEntryPresent = pageData[0].Entry.ChildEntry;
    const isThereChildEntry = !childEntryPresent || Object.keys(childEntryPresent).length === 0;

    const [validationModal, setValidationModal] = useState<{
        isOpen: boolean;
        message: string;
        type: 'M' | 'S' | 'E' | 'D';
        callback?: (confirmed: boolean) => void;
    }>({ isOpen: false, message: '', type: 'M' });

    const [viewMode, setViewMode] = useState<boolean>(false);

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

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });

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
                        if (!childFormValues[fieldName] && !masterFormValues[fieldName]) {
                            toast.error(`Please select the field: ${fieldName}`);
                            return;
                        }
                        xFilter += `<${fieldName}>${childFormValues[fieldName] || masterFormValues[fieldName] || ''}</${fieldName}>`;
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

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });

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

    const fetchMasterEntryData = async (editData?: any, viewMode: boolean = false) => {
        if (!pageData?.[0]?.Entry) return;
        setIsLoading(true);
        try {
            const entry = pageData[0].Entry;
            const masterEntry = entry.MasterEntry;
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

            // Add any additional fields from editData that aren't in masterEntry.X_Filter
            if (editData) {
                Object.entries(editData).forEach(([key, value]) => {
                    if (
                        value !== undefined &&
                        value !== null &&
                        !masterEntry.X_Filter.hasOwnProperty(key) &&
                        !key.startsWith('_') // Skip internal fields
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

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });
            let formData = response?.data?.data?.rs0 || [];
            // If in view mode, set all FieldEnabledTag to "N"
            if (viewMode) {
                formData = formData.map((field: any) => ({
                    ...field,
                    FieldEnabledTag: "N"
                }));
            }

            setMasterFormData(formData);
            setChildEntriesTable(response?.data?.data?.rs1 || []);

            // Initialize form values with any preset values
            const initialValues: Record<string, any> = {};
            formData.forEach((field: FormField) => {
                if (field.type === 'WDateBox' && field.wValue) {
                    initialValues[field.wKey] = moment(field.wValue).format('YYYYMMDD');
                }
                // If we have edit data, use it to pre-fill the form
                else if (editData) {
                    initialValues[field.wKey] = field.wValue;
                }
            });

            setMasterFormValues(initialValues);

            // Fetch initial dropdown options
            formData.forEach((field: FormField) => {
                if (field.type === 'WDropDownBox' && field.wQuery) {
                    fetchDropdownOptions(field);
                }
                // else if(field.type === 'WDropDownBox' && field.dependsOn && isEdit) {
                //     handleMasterDropdownChange(field);
                // }
            });
        } catch (error) {
            console.error('Error fetching MasterEntry data:', error);
            setIsLoading(false);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchChildEntryData = async (editData?: any) => {
        if (!pageData?.[0]?.Entry) return;
        setIsLoading(true)
        try {
            const entry = pageData[0].Entry;
            const childEntry = entry.ChildEntry;
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
                // If we have edit data and the key exists in it, use that value
                if (editData && editData.SerialNo && editData[key] !== undefined && editData[key] !== null) {
                    xFilter += `<${key}>${editData[key]}</${key}>`;
                }
                // Otherwise use the default value from childEntry
                else if (value === '##InstrumentType##') {
                    xFilter += `<${key}>${masterFormValues.InstrumentType || ''}</${key}>`;
                } else {
                    xFilter += `<${key}>${value}</${key}>`;
                }
            });

            // Add any additional fields from editData that aren't in childEntry.X_Filter
            if (editData && editData.SerialNo) {
                Object.entries(editData).forEach(([key, value]) => {
                    if (
                        value !== undefined &&
                        value !== null &&
                        !childEntry.X_Filter.hasOwnProperty(key) &&
                        !key.startsWith('_') // Skip internal fields
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

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });
            let formData = response?.data?.data?.rs0 || [];
            if (viewMode) {
                formData = formData.map((field: any) => ({
                    ...field,
                    FieldEnabledTag: "N"
                }));
            }
            setChildFormData(formData);

            // Initialize child form values with any preset values
            const initialValues: Record<string, any> = {};
            response.data?.data?.rs0?.forEach((field: FormField) => {
                if (editData && editData.Id) {
                    initialValues[field.wKey] = editData[field.wKey];
                    initialValues['Id'] = editData['Id'];
                }
                else if (field.type === 'WDateBox' && field.wValue) {
                    initialValues[field.wKey] = moment(field.wValue).format('YYYYMMDD');
                }
                // If we have edit data, use it to pre-fill the form
                else if (editData) {
                    initialValues[field.wKey] = field.wValue;
                }
            });
            setChildFormValues(initialValues);

            // Fetch initial dropdown options
            response.data?.data?.rs0?.forEach((field: FormField) => {
                if (field.type === 'WDropDownBox' && field.wQuery) {
                    fetchDropdownOptions(field, true);
                }
                // else if(field.type === 'WDropDownBox' && field.dependsOn && isEdit) {
                //     handleChildDropdownChange(field);
                // }
            });
        } catch (error) {
            console.error('Error fetching ChildEntry data:', error);
            setIsLoading(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && !isEdit && (!editData || Object.keys(editData).length === 0)) {
            fetchMasterEntryData();
        }
    }, [isOpen, pageData]);

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

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });
            if (response?.data?.success) {
                fetchMasterEntryData(masterFormValues)
                setIsConfirmationModalOpen(false);
            }

        } catch (error) {
            console.error(`Error fetching options for   `);
        } finally {
            console.log("check delete record");
        }


    }

    useEffect(() => {
        if (action === 'edit' && editData) {
            fetchMasterEntryData(editData);
            setIsEdit(true);
        } else if (action === 'view' && editData) {
            setViewMode(true);
            fetchMasterEntryData(editData, true);
        }
    }, [action, editData]);

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
        setMasterFormValues({});
        setFieldErrors({});
        setChildEntriesTable([]);
        setMasterDropdownOptions({});
        setMasterFormData([]);
        resetChildForm();
        setIsEdit(false);
        setEntryEditData(null);
        onClose();
        setViewMode(false);
        refreshFunction()
    }

    const submitFormData = async () => {
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
        <J_Api>${jApi}, "UserType":"${localStorage.getItem('userType')}"</J_Api>
    </dsXml>`;

        try {
            const response = await axios.post<ApiResponse>(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });

            if (response?.data?.success) {
                onChildFormSubmit();
                toast.success('Form submitted successfully!');
                setIsFormSubmit(false);
                resetParentForm();
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
            submitFormData()
        }
    }

    // In your component
    const dynamicColumns = getAllColumns(childEntriesTable);

    if (!isOpen) return null;
    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-400" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <div className="bg-white rounded-lg p-6 w-full max-w-[80vw] overflow-y-auto min-h-[75vh] max-h-[75vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">{isEdit ? "Edit " : "Add "}Entry Form</h2>
                            <button
                                onClick={() => { resetParentForm() }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        {isLoading ? (
                            <div className="text-center py-4">Loading...</div>
                        ) : (
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
                                                            submitFormData();
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
                                                                    className="flex gap-1 px-4 py-2 border-b text-center"
                                                                    style={{
                                                                        width: columnWidthMap['Actions'] || 'auto',
                                                                        minWidth: columnWidthMap['Actions'] ? '50px' : '120px'
                                                                    }}
                                                                >
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
                                                                </td>

                                                                {/* Dynamic values */}
                                                                {dynamicColumns.map((key) => (
                                                                    <td
                                                                        key={key}
                                                                        className="px-4 py-2 border-b text-center"
                                                                        style={{
                                                                            width: columnWidthMap[key] || 'auto',
                                                                            minWidth: columnWidthMap[key] ? Math.min(50, Math.floor(columnWidthMap[key] * 0.5)) + 'px' : '80px',
                                                                            maxWidth: columnWidthMap[key] ? Math.max(400, Math.floor(columnWidthMap[key] * 2)) + 'px' : '300px'
                                                                        }}
                                                                    >
                                                                        {safeEntry[key] == null || safeEntry[key] === ""
                                                                            ? "-"
                                                                            : String(safeEntry[key])
                                                                        }
                                                                    </td>
                                                                ))}
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
                />
            )}
        </>
    );
};

export default EntryFormModal;


