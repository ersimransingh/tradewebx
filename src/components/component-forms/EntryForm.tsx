import { useTheme } from "@/context/ThemeContext";
import { EntryFormProps, FormField } from "@/types";
import moment from "moment";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getDropdownStyles } from "../common/CommonStyling";
import CreatableSelect from 'react-select/creatable';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { BASE_URL, PATH_URL } from '@/utils/constants';
import apiService from "@/utils/apiService";
import FileUploadWithCropForNormalForm from "./formComponents/FileUploadWithCropForNormalForm";
import CustomDateTimePicker from "./formComponents/CustomDateTimePicker";
import CustomDatePicker from "./formComponents/CustomDatePicker";

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
    fieldWidth?: string;
    isJustUpdated?: boolean;
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
    handleDropDownChange,
    setDropDownOptions,
    isJustUpdated = false
}) => {
        const options = dropdownOptions[field.wKey] || [];
        const [visibleOptions, setVisibleOptions] = useState(options.slice(0, 50));
        const [searchText, setSearchText] = useState('');
        const [hasAutoSelected, setHasAutoSelected] = useState(false);
        const isRequired = field.isMandatory === "true";
        const allowedFieldLength = field.FieldSize ? parseInt(field.FieldSize, 10) : 20; 
        const fieldWidth = field.FieldWidth ? `${field.FieldWidth}px` : '100%';

        const containerStyle = {
            width: fieldWidth,
        };

        const containerStylesForBr = {
            width: "100%",
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: "16px 24px",
            alignItems: "start"
        }


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

            // Reset visible options when clearing the value
            if (value === null || value === undefined || value === '') {
                setVisibleOptions(options.slice(0, 50));
                setSearchText('');
            }
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

        const dropdownStyles = getDropdownStyles(colors, isDisabled, fieldErrors, field, isJustUpdated);

        // ---->(start) useEffect to show dropdown value selected if it only have 1 option in it <----
         useEffect(() => {
            if (options.length === 1 && 
               (!formValues[field.wKey] || formValues[field.wKey] === '') &&
               !hasAutoSelected &&
               !loadingDropdowns[field.wKey]) {
                
               const singleOption = options[0];
                
               setFormValues(prev => ({ ...prev, [field.wKey]: singleOption.value }));
               setFieldErrors(prev => ({ ...prev, [field.wKey]: '' }));
               setHasAutoSelected(true);    
            }
        
              // Reset hasAutoSelected when options change significantly
              if (options.length !== 1) {
                  setHasAutoSelected(false);
              }
            }, [options, formValues[field.wKey], loadingDropdowns[field.wKey],hasAutoSelected]);

             // Reset hasAutoSelected when the component unmounts or field changes
             useEffect(() => {
                 return () => {
                     setHasAutoSelected(false);
                 };
             }, [field.wKey]);
        // ---->(end) useEffect to show dropdown value selected if it only have 1 option in it <----


        return (
            <div key={field.Srno} className="mb-1" style={field.isBR === "true" ? containerStylesForBr : containerStyle}>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text, wordBreak: "break-all" }}>
                    {field.label}
                    {isRequired && <span className="text-red-500 ml-1">*</span>}

                </label>
                <CreatableSelect
                    options={visibleOptions}
                    isClearable
                    value={options.find((opt: any) => {
                        const optValue = typeof opt.value === 'string' ? opt.value.trim() : opt.value;
                        const formValue = typeof formValues[field.wKey] === 'string' ? formValues[field.wKey].trim() : formValues[field.wKey];
                        return String(optValue) === String(formValue);
                    }) || null}
                    onChange={(selected) => {
                        const value = selected?.value;
                        const processedValue = typeof value === 'string' ? value.trim() : value;
                        handleInputChange(field.wKey, processedValue);
                    }}
                    onInputChange={(inputValue, { action }) => {
                        if (action === 'input-change') {
                            // Prevent typing beyond allowed length for creatable fields
                            if (field.iscreatable === "true" && inputValue.length > allowedFieldLength) {
                                setSearchText(inputValue.slice(0, allowedFieldLength));
                                return inputValue.slice(0, allowedFieldLength);
                            }
                            setSearchText(inputValue);
                        }
                        return inputValue;
                    }}
                    onMenuScrollToBottom={() => onMenuScrollToBottom(field)}
                    onFocus={() => handleDropDownChange(field)}
                    placeholder={
                        formValues[field.wKey] !== undefined &&
                            formValues[field.wKey] !== null &&
                            String(formValues[field.wKey]).trim() !== ""
                            ? String(formValues[field.wKey])
                            : "Select..."
                    }
                    className="react-select-container"
                    classNamePrefix="react-select"
                    isLoading={loadingDropdowns[field.wKey]}
                    menuPortalTarget={document.body}
                    filterOption={() => true}
                    isDisabled={isDisabled}
                    isValidNewOption={field.iscreatable === "true" ? undefined : () => false}
                    onCreateOption={(inputValue) => {
                        // Handle creation of new option
                        const newOption = {
                            label: inputValue,
                            value: inputValue
                        };
                        setDropDownOptions(prev => ({
                            ...prev,
                            [field.wKey]: [...(prev[field.wKey] || []), newOption]
                        }));
                        // Set the form value to the new option
                        handleInputChange(field.wKey, inputValue);
                    }}
                    styles={dropdownStyles}
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
    setValidationModal,
    setDropDownOptions
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
                    if(field.isMandatory === "true"){
                        setFieldErrors(prev => ({ ...prev, [key]: `Please fill the required field: ${key}` }));
                        setFormValues(prev => ({ ...prev, [field.wKey]: '' }));
                    }
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
              if(field.isMandatory === "true"){
                setFieldErrors(prev => ({ ...prev, [X_Filter]: `Please fill the required field: ${X_Filter}` }));
                setFormValues(prev => ({ ...prev, [field.wKey]: '' }));
              }
                shouldCallApi = false;
                errors.push(X_Filter);
            } else {
                xFilter = `<${X_Filter}>${fieldValue}</${X_Filter}>`;
            }
        }

        if (errors.length > 0) {
            toast.error(`Please fill the fields: ${errors.join(', ')} to validate`);
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
            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            // calling the function to  handle the flags
            const columnData = response?.data?.data?.rs0[0]?.Column1
            if (columnData) {
                handleValidationApiResponse(columnData, field.wKey, field);
            }
        } catch (error) {
            console.error('Validation API error:', error);
            // setFieldErrors(prev => ({ ...prev, [field.wKey]: 'Validation failed. Please try again.' }));
            // setFormValues(prev => ({ ...prev, [field.wKey]: '' }));
        }
    };


    // this function is used to show the respected flags according to the response from the API
    const handleValidationApiResponse = (response: any, currFieldName: any, field: any) => {
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
                                // handleBlur(field)
                            });
                        } else {
                            setFormValues(prev => ({ ...prev, [currFieldName]: "" }));
                        }
                        setValidationModal({ isOpen: false, message: '', type: 'M' });
                    }
                });
                break;

            case 'S':
                // setValidationModal({
                //     isOpen: true,
                //     message: message || 'Please press ok to proceed',
                //     type: 'S',
                //     callback: () => {
                //         dynamicTags.forEach((tag) => {
                //             const tagName = tag.tagName;
                //             const tagValue = tag.textContent;
                //             setFormValues(prev => ({ ...prev, [tagName]: tagValue }));
                //             setFieldErrors(prev => ({ ...prev, [tagName]: '' })); // Clear error
                //         });
                //         setValidationModal({ isOpen: false, message: '', type: 'S' });
                //     }
                // });
                dynamicTags.forEach((tag) => {
                    const tagName = tag.tagName;
                    const tagValue = tag.textContent;
                    setFormValues(prev => ({ ...prev, [tagName]: tagValue }));
                    setFieldErrors(prev => ({ ...prev, [tagName]: '' })); // Clear error
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
                        // setFormValues(prev => ({ ...prev, [tagName]: "" }));
                        if (isDisabled) {
                            // handleBlur(field);
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

    const renderFormField = (field: FormField, index: number) => {
        const isEnabled = field.FieldEnabledTag === 'Y';
        const isRequired = field.isMandatory === "true";
        const isFieldVisible  = field.FieldVisibleTag === "Y";
        // skip this for filed type input box 
        const fieldValue = (formValues[field.wKey] ?? "").toString().trim();
        const isJustUpdated = field?.fieldJustUpdated?.toLowerCase() === "true" || field?.isChangeColumn?.toLowerCase() === "true";


        // Get field width or default to full width
        const fieldWidth = field.FieldWidth ? `${field.FieldWidth}px` : '100%';

        // Common container style with dynamic width
        const containerStyle = {
            width: fieldWidth,
            marginBottom: marginBottom
        };
        const checkBoxStyle = {
            width: fieldWidth,
            marginBottom: marginBottom,
            marginTop: "30px"
        };

        const containerStylesForBr = {
            width: "100%",
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: "16px 24px",
            alignItems: "start"
        }
        if(!isFieldVisible){
            return;
        }

        switch (field.type) {
            case 'WDropDownBox':
                return (
                    <div key={`field-${field.Srno}-${field.wKey}-${index}`} style={containerStyle}>
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
                            fieldWidth={fieldWidth}
                            isJustUpdated={isJustUpdated}
                        />
                    </div>
                );

           case 'WDateTimePicker':
                  return (
                    <div key={`field-${field.Srno}-${field.wKey}-${index}`} style={field.isBR === "true" ? containerStylesForBr : containerStyle}>
                      <label className="block text-sm font-medium mb-1" style={{ color: colors.text, wordBreak: 'break-all' }}>
                        {field.label}
                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <CustomDateTimePicker
                        selected={fieldValue ? moment(fieldValue, 'YYYYMMDD HH:mm:ss').toDate() : null}
                        onChange={(date: Date | null) => {
                          if (date) {
                            // Format the date as "20251006 15:58:16"
                            const formattedDateTime = moment(date).format('YYYYMMDD HH:mm:ss');
                            handleInputChange(field.wKey, formattedDateTime);
                          } else {
                            handleInputChange(field.wKey, null);
                          }
                        }}
                        disabled={!isEnabled}
                        className={`
                          ${!isEnabled
                            ? 'border-gray-300 bg-[#f2f2f0]'
                            : fieldErrors[field.wKey]
                              ? 'border-red-500'
                              : 'border-gray-700'
                          }
                          ${colors.textInputBackground ? `bg-${colors.textInputBackground}` : ''}
                          ${isJustUpdated ? 'text-green-500' : ''}
                        `}
                        placeholderText="Select Date & Time"
                        onBlur={() => handleBlur(field)}
                        showTimeSelect={true}
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="dd/MM/yyyy HH:mm"
                      />
                      {fieldErrors[field.wKey] && (
                        <span className="text-red-500 text-sm">{fieldErrors[field.wKey]}</span>
                      )}
                    </div>
                  );
            case 'WDateBox':
                return (
                    <div key={`field-${field.Srno}-${field.wKey}-${index}`} style={field.isBR === "true" ? containerStylesForBr : containerStyle}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text, wordBreak: 'break-all' }}>
                            {field.label}
                            {isRequired && <span className="text-red-500 ml-1">*</span>}
                        </label>
                         <CustomDatePicker
                           selected={
                               formValues[field.wKey] && 
                               formValues[field.wKey].trim() && 
                               moment(formValues[field.wKey], 'YYYYMMDD', true).isValid() 
                                 ? moment(formValues[field.wKey], 'YYYYMMDD').toDate() 
                                 : null
                             }
                             onChange={(date) => {
                               const formattedDate = date ? moment(date).format('YYYYMMDD') : null;
                               handleInputChange(field.wKey, formattedDate);
                             }}
                           disabled={!isEnabled}
                           className={`
                                 w-full px-3 py-1 border rounded-md
                                 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                                 ${!isEnabled
                                    ? 'border-gray-300 bg-[#f2f2f0]'
                                    : fieldErrors[field.wKey]
                                        ? 'border-red-500'
                                        : 'border-gray-700'
                                }
                         ${colors.textInputBackground ? `bg-[${colors.textInputBackground}]` : ''}
                         ${isJustUpdated ? 'text-green-500' : ''}
                     `}
                                 onBlur={() => handleBlur(field)}
                                 placeholder="Select Date"
                                 id={field.wKey}
                                 name={field.wKey}
                             />
                        {fieldErrors[field.wKey] && (
                            <span className="text-red-500 text-sm">{fieldErrors[field.wKey]}</span>
                        )}
                    </div>
                );

            case 'WTextBox':
                return (
                    <div key={`field-${field.Srno}-${field.wKey}-${index}`} style={field.isBR === "true" ? containerStylesForBr : containerStyle}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text, wordBreak: 'break-all' }}>
                            {field.label}
                            {isRequired && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                            type="text"
                            className={`w-full px-3 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${!isEnabled ? 'border-gray-300' : fieldErrors[field.wKey] ? 'border-red-500' : 'border-gray-700'
                                }`}
                            style={{
                                borderColor: fieldErrors[field.wKey] ? 'red' : !isEnabled ? '#d1d5db' : "#344054",
                                backgroundColor: !isEnabled ? "#f2f2f0" : colors.textInputBackground,
                                color: isJustUpdated ? "#22c55e" : colors.textInputText,
                                width: fieldWidth // Apply width to input directly
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
            case 'WCheckBox':
                return (
                    <div key={`checkbox-${field.Srno}-${field.wKey}`} style={field.isBR === "true" ? containerStylesForBr : checkBoxStyle}>
                        <label className="inline-flex items-center text-sm font-medium" style={{ color: isJustUpdated ? "#22c55e" : colors.textInputText, wordBreak: "break-all" }}>
                            <input
                                type="checkbox"
                                className={`form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${!isEnabled ? 'bg-gray-200' : ''}`}
                                checked={fieldValue === "true" || fieldValue === true}
                                onChange={e => handleInputChange(field.wKey, String(e.target.checked))}
                                onBlur={() => handleBlur(field)}
                                disabled={!isEnabled}
                                style={{ accentColor: isJustUpdated ? "#22c55e" : colors.textInputText, }}
                            />
                            <span className="ml-2">
                                {field.label}
                                {isRequired && <span className="text-red-500 ml-1">*</span>}
                            </span>
                        </label>
                        {fieldErrors[field.wKey] && (
                            <span className="text-red-500 text-sm">{fieldErrors[field.wKey]}</span>
                        )}
                    </div>
                );
            case 'WDisplayBox':
                return (
                    <div key={`field-${field.Srno}-${field.wKey}-${index}`} style={field.isBR === "true" ? containerStylesForBr : containerStyle}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text, wordBreak: 'break-all' }}>
                            {field.label}
                        </label>
                        <div
                            className="w-full px-3 py-1 border rounded-md"
                            style={{
                                borderColor: fieldErrors[field.wKey] ? 'red' : !isEnabled ? '#d1d5db' : colors.textInputBorder,
                                backgroundColor: !isEnabled ? "#f2f2f0" : colors.textInputBackground,
                                color: isJustUpdated ? "#22c55e" : colors.textInputText,
                                width: fieldWidth // Apply width to display box
                            }}
                        >
                            {formValues[field.wKey] || '-'}
                        </div>
                    </div>
                );
            case 'WFile':
                return (
                    <FileUploadWithCropForNormalForm
                        key={`fileUpload-${field.Srno}-${field.wKey}`}
                        field={field}
                        formValues={formValues}
                        setFormValues={setFormValues}
                        fieldErrors={fieldErrors}
                        setFieldErrors={setFieldErrors}
                        colors={colors}
                        handleBlur={handleBlur}
                        isDisabled={!isEnabled}
                        fieldWidth={fieldWidth}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="flex flex-wrap gap-4">
            {formData.map((field, index) => renderFormField(field, index))}
        </div>
    );
};


export default EntryForm;