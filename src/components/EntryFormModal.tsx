"use client";
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';
import moment from 'moment';
import { useTheme } from '@/context/ThemeContext';
import { FaPlus, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';
import ConfirmationModal from './Modals/ConfirmationModal';
import CaseConfirmationModal from './Modals/CaseConfirmationModal';

interface EntryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    pageData: any;
    editData?: any;
    action?: 'edit' | 'delete' | 'view' | null;
    setEntryEditData?: React.Dispatch<React.SetStateAction<any>>;
}

interface ApiResponse {
    success: boolean;
    message?: string;
    data?: any;
}

interface FormField {
    Srno: number;
    type: string;
    label: string;
    childDependents?: string[];
    wKey: string;
    FieldSize: string;
    FieldType: string;
    ValidationAPI: any;
    FieldEnabledTag: string;
    wQuery?: {
        Sql: string;
        J_Ui: any;
        X_Filter: string;
        X_Filter_Multiple?: any;
        J_Api: any;
    };
    wDropDownKey?: {
        key: string;
        value: string;
    };
    wValue?: string;
    dependsOn?: {
        field: string;
        wQuery: {
            Sql: string;
            J_Ui: any;
            X_Filter: string;
            X_Filter_Multiple?: any;
            J_Api: any;
        };
    };
}

interface EntryFormProps {
    formData: FormField[];
    formValues: Record<string, any>;
    masterValues: Record<string, any>;
    setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    dropdownOptions: Record<string, any[]>;
    loadingDropdowns: Record<string, boolean>;
    onDropdownChange?: (key: string, value: any) => void;
    fieldErrors: Record<string, string>;
    setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    setValidationModal: React.Dispatch<React.SetStateAction<{
        isOpen: boolean;
        message: string;
        type: 'M' | 'S' | 'E' | 'D';
        callback?: (confirmed: boolean) => void;
    }>>;
}

interface ChildEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    masterValues: Record<string, any>;
    formData: FormField[];
    masterFormData: FormField[];
    formValues: Record<string, any>;
    setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    dropdownOptions: Record<string, any[]>;
    loadingDropdowns: Record<string, boolean>;
    onDropdownChange?: (key: string, value: any) => void;
    fieldErrors: Record<string, string>;
    setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    resetChildForm: () => void;
    isEdit: boolean;
    onChildFormSubmit: () => void;
    setValidationModal: React.Dispatch<React.SetStateAction<{
        isOpen: boolean;
        message: string;
        type: 'M' | 'S' | 'E' | 'D';
        callback?: (confirmed: boolean) => void;
    }>>;
    viewAccess: boolean;
    isLoading: boolean;
    setChildEntriesTable: React.Dispatch<React.SetStateAction<any[]>>;
}

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

const DropdownField: React.FC<{
    field: FormField;
    formValues: Record<string, any>;
    setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    dropdownOptions: Record<string, any[]>;
    loadingDropdowns: Record<string, boolean>;
    fieldErrors: Record<string, string>;
    setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    colors: any;
    handleBlur: (field: FormField) => void;
    isDisabled: boolean;
    handleDropDownChange: any;
}> = ({
    field,
    formValues,
    setFormValues,
    dropdownOptions,
    loadingDropdowns,
    fieldErrors,
    setFieldErrors,
    colors,
    handleBlur,
    isDisabled,
    handleDropDownChange
}) => {
        const options = dropdownOptions[field.wKey] || [];
        const [visibleOptions, setVisibleOptions] = useState(options.slice(0, 50));
        const [searchText, setSearchText] = useState('');

        useEffect(() => {
            if (options.length > 0) {
                const filtered = options.filter(opt =>
                    opt.label.toLowerCase().includes(searchText.toLowerCase()) ||
                    opt.value.toLowerCase().includes(searchText.toLowerCase())
                );
                setVisibleOptions(filtered.slice(0, 50));
            }
        }, [searchText, options]);

        const handleRemoveChildDropdownValue = (dependent: string[]) => {
            if (dependent.length > 0 && dependent[0] !== "") {
                dependent.forEach((fieldName: string) => {
                    setFormValues(prev => ({ ...prev, [fieldName]: '' }));
                    setFieldErrors(prev => ({ ...prev, [fieldName]: '' }));
                });
            }
        }

        const handleInputChange = (key: string, value: any) => {
            setFormValues(prev => ({ ...prev, [key]: value }));

            // handleDropDownChange(key, value);

            handleRemoveChildDropdownValue(field?.childDependents);
            setFieldErrors(prev => ({ ...prev, [key]: '' }));
        };

        const onMenuScrollToBottom = (field: FormField) => {
            const options = dropdownOptions[field.wKey] || [];
            const currentLength = visibleOptions.length;

            if (currentLength < options.length) {
                const additionalOptions = options.slice(currentLength, currentLength + 50);
                setVisibleOptions(prev => [...prev, ...additionalOptions]);
            }
        };

        return (
            <div key={field.Srno} className="mb-1">
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    {field.label}
                </label>
                <Select
                    options={visibleOptions}
                    value={options.find((opt: any) => opt.value.toString() === formValues[field.wKey]?.toString()) || null}
                    onChange={(selected) => handleInputChange(field.wKey, selected?.value)}
                    onInputChange={(inputValue, { action }) => {
                        if (action === 'input-change') setSearchText(inputValue);
                        return inputValue;
                    }}
                    onMenuScrollToBottom={() => onMenuScrollToBottom(field)}
                    onFocus={() => handleDropDownChange(field)}
                    placeholder={(formValues[field.wKey]?.trim() !== "" && formValues[field.wKey]?.trim() !==" ") ? formValues[field.wKey]  : "Select..."}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    isLoading={loadingDropdowns[field.wKey]}
                    filterOption={() => true}
                    isDisabled={isDisabled}
                    styles={{
                        control: (base, state) => ({
                            ...base,
                            borderColor: state.isFocused
                                ? '#3b82f6' // blue-500 when focused
                                : !isDisabled
                                    ? fieldErrors[field.wKey]
                                        ? 'red'
                                        : '#374151' // gray-700 when enabled
                                    : '#d1d5db', // gray-300 when disabled
                            boxShadow: state.isFocused
                                ? '0 0 0 3px rgba(59, 130, 246, 0.5)' // blue-500 with opacity
                                : 'none',
                            backgroundColor: isDisabled
                                ? '#f2f2f0' // light gray when disabled (matches WTextBox)
                                : colors.textInputBackground,
                            '&:hover': {
                                borderColor: state.isFocused
                                    ? '#3b82f6'
                                    : !isDisabled
                                        ? fieldErrors[field.wKey]
                                            ? 'red'
                                            : '#374151'
                                        : '#d1d5db',
                            },
                        }),
                        singleValue: (base) => ({
                            ...base,
                            color: isDisabled
                                ? '#6b7280' // gray-500 for disabled text
                                : colors.textInputText,
                        }),
                        option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isFocused ? colors.primary : colors.textInputBackground,
                            color: state.isFocused ? colors.buttonText : colors.textInputText,
                        }),
                        input: (base) => ({
                            ...base,
                            color: colors.textInputText,
                        }),
                        menu: (base) => ({
                            ...base,
                            backgroundColor: colors.textInputBackground,
                        }),
                        placeholder: (base) => ({
                            ...base,
                            color: isDisabled ? '#9ca3af' : base.color, // gray-400 for disabled placeholder
                        }),
                    }}
                    onBlur={() => {
                        handleBlur(field);
                    }}
                />
                {fieldErrors[field.wKey] && (
                    <span className="text-red-500 text-sm">{fieldErrors[field.wKey]}</span>
                )}
            </div>
        );
    };

const EntryForm: React.FC<EntryFormProps> = ({
    formData,
    formValues,
    setFormValues,
    dropdownOptions,
    loadingDropdowns,
    onDropdownChange,
    fieldErrors,
    setFieldErrors,
    masterValues,
    setFormData,
    setValidationModal
}) => {
    const { colors } = useTheme();
    const marginBottom = 'mb-1';

    const handleInputChange = (key: string, value: any) => {
        const formattedValue = value instanceof Date ? moment(value).format('YYYYMMDD') : value;
        setFormValues(prev => ({ ...prev, [key]: formattedValue }));
        setFieldErrors(prev => ({ ...prev, [key]: '' })); // Clear validation error when field is filled
        if (onDropdownChange) {
            onDropdownChange(key, formattedValue);
        }
    };

    // function called to check the validation of the field 
    const handleBlur = async (field: FormField) => {

        if (!field.ValidationAPI || !field.ValidationAPI.dsXml) return;

        const { J_Ui, Sql, X_Filter, X_Filter_Multiple, J_Api } = field.ValidationAPI.dsXml;

        let xFilter = '';
        let xFilterMultiple = '';
        let shouldCallApi = true;
        const errors = [];

        if (X_Filter_Multiple) {
            Object.entries(X_Filter_Multiple).forEach(([key, placeholder]) => {
                let fieldValue;
                if (typeof placeholder === 'string' && placeholder.startsWith('##') && placeholder.endsWith('##')) {
                    const formKey = placeholder.slice(2, -2);
                    fieldValue = formValues[formKey] || masterValues[formKey];
                } else {
                    fieldValue = placeholder;
                }

                if (!fieldValue) {
                    setFieldErrors(prev => ({ ...prev, [key]: `Please fill the required field: ${key}` }));
                    setFormValues(prev => ({ ...prev, [field.wKey]: '' }));
                    shouldCallApi = false;
                    errors.push(key);
                } else {
                    xFilterMultiple += `<${key}>${fieldValue}</${key}>`;
                }
            });
        } else if (X_Filter) {
            let fieldValue;
            if (X_Filter.startsWith('##') && X_Filter.endsWith('##')) {
                const formKey = X_Filter.slice(2, -2);
                fieldValue = formValues[formKey] || masterValues[formKey];
            } else {
                fieldValue = X_Filter;
            }

            if (!fieldValue) {
                setFieldErrors(prev => ({ ...prev, [X_Filter]: `Please fill the required field: ${X_Filter}` }));
                setFormValues(prev => ({ ...prev, [field.wKey]: '' }));
                shouldCallApi = false;
                errors.push(X_Filter);
            } else {
                xFilter = `<${X_Filter}>${fieldValue}</${X_Filter}>`;
            }
        }

        if (errors.length > 0) {
            toast.error(`Please fill the required fields: ${errors.join(', ')}`);
        }

        if (!shouldCallApi) return;

        const jUi = Object.entries(J_Ui || {}).map(([key, value]) => `"${key}":"${value}"`).join(',');
        const jApi = Object.entries(J_Api || {}).map(([key, value]) => `"${key}":"${value}"`).join(',');

        const xmlData = `<dsXml>
            <J_Ui>${jUi}</J_Ui>
            <Sql>${Sql || ''}</Sql>
            <X_Filter>${xFilter}</X_Filter>
            <X_Filter_Multiple>${xFilterMultiple}</X_Filter_Multiple>
            <J_Api>${jApi}</J_Api>
        </dsXml>`;

        try {
            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });
            // calling the function to  handle the flags 
            const columnData = response?.data?.data?.rs0[0]?.Column1
            if (columnData) {
                handleValidationApiResponse(columnData, field.wKey);
            }
        } catch (error) {
            console.error('Validation API error:', error);
            // setFieldErrors(prev => ({ ...prev, [field.wKey]: 'Validation failed. Please try again.' }));
            // setFormValues(prev => ({ ...prev, [field.wKey]: '' }));
        }
    };


    // this function is used to show the respected flags according to the response from the API
    const handleValidationApiResponse = (response, currFieldName) => {
        if (!response?.trim().startsWith("<root>")) {
            response = `<root>${response}</root>`;
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, "text/xml");

        const flag = xmlDoc.getElementsByTagName("Flag")[0]?.textContent;
        const message = xmlDoc.getElementsByTagName("Message")[0]?.textContent;
        const dynamicTags = Array.from(xmlDoc.documentElement.children).filter(
            (node) => node.tagName !== "Flag" && node.tagName !== "Message"
        );

        switch (flag) {
            case 'M':
                setValidationModal({
                    isOpen: true,
                    message: message || 'Are you sure you want to proceed?',
                    type: 'M',
                    callback: (confirmed) => {
                        if (confirmed) {
                            dynamicTags.forEach((tag) => {
                                const tagName = tag.tagName;
                                const tagValue = tag.textContent;
                                setFormValues(prev => ({ ...prev, [tagName]: tagValue }));
                            });
                        } else {
                            setFormValues(prev => ({ ...prev, [currFieldName]: "" }));
                        }
                        setValidationModal({ isOpen: false, message: '', type: 'M' });
                    }
                });
                break;

            case 'S':
                setValidationModal({
                    isOpen: true,
                    message: message || 'Please press ok to proceed',
                    type: 'S',
                    callback: () => {
                        dynamicTags.forEach((tag) => {
                            const tagName = tag.tagName;
                            const tagValue = tag.textContent;
                            setFormValues(prev => ({ ...prev, [tagName]: tagValue }));
                        });
                        setValidationModal({ isOpen: false, message: '', type: 'S' });
                    }
                });
                break;

            case 'E':
                toast.warning(message);
                setFormValues(prev => ({ ...prev, [currFieldName]: "" }));
                break;

            case 'D':
                let updatedFormData = formData;
                dynamicTags.forEach((tag) => {
                    const tagName = tag.tagName;
                    const tagValue = tag.textContent;
                    const tagFlag = tagValue.toLowerCase();
                    const isDisabled = tagFlag === 'false';

                    if (tagFlag === 'true' || tagFlag === 'false') {
                        setFormValues(prev => ({ ...prev, [tagName]: "" }));
                        if (isDisabled) {
                            setFieldErrors(prev => ({ ...prev, [tagName]: '' })); // Clear error for disabled fields
                        }
                    } else {
                        setFormValues(prev => ({ ...prev, [tagName]: tagValue }));
                    }

                    updatedFormData = updatedFormData.map(field => {
                        if (field.wKey === tagName) {
                            return { ...field, FieldEnabledTag: isDisabled ? 'N' : 'Y' };
                        }
                        return field;
                    });
                });
                setFormData(updatedFormData);
                break;

            default:
                console.error("Unknown flag received:", flag);
        }
    };

    const renderFormField = (field: FormField) => {
        const isEnabled = field.FieldEnabledTag === 'Y';

        switch (field.type) {
            case 'WDropDownBox':
                return (
                    <DropdownField
                        key={`dropdown-${field.Srno}-${field.wKey}`}
                        field={field}
                        formValues={formValues}
                        setFormValues={setFormValues}
                        dropdownOptions={dropdownOptions}
                        loadingDropdowns={loadingDropdowns}
                        fieldErrors={fieldErrors}
                        setFieldErrors={setFieldErrors}
                        colors={colors}
                        handleBlur={() => handleBlur(field)}
                        isDisabled={!isEnabled}
                        handleDropDownChange={onDropdownChange}
                    />
                );

            case 'WDateBox':
                return (
                    <div
                        key={`dateBox-${field.Srno}-${field.wKey}`}
                        className={marginBottom}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            {field.label}
                        </label>
                        <DatePicker
                            selected={formValues[field.wKey] ? moment(formValues[field.wKey], 'YYYYMMDD').toDate() : null}
                            onChange={(date: Date | null) => handleInputChange(field.wKey, date)}
                            dateFormat="dd/MM/yyyy"
                            className={`
                                w-full px-3 py-1 border rounded-md 
                                focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                                ${!isEnabled
                                    ? 'border-gray-300 bg-[#f2f2f0]'
                                    : fieldErrors[field.wKey]
                                        ? 'border-red-500'
                                        : 'border-gray-700'
                                }
                                ${colors.textInputBackground ? `bg-${colors.textInputBackground}` : ''}
                            `}
                            wrapperClassName="w-full"
                            placeholderText="Select Date"
                            onBlur={() => handleBlur(field)}
                            disabled={!isEnabled}
                        />
                        {fieldErrors[field.wKey] && (
                            <span className="text-red-500 text-sm">{fieldErrors[field.wKey]}</span>
                        )}
                    </div>
                );

            case 'WTextBox':
                return (
                    <div
                        key={`textBox-${field.Srno}-${field.wKey}`}
                        className={marginBottom}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            {field.label}
                        </label>
                        <input
                            type="text"
                            className={`w-full px-3 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${!isEnabled ? 'border-gray-300' : fieldErrors[field.wKey] ? 'border-red-500' : 'border-gray-700'
                                }`}
                            style={{
                                borderColor: fieldErrors[field.wKey] ? 'red' : !isEnabled ? '#d1d5db' : "#344054",
                                backgroundColor: !isEnabled ? "#f2f2f0" : colors.textInputBackground,
                                color: colors.textInputText
                            }}
                            value={formValues[field.wKey] || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (field.FieldType === 'INT' && !/^[0-9]*$/.test(value)) {
                                    return; // Prevent non-numeric input for INT type
                                }
                                if (value.length <= parseInt(field.FieldSize, 10)) {
                                    handleInputChange(field.wKey, value);
                                }
                            }}
                            onBlur={() => handleBlur(field)}
                            placeholder={field.label}
                            disabled={!isEnabled}
                        />
                        {fieldErrors[field.wKey] && (
                            <span className="text-red-500 text-sm">{fieldErrors[field.wKey]}</span>
                        )}
                    </div>
                );

            case 'WDisplayBox':
                return (
                    <div
                        key={`displayBox-${field.Srno}-${field.wKey}`}
                        className={marginBottom}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            {field.label}
                        </label>
                        <div
                            className="w-full px-3 py-1 border rounded-md"
                            style={{
                                borderColor: fieldErrors[field.wKey] ? 'red' : !isEnabled ? '#d1d5db' : colors.textInputBorder,
                                backgroundColor: !isEnabled ? "#f2f2f0" : colors.textInputBackground,
                                color: colors.textInputText
                            }}
                        >
                            {formValues[field.wKey] || '-'}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="grid grid-cols-3 gap-4">
            {formData.map(renderFormField)}
        </div>
    );
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
    setChildEntriesTable
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
        <div className="fixed inset-0 flex items-center justify-center z-[200]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
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
                        />
                    </>
                )}

            </div>
        </div>
    );
};


const EntryFormModal: React.FC<EntryFormModalProps> = ({ isOpen, onClose, pageData, editData, action, setEntryEditData }) => {
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

    // useEffect(() => {
    //     // Check if childFormValues has been updated with initial values
    //     if (Object.keys(childFormValues).length > 0) {
    //         childFormData.forEach((field) => {
    //             if (field.type === 'WDropDownBox' && field.dependsOn) {
    //                 handleChildDropdownChange(field);
    //             }
    //         });
    //     }
    // }, [childFormValues]);

    // useEffect(() => {
    //     // Check if childFormValues has been updated with initial values
    //     if (Object.keys(masterFormValues).length > 0) {
    //         masterFormData.forEach((field) => {
    //             if (field.type === 'WDropDownBox' && field.dependsOn) {
    //                 handleMasterDropdownChange(field);
    //             }
    //         });
    //     }
    // }, [masterFormValues]);



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

    const handleChildEditData = (data: any) => {
        setIsEdit(true);
        setIsChildModalOpen(true);
        fetchChildEntryData(data)
    }

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

        const jApi = Object.entries(entry.ChildEntry.J_Api)
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
        <J_Api>${jApi}</J_Api>
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
                setIsFormSubmit(false)
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

    // In your component
    const dynamicColumns = getAllColumns(childEntriesTable);

    if (!isOpen) return null;

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-100" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <div className="bg-white rounded-lg p-6 w-full max-w-[80vw] overflow-y-auto min-h-[75vh] max-h-[75vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">{isEdit ? "Edit " : "Add "}Entry Form</h2>
                            <button
                                onClick={() => {
                                    resetParentForm();
                                    onClose()
                                    setViewMode(false);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        {isLoading ? (
                            <div className="text-center py-4">Loading...</div>
                        ) : (
                            <>
                                <EntryForm
                                    formData={masterFormData}
                                    formValues={masterFormValues}
                                    setFormValues={setMasterFormValues}
                                    dropdownOptions={masterDropdownOptions}
                                    loadingDropdowns={masterLoadingDropdowns}
                                    onDropdownChange={handleMasterDropdownChange}
                                    fieldErrors={fieldErrors} // Pass fieldErrors
                                    setFieldErrors={setFieldErrors} // Pass setFieldErrors
                                    masterValues={masterFormValues}
                                    setFormData={setMasterFormData}
                                    setValidationModal={setValidationModal}
                                />
                                <div className="mt-8">
                                    <div className="flex justify-between items-center mb-4">
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
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full bg-white border border-gray-200">
                                            <thead>
                                                <tr>
                                                    {/* Static headers */}
                                                    <th className="px-4 py-2 border-b">Sr. No</th>
                                                    <th className="px-4 py-2 border-b">Actions</th>

                                                    {/* Dynamic headers - get all unique keys from the first entry */}
                                                    {childEntriesTable.length > 0 && Object.keys(childEntriesTable[0]).map((key) => (
                                                        key !== "SerialNo" && // Exclude SerialNo as it has its own column
                                                        <th key={key} className="px-4 py-2 border-b capitalize">
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
                                                            <td className="px-4 py-2 border-b text-center">{index + 1}</td>

                                                            {/* Actions */}
                                                            <td className="flex gap-1 px-4 py-2 border-b text-center">
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
                                                                <td key={key} className="px-4 py-2 border-b text-center">
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


