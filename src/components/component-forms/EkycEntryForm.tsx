import { useTheme } from "@/context/ThemeContext";
import { EntryFormProps, FormField } from "@/types/EkycFormTypes";
import moment from "moment";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getDropdownStyles } from "../common/CommonStyling";
import CreatableSelect from 'react-select/creatable';
import axios from 'axios';
import "react-datepicker/dist/react-datepicker.css";
import { BASE_URL, PATH_URL } from '@/utils/constants';
import { useSearchParams, useRouter } from 'next/navigation';
import FileUploadWithCrop from './formComponents/FileUploadWithCrop';
import { handleViewFile } from "@/utils/helper";
import OtpVerificationModal from "./formComponents/OtpVerificationComponent";
import LoaderOverlay from "../Loaders/LoadingSpinner";
import Flatpickr from 'react-flatpickr';
import { FaCalendar } from "react-icons/fa";


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
    setDropDownOptions: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
    isJustUpdated?: boolean;
}> = ({
    field,
    formValues,
    setFormValues,
    dropdownOptions,
    loadingDropdowns,
    fieldErrors = {},
    setFieldErrors,
    colors,
    handleBlur,
    isDisabled,
    handleDropDownChange,
    setDropDownOptions,
    isJustUpdated = false
}) => {
        const options = dropdownOptions[field?.wKey] || [];
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
            if (dependent?.length > 0 && dependent[0] !== "") {
                dependent.forEach((fieldName: string) => {
                    setFormValues(prev => ({ ...prev, [fieldName]: '' }));
                    setFieldErrors(prev => ({ ...prev, [fieldName]: '' }));
                });
            }
        }

        const handleInputChange = (key: string, value: any) => {
            setFormValues(prev => ({ ...prev, [key]: value }));

            // Reset visible options when clearing the value
            if (value === null || value === undefined || value === '') {
                setVisibleOptions(options.slice(0, 50));
                setSearchText('');
            }
            // handleDropDownChange(key, value);

            handleRemoveChildDropdownValue(field?.childDependents || []);
            setFieldErrors(prev => ({ ...prev, [key]: '' }));
        };

        const onMenuScrollToBottom = (field: FormField) => {
            const options = dropdownOptions[field?.wKey] || [];
            const currentLength = visibleOptions.length;

            if (currentLength < options.length) {
                const additionalOptions = options.slice(currentLength, currentLength + 50);
                setVisibleOptions(prev => [...prev, ...additionalOptions]);
            }
        };

        const dropdownStyles = getDropdownStyles(colors, isDisabled, fieldErrors, field, isJustUpdated);

        return (
            <div key={field?.Srno} className="mb-1">
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    {field?.label}
                </label>
                <CreatableSelect
                    options={visibleOptions}
                    isClearable
                    value={options.find((opt: any) => opt.value.toString() === formValues[field?.wKey]?.toString()) || null}
                    onChange={(selected) => handleInputChange(field?.wKey, selected?.value)}
                    onInputChange={(inputValue, { action }) => {
                        if (action === 'input-change') setSearchText(inputValue);
                        return inputValue;
                    }}
                    onMenuScrollToBottom={() => onMenuScrollToBottom(field)}
                    onFocus={() => handleDropDownChange(field)}
                    placeholder={
                        formValues[field?.wKey] !== undefined &&
                            formValues[field?.wKey] !== null &&
                            String(formValues[field?.wKey]).trim() !== ""
                            ? String(formValues[field?.wKey])
                            : "Select..."
                    }
                    className="react-select-container"
                    classNamePrefix="react-select"
                    isLoading={loadingDropdowns[field?.wKey]}
                    filterOption={() => true}
                    isDisabled={isDisabled}
                    isValidNewOption={field?.iscreatable === "true" ? undefined : () => false}
                    onCreateOption={(inputValue) => {
                        // Handle creation of new option
                        const newOption = {
                            label: inputValue,
                            value: inputValue
                        };
                        setDropDownOptions(prev => ({
                            ...prev,
                            [field?.wKey]: [...(prev[field?.wKey] || []), newOption]
                        }));
                        // Set the form value to the new option
                        handleInputChange(field?.wKey, inputValue);
                    }}
                    styles={dropdownStyles}
                    onBlur={() => {
                        handleBlur(field);
                    }}
                />
                {fieldErrors[field?.wKey] && (
                    <span className="text-red-500 text-sm">{fieldErrors[field?.wKey]}</span>
                )}
            </div>
        );
    };

const EkycEntryForm: React.FC<EntryFormProps> = ({
    formData = [],
    formValues = {},
    setFormValues,
    dropdownOptions = {},
    loadingDropdowns = {},
    onDropdownChange,
    fieldErrors = {},
    setFieldErrors,
    masterValues = {},
    setFormData,
    setValidationModal,
    setDropDownOptions
}) => {
    const { colors } = useTheme();
    const searchParams = useSearchParams();
    const router = useRouter();
    const success = searchParams.get('success');
    const id = searchParams.get('id');
    const scope = searchParams.get('scope');
    console.log('searchParams', searchParams, scope, success, id); const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
    const [showMobileOtpModal, setShowMobileOtpModal] = useState(false);
    const [currentOtpField, setCurrentOtpField] = useState<any>(null);
    const [isThirdPartyLoading, setIsThirdPartyLoading] = useState(false);

    const marginBottom = 'mb-1';

    const handleInputChange = (key: string, value: any) => {
        const formattedValue = value instanceof Date ? moment(value).format('YYYYMMDD') : value;
        setFormValues(prev => ({ ...prev, [key]: formattedValue }));
        setFieldErrors(prev => ({ ...prev, [key]: '' })); // Clear validation error when field is filled
        if (onDropdownChange) {
            onDropdownChange(key, formattedValue);
        }
    };

    const handleBlur = async (field: FormField) => {
        if (!field?.ValidationAPI || !field?.ValidationAPI?.dsXml) return;

        const { J_Ui = {}, Sql, X_Filter, X_Filter_Multiple = {}, J_Api = {} } = field.ValidationAPI.dsXml;

        let xFilter = '';
        let xFilterMultiple = '';
        let shouldCallApi = true;
        const errors = [];

        if (X_Filter_Multiple && Object.keys(X_Filter_Multiple).length > 0) {
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

        const jUi = Object.entries(J_Ui).map(([key, value]) => `"${key}":"${value}"`).join(',');
        const jApi = Object.entries(J_Api).map(([key, value]) => `"${key}":"${value}"`).join(',');

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

            const columnData = response?.data?.data?.rs0?.[0]?.Column1;
            if (columnData) {
                handleValidationApiResponse(columnData, field.wKey);
            }
        } catch (error) {
            console.error('Validation API error:', error);
        }
    };    // Function to handle Modify button click for redirectUrl fields
    const handleThirdPartyApi = async (field: FormField, type?: any) => {
        // Use field.ThirdPartyAPI if present, else fallback to field.ValidationAPI for demo/testing
        const apiConfig = type === "thirdparty" ? field.ThirdPartyAPI : field.ValidationAPI;
        if (!apiConfig || !apiConfig.dsXml) {
            toast.error('ThirdPartyAPI config missing!');
            return;
        }

        const { J_Ui = {}, Sql, X_Filter, X_Filter_Multiple = {}, J_Api = {} } = apiConfig.dsXml;

        let xFilter = '';
        let xFilterMultiple = '';
        let shouldCallApi = true;
        const errors = [];

        if (X_Filter_Multiple && Object.keys(X_Filter_Multiple).length > 0) {
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

        const jUi = Object.entries(J_Ui).map(([key, value]) => `"${key}":"${value}"`).join(',');
        const jApi = Object.entries(J_Api).map(([key, value]) => `"${key}":"${value}"`).join(',');

        const xmlData = `<dsXml>\n            <J_Ui>${jUi}</J_Ui>\n            <Sql>${Sql || ''}</Sql>\n            <X_Filter>${xFilter}</X_Filter>\n            <X_Filter_Multiple>${xFilterMultiple}</X_Filter_Multiple>\n            <J_Api>${jApi}</J_Api>\n        </dsXml>`;

        try {
            // Set loading state when type is thirdparty
            if (type === "thirdparty") {
                setIsThirdPartyLoading(true);
            }

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });

            // Extract and parse the XML from response
            const columnData = response?.data?.data?.rs0?.[0]?.Column1;
            if (type === "thirdparty" && columnData) {
                handleValidationApiResponse(columnData, field.wKey);
            }
            else if (columnData) {
                // Ensure the XML is wrapped in a root tag
                const xmlString = columnData.trim().startsWith('<root>') ? columnData : `<root>${columnData}</root>`;
                try {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
                    const urlNode = xmlDoc.getElementsByTagName('url')[0];
                    const url = urlNode?.textContent;
                    console.log("check url", url)
                    if (url && field.GetResponseFlag === "true") {
                        window.open(url, '_blank');
                        toast.success('Redirecting to third party URL...');
                        return;
                    } else {
                        window.open(url, '_self');
                        toast.success('Redirecting to third party URL...');
                        return;
                    }
                } catch (err) {
                    console.error('Error parsing ThirdPartyAPI XML:', err);
                }
            }
            console.log('ThirdPartyAPI response:', response?.data);
        } catch (error) {
            console.error('ThirdPartyAPI error:', error);
            toast.error('ThirdPartyAPI error!');
        } finally {
            // Reset loading state when type is thirdparty
            if (type === "thirdparty") {
                setIsThirdPartyLoading(false);
            }
        }
    };

    // const handleValidationApiResponse = (response, currFieldName) => {
    //     if (!response?.trim().startsWith("<root>")) {
    //         response = `<root>${response}</root>`;
    //     }

    //     try {
    //         const parser = new DOMParser();
    //         const xmlDoc = parser.parseFromString(response, "text/xml");

    //         const flag = xmlDoc.getElementsByTagName("Flag")[0]?.textContent;
    //         const message = xmlDoc.getElementsByTagName("Message")[0]?.textContent;
    //         const dynamicTags = Array.from(xmlDoc.documentElement.children).filter(
    //             (node) => node.tagName !== "Flag" && node.tagName !== "Message"
    //         );

    //         switch (flag) {
    //             case 'M':
    //                 setValidationModal({
    //                     isOpen: true,
    //                     message: message || 'Are you sure you want to proceed?',
    //                     type: 'M',
    //                     callback: (confirmed) => {
    //                         if (confirmed) {
    //                             dynamicTags.forEach((tag) => {
    //                                 const tagName = tag.tagName;
    //                                 let tempFormData = formData
    //                                 const tagValue = tag.textContent;
    //                                 setFormValues(prev => ({ ...prev, [tagName]: tagValue}));
    //                                 tempFormData = tempFormData.map(field => {
    //                                     if (field.wKey === tagName) {
    //                                         return { ...field, fieldJustUpdated: "true"};
    //                                     }
    //                                     return field;
    //                                 });
    //                                 setFormData(tempFormData);
    //                             });
    //                         } else {
    //                             setFormValues(prev => ({ ...prev, [currFieldName]: "" }));
    //                         }
    //                         setValidationModal({ isOpen: false, message: '', type: 'M' });
    //                     }
    //                 });
    //                 break;

    //             case 'S':
    //                 setValidationModal({
    //                     isOpen: true,
    //                     message: message || 'Please press ok to proceed',
    //                     type: 'S',
    //                     callback: () => {
    //                         dynamicTags.forEach((tag) => {
    //                             const tagName = tag.tagName;
    //                             const tagValue = tag.textContent;

    //                             setFormValues(prev => ({ ...prev, [tagName]: tagValue }));
    //                             setFieldErrors(prev => ({ ...prev, [tagName]: '' }));

    //                              const tempFormData = formData.map(field => {
    //                                         console.log("only this----",field,tagName)

    //                                     if (field.wKey === tagName) {
    //                                         console.log("only this----",field.wKey,tagName)
    //                                         return { ...field, fieldJustUpdated: "true"};
    //                                     }
    //                                     return field;
    //                                 });
    //                                 console.log("check tempFormData", tempFormData)
    //                                 setFormData(tempFormData);
    //                         });
    //                         setValidationModal({ isOpen: false, message: '', type: 'S' });
    //                     }
    //                 });
    //                 break;

    //             case 'E':
    //                 toast.warning(message);
    //                 setFormValues(prev => ({ ...prev, [currFieldName]: "" }));
    //                 break;

    //             case 'D':
    //                 let updatedFormData = formData;
    //                 dynamicTags.forEach((tag) => {
    //                     const tagName = tag.tagName;
    //                     const tagValue = tag.textContent;
    //                     const tagFlag = tagValue.toLowerCase();
    //                     const isDisabled = tagFlag === 'false';

    //                     if (tagFlag === 'true' || tagFlag === 'false') {
    //                         setFormValues(prev => ({ ...prev, [tagName]: "" }));
    //                         if (isDisabled) {
    //                             setFieldErrors(prev => ({ ...prev, [tagName]: '' }));
    //                         }
    //                     } else {
    //                         setFormValues(prev => ({ ...prev, [tagName]: tagValue}));
    //                     }

    //                     updatedFormData = updatedFormData.map(field => {
    //                         if (field.wKey === tagName) {
    //                             return { ...field, FieldEnabledTag: isDisabled ? 'N' : 'Y' };
    //                         }
    //                         return field;
    //                     });
    //                 });
    //                 setFormData(updatedFormData);
    //                 break;

    //             default:
    //                 console.error("Unknown flag received:", flag);
    //         }
    //     } catch (error) {
    //         console.error("Error parsing XML response:", error);
    //     }
    // };

    const handleValidationApiResponse = (response, currFieldName) => {
        if (!response?.trim().startsWith("<root>")) {
            response = `<root>${response}</root>`;
        }

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(response, "text/xml");

            const flag = xmlDoc.getElementsByTagName("Flag")[0]?.textContent;
            const message = xmlDoc.getElementsByTagName("Message")[0]?.textContent;
            const dynamicTags = Array.from(xmlDoc.documentElement.children).filter(
                (node) => node.tagName !== "Flag" && node.tagName !== "Message"
            );

            const applyTagUpdates = (shouldUpdateFormData = false, setEnabledStatus = false) => {
                let updatedFormValues = { ...formValues };
                let updatedFieldErrors = { ...fieldErrors };
                let updatedFormData = [...formData];

                dynamicTags.forEach(tag => {
                    const tagName = tag.tagName;
                    const tagValue = tag.textContent;
                    const tagFlag = tagValue.toLowerCase();

                    if (flag === 'D') {
                        const isDisabled = tagFlag === 'false';

                        if (tagFlag === 'true' || tagFlag === 'false') {
                            updatedFormValues[tagName] = '';
                            if (isDisabled) {
                                updatedFieldErrors[tagName] = '';
                            }
                        } else {
                            updatedFormValues[tagName] = tagValue;
                        }

                        updatedFormData = updatedFormData.map(field =>
                            field.wKey === tagName
                                ? { ...field, FieldEnabledTag: isDisabled ? 'N' : 'Y' }
                                : field
                        );
                    } else {
                        updatedFormValues[tagName] = tagValue;
                        updatedFieldErrors[tagName] = '';

                        if (shouldUpdateFormData) {
                            updatedFormData = updatedFormData.map(field =>
                                field.wKey === tagName
                                    ? { ...field, fieldJustUpdated: 'true' }
                                    : field
                            );
                        }
                    }
                });

                setFormValues(updatedFormValues);
                setFieldErrors(updatedFieldErrors);
                console.log("check--->", updatedFormData)
                setFormData(updatedFormData);
            };

            switch (flag) {
                case 'M':
                    setValidationModal({
                        isOpen: true,
                        message: message || 'Are you sure you want to proceed?',
                        type: 'M',
                        callback: (confirmed) => {
                            if (confirmed) {
                                applyTagUpdates(true);
                            } else {
                                setFormValues(prev => ({ ...prev, [currFieldName]: '' }));
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
                            applyTagUpdates(true);
                            setValidationModal({ isOpen: false, message: '', type: 'S' });
                        }
                    });
                    break;

                case 'E':
                    toast.warning(message);
                    setFormValues(prev => ({ ...prev, [currFieldName]: '' }));
                    break;

                case 'D':
                    applyTagUpdates(false, true);
                    break;

                default:
                    console.error("Unknown flag received:", flag);
            }
        } catch (error) {
            console.error("Error parsing XML response:", error);
        }
    };


    //this error function is used to show file uploadation
    const handleFieldError = (fieldKey: string, errorMessage: string) => {
        setFieldErrors(prev => ({ ...prev, [fieldKey]: errorMessage }));
    };

    const handleThirdActions = (field: any) => {
        if (field.redirectUrl === "true") {
            handleThirdPartyApi(field);
            localStorage.setItem('redirectedField', field.wKey);
            router.replace(window.location.pathname);
        } else if (field.OTPRequire) {
            setCurrentOtpField(field);
            if (field.wKey.toLowerCase().includes('email')) {
                setShowEmailOtpModal(true);
            } else if (field.wKey.toLowerCase().includes('mobile')) {
                setShowMobileOtpModal(true);
            }
        }
    }; const renderFormField = (field: FormField) => {
        if (!field) return null;

        const isEnabled = field.FieldEnabledTag === 'Y';
        const hasError = fieldErrors && fieldErrors[field.wKey];
        const isJustUpdated = field.fieldJustUpdated === "true";

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
                    setDropDownOptions={setDropDownOptions}
                    isJustUpdated={isJustUpdated}
                />
                );
            case 'WDateBox':
                return (
                    <div key={`dateBox-${field.Srno}-${field.wKey}`} className={marginBottom}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            {field.label}
                        </label>
                        <div className="relative">
                            <Flatpickr
                                value={formValues[field.wKey] ? moment(formValues[field.wKey], 'YYYYMMDD').toDate() : null}
                                onChange={([date]) => handleInputChange(field.wKey, date)}
                                options={{
                                    dateFormat: 'd/m/Y',
                                    allowInput: true,
                                    clickOpens: isEnabled,
                                }}
                                className={`
                        w-full px-3 py-1 pr-10 border rounded-md
                        focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                        ${!isEnabled ? 'border-gray-300 bg-[#f2f2f0]' : hasError ? 'border-red-500' : 'border-gray-700'}
                    `} 
                    style={{
                                    backgroundColor: !isEnabled ? "#f2f2f0" : colors.textInputBackground,
                                    color: isJustUpdated ? "#22c55e" : colors.textInputText
                                }}
                                placeholder="Select Date"
                                onClose={() => handleBlur(field)}
                                disabled={!isEnabled}
                            />
                            <FaCalendar
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                                style={{
                                    color: !isEnabled ? '#9ca3af' : colors.textInputText,
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                        {hasError && (
                            <span className="text-red-500 text-sm">{fieldErrors[field.wKey]}</span>
                        )}
                    </div>
                );
            case 'WTextBox':
                if (field.redirectUrl === "true" || field.OTPRequire) {
                    return (
                        <div key={`textBox-${field.Srno}-${field.wKey}`} className={marginBottom}>
                            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                                {field.label}
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    className={`rounded-r-none w-full px-3 py-1 border border-r-0 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                                    style={{
                                        borderColor: hasError ? 'red' : '#d1d5db',
                                        backgroundColor: "#f2f2f0",
                                        color: isJustUpdated ? "#22c55e" : colors.textInputText,
                                        borderTopRightRadius: 0,
                                        borderBottomRightRadius: 0
                                    }}
                                    value={formValues[field.wKey] || ''}
                                    readOnly
                                    disabled={true}
                                    placeholder={field.label}
                                />
                                <button
                                    type="button"
                                    className="rounded-l-none px-3 py-1 border rounded-md border-black"
                                    style={{
                                        backgroundColor: colors.background,
                                        color: colors.text,
                                        borderTopLeftRadius: 0,
                                        borderBottomLeftRadius: 0,
                                        height: '34px' // match input height
                                    }}
                                    onClick={() => {
                                        handleThirdActions(field)
                                    }}
                                >
                                    Modify
                                </button>

                            </div>
                            {field.GetResponseFlag === "true" && (
                                <span
                                    className="text-blue-500 underline cursor-pointer hover:text-blue-700 mt-1 inline-block"
                                    style={{ height: '35px', lineHeight: '35px' }}
                                    onClick={() => {
                                        handleThirdPartyApi(field, "thirdparty")
                                    }}
                                >
                                    Get bank status
                                </span>
                            )}
                            {hasError && (
                                <span className="text-red-500 text-sm">{fieldErrors[field.wKey]}</span>
                            )}
                        </div>
                    );
                }
                return (
                    <div key={`textBox-${field.Srno}-${field.wKey}`} className={marginBottom}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            {field.label}
                        </label>
                        <input
                            type="text"
                            className={`w-full px-3 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${!isEnabled ? 'border-gray-300' : hasError ? 'border-red-500' : 'border-gray-700'
                                }`}
                            style={{
                                borderColor: hasError ? 'red' : !isEnabled ? '#d1d5db' : "#344054",
                                backgroundColor: !isEnabled ? "#f2f2f0" : colors.textInputBackground,
                                color: isJustUpdated ? "#22c55e" : colors.textInputText
                            }}
                            value={formValues[field.wKey] || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (field.FieldType === 'INT' && !/^[0-9]*$/.test(value)) {
                                    return;
                                }
                                if (value.length <= parseInt(field.FieldSize, 10)) {
                                    handleInputChange(field.wKey, value);
                                }
                            }}
                            onBlur={() => handleBlur(field)}
                            placeholder={field.label}
                            disabled={!isEnabled}
                        />
                        {hasError && (
                            <span className="text-red-500 text-sm">{fieldErrors[field.wKey]}</span>
                        )}
                    </div>
                );

            case 'WCheckBox':
                return (
                    <div key={`checkbox-${field.Srno}-${field.wKey}`} className={marginBottom} style={{ marginTop: "30px" }}>
                        <label className="inline-flex items-center text-sm font-medium" style={{ color: colors.text }}>
                            <input
                                type="checkbox"
                                className={`form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${!isEnabled ? 'bg-gray-200' : ''}`}
                                checked={!!formValues[field.wKey]}
                                onChange={e => handleInputChange(field.wKey, e.target.checked)}
                                onBlur={() => handleBlur(field)}
                                disabled={!isEnabled}
                                style={{ accentColor: colors.textInputText }}
                            />
                            <span className="ml-2">{field.label}</span>
                        </label>
                        {hasError && (
                            <span className="text-red-500 text-sm block">{fieldErrors[field.wKey]}</span>
                        )}
                    </div>
                );

            case 'WDisplayBox':
                return (
                    <div key={`displayBox-${field.Srno}-${field.wKey}`} className={marginBottom}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            {field.label}
                        </label>
                        <div
                            className="w-full px-3 py-1 border rounded-md" style={{
                                borderColor: hasError ? 'red' : !isEnabled ? '#d1d5db' : colors.textInputBorder,
                                backgroundColor: !isEnabled ? "#f2f2f0" : colors.textInputBackground,
                                color: isJustUpdated ? "#22c55e" : colors.textInputText
                            }}
                        >
                            {formValues[field.wKey] || '-'}
                        </div>
                    </div>
                );

            case 'WFile':
                if (field.isResizable === "true") {
                    return (
                        <FileUploadWithCrop
                            key={`fileUpload-${field.Srno}-${field.wKey}`}
                            field={field}
                            formValues={formValues}
                            setFormValues={setFormValues}
                            fieldErrors={fieldErrors}
                            setFieldErrors={setFieldErrors}
                            colors={colors}
                            handleBlur={handleBlur}
                            isDisabled={!isEnabled}
                        />
                    );
                } else {
                    return (
                        <div
                            key={`fileInput-${field.Srno}-${field.wKey}`}
                            className={marginBottom}
                        >
                            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                                {field.label}
                                {/* {field.isMandatory === "true" && <span className="text-red-500 ml-1">*</span>} */}
                            </label>

                            {/* === PREVIEW EXISTING FILE IN EDIT MODE === */}
                            {formValues[field.wKey] && (
                                <div className="mb-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleViewFile(
                                                formValues[field.wKey],
                                                field.FieldType?.split(',')[0] || 'file' // optional second param for extension
                                            )
                                        }
                                        className="text-blue-600 underline"
                                    >
                                        View uploaded file
                                    </button>

                                    {/* Optional: show preview for image types */}
                                    {['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(field.FieldType?.toLowerCase()) && (
                                        <img
                                            src={formValues[field.wKey]}
                                            alt="Uploaded preview"
                                            className="h-24 w-auto rounded border mt-2"
                                        />
                                    )}
                                </div>
                            )}
                            <input
                                type="file"
                                accept={field.FieldType.split(',').map(ext => `.${ext.trim().toLowerCase()}`).join(',')}
                                className={`w-full px-3 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${!isEnabled
                                    ? 'border-gray-300'
                                    : fieldErrors[field.wKey]
                                        ? 'border-red-500'
                                        : 'border-gray-700'
                                    }`}
                                style={{
                                    borderColor: fieldErrors[field.wKey] ? 'red' : !isEnabled ? '#d1d5db' : '#344054',
                                    backgroundColor: !isEnabled ? '#f2f2f0' : colors.textInputBackground,
                                    color: colors.textInputText,
                                    paddingTop: '0.5rem',
                                }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const allowedTypes = field.FieldType.split(',').map(ext => ext.trim().toLowerCase());
                                        const fileType = file.name.split('.').pop()?.toLowerCase();

                                        if (!allowedTypes.includes(fileType)) {
                                            handleFieldError(field.wKey, `Allowed file types: ${field.FieldType}`);
                                            return;
                                        }

                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            const base64 = reader.result as string;
                                            handleInputChange(field.wKey, base64);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                onBlur={() => handleBlur(field)}
                                disabled={!isEnabled}
                            />

                            {fieldErrors[field.wKey] && (
                                <span className="text-red-500 text-sm">{fieldErrors[field.wKey]}</span>
                            )}
                        </div>
                    );

                }
            default:
                return null;
        }
    };
    useEffect(() => {
        if (scope && scope.includes("ADHAR") && success === "True") {
            const redirectedField = localStorage.getItem('redirectedField')
            // Find the field related to ADHAR (by wKey or label containing ADHAR)
            const adharField = formData.find(f => (f.wKey && f.wKey === redirectedField));
            if (adharField && redirectedField) {
                handleThirdPartyApi(adharField, "thirdparty");
                // Clean up localStorage after processing
                localStorage.removeItem('redirectedField');
            }
            // Clear query params from URL
            router.replace(window.location.pathname);
        }
    }, [scope, success, formData]);

    return (
        <div className="grid grid-cols-3 gap-4">
            {!isThirdPartyLoading ? (
                <>
                    {formData.map((field) => renderFormField(field))}
                    {showEmailOtpModal && currentOtpField && (
                        <OtpVerificationModal
                            isOpen={showEmailOtpModal}
                            onClose={() => setShowEmailOtpModal(false)}
                            onSuccess={(verifiedValue) => {
                                handleInputChange(currentOtpField.wKey, verifiedValue);
                                setShowEmailOtpModal(false);
                            }}
                            field={currentOtpField}
                            setFieldErrors={setFieldErrors}
                            formValues={formValues}
                            masterValues={masterValues}
                            type="email"
                            oldValue={currentOtpField.OlddataValue || ''}
                        />
                    )}
                    {showMobileOtpModal && currentOtpField && (
                        <OtpVerificationModal
                            isOpen={showMobileOtpModal}
                            onClose={() => setShowMobileOtpModal(false)}
                            onSuccess={(verifiedValue) => {
                                handleInputChange(currentOtpField.wKey, verifiedValue);
                                setShowMobileOtpModal(false);
                            }}
                            field={currentOtpField}
                            setFieldErrors={setFieldErrors}
                            formValues={formValues}
                            masterValues={masterValues}
                            type="mobile"
                            oldValue={currentOtpField.OlddataValue || ''}
                        />
                    )}
                </>
            ) : (
                <LoaderOverlay
                    loading={isThirdPartyLoading}
                    text="Processing your request..."
                    zIndex={100}
                />

            )}
        </div>
    );


};

export default EkycEntryForm;