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

interface EntryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    pageData: any;
}

interface FormField {
    Srno: number;
    type: string;
    label: string;
    wKey: string;
    FieldSize: string;
    FieldType: string;
    ValidationAPI: any;
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
    setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    dropdownOptions: Record<string, any[]>;
    loadingDropdowns: Record<string, boolean>;
    onDropdownChange?: (key: string, value: any) => void;
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
}

const EntryForm: React.FC<EntryFormProps> = ({
    formData,
    formValues,
    setFormValues,
    dropdownOptions,
    loadingDropdowns,
    onDropdownChange
}) => {
    const { colors } = useTheme();
    const marginBottom = 'mb-1';

    const handleInputChange = (key: string, value: any) => {
        setFormValues(prev => ({ ...prev, [key]: value }));
        if (onDropdownChange) {
            onDropdownChange(key, value);
        }
    };

    const renderFormField = (field: FormField) => {
        switch (field.type) {
            case 'WDropDownBox':
                return (
                    <div key={field.Srno} className={marginBottom}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            {field.label}
                        </label>
                        <Select
                            options={dropdownOptions[field.wKey] || []}
                            value={dropdownOptions[field.wKey]?.find(
                                (opt: any) => opt.value === formValues[field.wKey]
                            )}
                            onChange={(selected) => handleInputChange(field.wKey, selected?.value)}
                            isLoading={loadingDropdowns[field.wKey]}
                            placeholder="Select..."
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    borderColor: colors.textInputBorder,
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
                        />
                    </div>
                );

            case 'WDateBox':
                return (
                    <div key={field.Srno} className={marginBottom}>
                        <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                            {field.label}
                        </label>
                        <DatePicker
                            selected={formValues[field.wKey]}
                            onChange={(date: Date | null) => handleInputChange(field.wKey, date)}
                            dateFormat="dd/MM/yyyy"
                            className="w-full px-3 py-1 border rounded-md"
                            wrapperClassName="w-full"
                            placeholderText="Select Date"
                        />
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
                                borderColor: colors.textInputBorder,
                                backgroundColor: colors.textInputBackground,
                                color: colors.textInputText
                            }}
                            value={formValues[field.wKey] || ''}
                            onChange={(e) => handleInputChange(field.wKey, e.target.value)}
                            placeholder={field.label}
                        />
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
    onDropdownChange
}) => {
    if (!isOpen) return null;

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
                    setFormValues={setFormValues}
                    dropdownOptions={dropdownOptions}
                    loadingDropdowns={loadingDropdowns}
                    onDropdownChange={onDropdownChange}
                />
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
        const formValues = isChild ? childFormValues : masterFormValues;

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
                        xFilter += `<${fieldName}>${formValues[fieldName] || ''}</${fieldName}>`;
                    });
                } else {
                    xFilter = `<${field.dependsOn.field}>${parentValue}</${field.dependsOn.field}>`;
                }
            }

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${field.dependsOn.wQuery.Sql || ''}</Sql>
                <X_Filter>${xFilter}</X_Filter>
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
            console.error(`Error fetching dependent options for ${field.wKey}:`, error);
        } finally {
            setLoadingDropdowns(prev => ({ ...prev, [field.wKey]: false }));
        }
    };

    const handleMasterDropdownChange = (key: string, value: any) => {
        // Find dependent fields and update them
        masterFormData.forEach(field => {
            if (field.dependsOn) {
                if (Array.isArray(field.dependsOn.field)) {
                    if (field.dependsOn.field.includes(key)) {
                        fetchDependentOptions(field, value);
                    }
                } else if (field.dependsOn.field === key) {
                    fetchDependentOptions(field, value);
                }
            }
        });
    };

    const handleChildDropdownChange = (key: string, value: any) => {
        // Find dependent fields and update them
        childFormData.forEach(field => {
            if (field.dependsOn) {
                if (Array.isArray(field.dependsOn.field)) {
                    if (field.dependsOn.field.includes(key)) {
                        fetchDependentOptions(field, value, true);
                    }
                } else if (field.dependsOn.field === key) {
                    fetchDependentOptions(field, value, true);
                }
            }
        });
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
                    initialValues[field.wKey] = moment(field.wValue, 'YYYYMMDD').toDate();
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
                    initialValues[field.wKey] = moment(field.wValue, 'YYYYMMDD').toDate();
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
        fetchChildEntryData();
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
                        />

                        <div className="mt-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Child Entries</h3>
                                <button
                                    onClick={handleAddChildEntry}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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
                />
            )}
        </div>
    );
};

export default EntryFormModal;
