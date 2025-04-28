"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';
import moment from 'moment';
import { useTheme } from '@/context/ThemeContext';
import { FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface EntryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    pageData: any;
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
}

interface ChildEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    pageData: any;
    masterValues: Record<string, any>;
    formData: FormField[];
    formValues: Record<string, any>;
    setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    dropdownOptions: Record<string, any[]>;
    loadingDropdowns: Record<string, boolean>;
    onDropdownChange?: (key: string, value: any) => void;
    fieldErrors: Record<string, string>;
    setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    resetChildForm: () => void;
}

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
            if(dependent.length > 0 && dependent[0] !== "") {
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
                    value={options.find((opt: any) => opt.value === formValues[field.wKey]) || null}
                    onChange={(selected) => handleInputChange(field.wKey, selected?.value)}
                    onInputChange={(inputValue, { action }) => {
                        if (action === 'input-change') setSearchText(inputValue);
                        return inputValue;
                    }}
                    onMenuScrollToBottom={() => onMenuScrollToBottom(field)}
                    onFocus={() => handleDropDownChange(field)}
                    placeholder="Select..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                    isLoading={loadingDropdowns[field.wKey]}
                    filterOption={() => true}
                    isDisabled={isDisabled}
                    styles={{
                        control: (base) => ({
                            ...base,
                            borderColor: fieldErrors[field.wKey] ? 'red' : colors.textInputBorder,
                            backgroundColor: colors.textInputBackground,
                        }),
                        singleValue: (base) => ({
                            ...base,
                            color: colors.textInputText,
                        }),
                        option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isFocused ? colors.primary : colors.textInputBackground,
                            color: state.isFocused ? colors.buttonText : colors.textInputText,
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
    setFormData
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
            if(columnData){
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
            response = `<root>${response}</root>`;  // Wrap in root tag
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, "text/xml");

        // Extract Flag and Message
        const flag = xmlDoc.getElementsByTagName("Flag")[0]?.textContent;
        const message = xmlDoc.getElementsByTagName("Message")[0]?.textContent;

        // Extract all other dynamic tags
        const dynamicTags = Array.from(xmlDoc.documentElement.children).filter(
            (node) => node.tagName !== "Flag" && node.tagName !== "Message"
        );

        switch (flag) {
            case 'M':
                const userConfirmed = window.confirm(message);
                if (userConfirmed) {
                    dynamicTags.forEach((tag) => {
                        const tagName = tag.tagName;
                        const tagValue = tag.textContent;
                        setFormValues(prev => ({ ...prev, [tagName]: tagValue }));
                    });
                } else {
                    setFormValues(prev => ({ ...prev, [currFieldName]: "" }));
                }
                break;
            case 'S':
                if (message) {
                    alert(message);
                }
                dynamicTags.forEach((tag) => {
                    const tagName = tag.tagName;
                    const tagValue = tag.textContent;
                    setFormValues(prev => ({ ...prev, [tagName]: tagValue }));
                });
                break;

            case 'E':
                alert(message); // Show error message
                setFormValues(prev => ({ ...prev, [currFieldName]: "" }));
                break;

            case 'D':
        
                dynamicTags.forEach((tag) => {
                    const tagName = tag.tagName;
                    const tagValue = tag.textContent;

                    // Update FieldEnabledTag based on the tag value
                    const isDisabled = tagValue.toLowerCase() === 'false';
                    const updatedFormData = formData.map(field => {
                        if (field.wKey === tagName) {
                            return { ...field, FieldEnabledTag: isDisabled ? 'N' : 'Y' };
                        }
                        return field;
                    });
                    
                    setFormData(updatedFormData);

                });
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
                        key={field.Srno}
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
                    <div key={field.Srno} className={marginBottom}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            {field.label}
                        </label>
                        <DatePicker
                            selected={formValues[field.wKey] ? moment(formValues[field.wKey], 'YYYYMMDD').toDate() : null}
                            onChange={(date: Date | null) => handleInputChange(field.wKey, date)}
                            dateFormat="dd/MM/yyyy"
                            className={`w-full px-3 py-1 border rounded-md ${fieldErrors[field.wKey] ? 'border-red-500' : 'border-gray-300'} bg-${colors.textInputBackground} text-${colors.textInputText}`}
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
                    <div key={field.Srno} className={marginBottom}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            {field.label}
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-1 border rounded-md"
                            style={{
                                borderColor: fieldErrors[field.wKey] ? 'red' : colors.textInputBorder,
                                backgroundColor: colors.textInputBackground,
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
                    <div key={field.Srno} className={marginBottom}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            {field.label}
                        </label>
                        <div
                            className="w-full px-3 py-1 border rounded-md"
                            style={{
                                borderColor: colors.textInputBorder,
                                backgroundColor: colors.textInputBackground,
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
    pageData,
    masterValues,
    formData,
    formValues,
    setFormValues,
    dropdownOptions,
    loadingDropdowns,
    onDropdownChange,
    fieldErrors,
    setFieldErrors,
    setFormData,
    resetChildForm
}) => {
    if (!isOpen) return null;

    const submitFormData = async (masterValues, childEntries) => {
        const jTag = { "ActionName": "OffMarketEntry", "Option": "add" };

        const entry = pageData[0].Entry;
        const childEntry = entry.ChildEntry;

        // Construct J_Ui
        const jUi = Object.entries(jTag)
            .map(([key, value]) => `"${key}":"${value}"`)
            .join(',');

        // Construct J_Api
        const jApi = Object.entries(childEntry.J_Api)
            .map(([key, value]) => `"${key}":"${value}"`)
            .join(',');

        const createXmlTags = (data) => {
            return Object.entries(data).map(([key, value]) => {
                if (Array.isArray(value)) {
                    return `<${key}>${value.map(item => `<item>${createXmlTags(item)}</item>`).join('')}</${key}>`;
                } else if (typeof value === 'object' && value !== null) {
                    return `<${key}>${createXmlTags(value)}</${key}>`;
                } else {
                    return `<${key}>${value || ''}</${key}>`;
                }
            }).join('');
        };

        const xData = createXmlTags({
            ...masterValues,
            items: { item: childEntries },
            UserId: "ANUJ"
        });

        const xmlData = `<dsXml>
            <J_Ui>${jUi}</J_Ui>
            <X_Filter></X_Filter>
            <X_Data>${xData}</X_Data>
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
                console.log('Form submitted successfully:', response?.data?.data);
            } else {
                alert(response?.data?.message)
            }
            alert('Form submitted successfully!');
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Failed to submit the form. Please try again.');
        }
    };


    return (
        <div className="fixed inset-0 flex items-center justify-center z-[200]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-lg p-6 w-full max-w-[80vw] overflow-y-auto min-h-[75vh] max-h-[75vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Child Entry Form</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
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
                />

                <div className="text-end mt-5">
                    <button
                        onClick={resetChildForm}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => {
                            submitFormData(masterValues, formValues)
                        }
                        }
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

const EntryFormModal: React.FC<EntryFormModalProps> = ({ isOpen, onClose, pageData }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [masterFormData, setMasterFormData] = useState<FormField[]>([]);
    const [masterFormValues, setMasterFormValues] = useState<Record<string, any>>({});
    const [masterDropdownOptions, setMasterDropdownOptions] = useState<Record<string, any[]>>({});
    const [masterLoadingDropdowns, setMasterLoadingDropdowns] = useState<Record<string, boolean>>({});
    const [isChildModalOpen, setIsChildModalOpen] = useState(false);
    const [childEntries, setChildEntries] = useState<any[]>([]);
    const [childFormData, setChildFormData] = useState<FormField[]>([]);
    const [childFormValues, setChildFormValues] = useState<Record<string, any>>({});
    const [childDropdownOptions, setChildDropdownOptions] = useState<Record<string, any[]>>({});
    const [childLoadingDropdowns, setChildLoadingDropdowns] = useState<Record<string, boolean>>({});
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    console.log('Master Form Data:', masterFormValues, childFormValues,childDropdownOptions);
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

            const options = response.data.data.rs0.map((item: any) => ({
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

        // adding this to remove the dependent field value when the parent field is changed 
        const setDependentfieldEmpty = isChild ? setChildFormValues : setMasterFormValues;

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

            const options = response.data.data.rs0.map((item: any) => ({
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
        console.log("check field", field);
        if (field.dependsOn) {
            if (Array.isArray(field.dependsOn.field)) {
                fetchDependentOptions(field, "");
            }
        }

    };

    const handleChildDropdownChange = (field: any) => {
        // Find dependent fields and update them
        console.log("check field", field);
        if (field.dependsOn) {
            if (Array.isArray(field.dependsOn.field)) {
                fetchDependentOptions(field, "", true);
            }
        }
    };

    const fetchMasterEntryData = async () => {
        if (!pageData?.[0]?.Entry) return;

        setIsLoading(true);
        try {
            const entry = pageData[0].Entry;
            const masterEntry = entry.MasterEntry;

            // Construct J_Ui
            const jUi = Object.entries(masterEntry.J_Ui)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            // Construct J_Api
            const jApi = Object.entries(masterEntry.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            // Construct X_Filter
            let xFilter = '';
            Object.entries(masterEntry.X_Filter).forEach(([key, value]) => {
                if (value === '##InstrumentType##' || value === '##IntRefNo##') {
                    xFilter += `<${key}></${key}>`;
                } else {
                    xFilter += `<${key}>${value}</${key}>`;
                }
            });

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${masterEntry.Sql || ''}</Sql>
                <X_Filter>${xFilter}</X_Filter>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });

            setMasterFormData(response.data.data.rs0);

            // Initialize form values with any preset values
            const initialValues: Record<string, any> = {};
            response.data.data.rs0.forEach((field: FormField) => {
                if (field.type === 'WDateBox' && field.wValue) {
                    initialValues[field.wKey] = moment(field.wValue).format('YYYYMMDD');
                }
            });
            setMasterFormValues(initialValues);

            // Fetch initial dropdown options
            response.data.data.rs0.forEach((field: FormField) => {
                if (field.type === 'WDropDownBox' && field.wQuery) {
                    fetchDropdownOptions(field);
                }
            });
        } catch (error) {
            console.error('Error fetching MasterEntry data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchChildEntryData = async () => {
        if (!pageData?.[0]?.Entry) return;

        try {
            const entry = pageData[0].Entry;
            const childEntry = entry.ChildEntry;

            // Construct J_Ui
            const jUi = Object.entries(childEntry.J_Ui)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            // Construct J_Api
            const jApi = Object.entries(childEntry.J_Api)
                .map(([key, value]) => `"${key}":"${value}"`)
                .join(',');

            // Construct X_Filter with values from master form
            let xFilter = '';
            Object.entries(childEntry.X_Filter).forEach(([key, value]) => {
                if (value === '##SerialNo##') {
                    xFilter += `<${key}></${key}>`;
                } else if (value === '##InstrumentType##') {
                    xFilter += `<${key}>${masterFormValues.InstrumentType || ''}</${key}>`;
                } else {
                    xFilter += `<${key}>${value}</${key}>`;
                }
            });

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${childEntry.Sql || ''}</Sql>
                <X_Filter>${xFilter}</X_Filter>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });

            setChildFormData(response.data.data.rs0);

            // Initialize child form values with any preset values
            const initialValues: Record<string, any> = {};
            response.data.data.rs0.forEach((field: FormField) => {
                if (field.type === 'WDateBox' && field.wValue) {
                    initialValues[field.wKey] = moment(field.wValue).format('YYYYMMDD');
                }
            });
            setChildFormValues(initialValues);

            // Fetch initial dropdown options
            response.data.data.rs0.forEach((field: FormField) => {
                if (field.type === 'WDropDownBox' && field.wQuery) {
                    fetchDropdownOptions(field, true);
                }
            });
        } catch (error) {
            console.error('Error fetching ChildEntry data:', error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMasterEntryData();
        }
    }, [isOpen, pageData]);

    const handleAddChildEntry = () => {
        setIsChildModalOpen(true);
        if (childFormData?.length > 0) {
            return
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
        //clear the child dependent dropdown options
        // setChildDropdownOptions(prevOptions =>{
        //     const updatedOptions = { ...prevOptions };
        //     childFormData.forEach(field => {
        //         if (field.dependsOn) {
        //             delete updatedOptions[field.wKey];
        //         }
        //     });
        //     return updatedOptions;
        // })
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-100" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-lg p-6 w-full max-w-[80vw] overflow-y-auto min-h-[75vh] max-h-[75vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Entry Form</h2>
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
                        />

                        <div className="mt-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Child Entries</h3>
                                <button
                                    onClick={handleAddChildEntry}
                                    className={`flex items-center gap-2 px-4 py-2 ${isFormInvalid ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md`}
                                    disabled={isFormInvalid}
                                >
                                    <FaPlus /> Add Entry
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border border-gray-200">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 border-b">Sr. No</th>
                                            <th className="px-4 py-2 border-b">Instrument Type</th>
                                            <th className="px-4 py-2 border-b">Serial No</th>
                                            <th className="px-4 py-2 border-b">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {childEntries.map((entry, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 border-b">{index + 1}</td>
                                                <td className="px-4 py-2 border-b">{entry.InstrumentType}</td>
                                                <td className="px-4 py-2 border-b">{entry.SerialNo}</td>
                                                <td className="px-4 py-2 border-b">
                                                    <button className="text-red-500 hover:text-red-700">
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {isChildModalOpen && (
                <ChildEntryModal
                    isOpen={isChildModalOpen}
                    onClose={() => setIsChildModalOpen(false)}
                    pageData={pageData}
                    masterValues={masterFormValues}
                    formData={childFormData}
                    formValues={childFormValues}
                    setFormValues={setChildFormValues}
                    dropdownOptions={childDropdownOptions}
                    loadingDropdowns={childLoadingDropdowns}
                    onDropdownChange={handleChildDropdownChange}
                    fieldErrors={fieldErrors} // Pass fieldErrors
                    setFieldErrors={setFieldErrors} // Pass setFieldErrors
                    setFormData={setChildFormData}
                    resetChildForm={resetChildForm}
                />
            )}
        </div>
    );
};

export default EntryFormModal;


