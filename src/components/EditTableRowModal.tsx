"use client";
import React, { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import CustomDropdown from './form/CustomDropdown';
import { useTheme } from '@/context/ThemeContext';

interface RowData {
    [key: string]: any;
}

interface EditableColumn {
    ValidationAPI: any;
    Srno: number;
    type: "WTextBox" | "WDropDownBox" | "WDateBox";
    label: string;
    wKey: string;
    showLabel: boolean;
    wPlaceholder?: string;
    options?: Array<{
        label: string;
        Value: string;
    }>;
    dependsOn?: {
        field: string | string[];
        wQuery: {
            J_Ui: any;
            Sql: string;
            X_Filter: string;
            X_Filter_Multiple?: string;
            J_Api: any;
        };
    };
    wDropDownKey?: {
        key: string;
        value: string;
    };
}

interface EditTableRowModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    tableData: RowData[];
    wPage: string;
    settings: {
        EditableColumn: EditableColumn[];
    }
}

const EditTableRowModal: React.FC<EditTableRowModalProps> = ({
    isOpen,
    onClose,
    title,
    tableData,
    wPage,
    settings,
}) => {
    const { colors, fonts } = useTheme();
    const [localData, setLocalData] = useState<RowData[]>([]);
    const [previousValues, setPreviousValues] = useState<Record<string, any>>({});
    const [dropdownOptions, setDropdownOptions] = useState<Record<string, any[]>>({});
    const [loadingDropdowns, setLoadingDropdowns] = useState<Record<string, boolean>>({});
    const [validationModal, setValidationModal] = useState<{
        isOpen: boolean;
        message: string;
        type: 'M' | 'S' | 'E' | 'D';
    }>({
        isOpen: false,
        message: '',
        type: 'E'
    });
    const editableColumns = settings.EditableColumn || [];

    const showValidationMessage = (message: string, type: 'M' | 'S' | 'E' | 'D' = 'E') => {
        setValidationModal({
            isOpen: true,
            message,
            type
        });
    };

    const handleValidationClose = () => {
        setValidationModal(prev => ({ ...prev, isOpen: false }));
    };

    const isNumeric = (value: any): boolean => {
        if (value === null || value === undefined) return false;
        return !isNaN(Number(value)) && typeof value !== 'boolean';
    };

    const hasCharacterField = (columnKey: string): boolean => {
        return localData.some(row => {
            const value = row[columnKey];
            if (value === null || value === undefined) return false;
            // Check if the value is a string and not a number
            return typeof value === 'string' && value.trim() !== '' && isNaN(Number(value));
        });
    };

    useEffect(() => {
        setLocalData(tableData || []);
    }, [tableData]);

    useEffect(() => {
        // Initialize dropdowns on component mount
        editableColumns.forEach(column => {
            if (column.type === 'WDropDownBox' && !column.options && column.dependsOn) {
                // These will be loaded when the parent field changes
            } else if (column.type === 'WDropDownBox' && !column.options) {
                // These need to be loaded immediately
                fetchDropdownOptions(column);
            }
        });
    }, [editableColumns]);

    const handleInputChange = (rowIndex: number, key: string, value: any) => {
        const updated = [...localData];
        updated[rowIndex] = { ...updated[rowIndex], [key]: value };
        setLocalData(updated);

        // Check if any dropdown depends on this field
        const dependentColumns = editableColumns.filter(column =>
            column.dependsOn &&
            (Array.isArray(column.dependsOn.field)
                ? column.dependsOn.field.includes(key)
                : column.dependsOn.field === key)
        );

        // Update dependent dropdowns
        if (dependentColumns.length > 0) {
            dependentColumns.forEach(column => {
                // For each row, fetch the dependent options
                updated.forEach((_, idx) => {
                    if (Array.isArray(column.dependsOn!.field)) {
                        const allFieldValues = column.dependsOn!.field.reduce((acc, field) => {
                            acc[field] = updated[idx][field];
                            return acc;
                        }, {} as Record<string, any>);

                        fetchDependentOptions(column, allFieldValues, idx);
                    } else {
                        fetchDependentOptions(column, updated[idx][key], idx);
                    }
                });
            });
        }
    };

    const handleInputBlur = async (rowIndex: number, key: string, previousValue: any) => {
        const field = editableColumns.find(col => col.wKey === key);
        if (!field?.ValidationAPI?.dsXml) return;
        const rowValues = localData[rowIndex] || {};
        const { J_Ui, Sql, X_Filter, X_Filter_Multiple, J_Api } = field.ValidationAPI.dsXml;
        let xFilter = '';
        let xFilterMultiple = '';
        let shouldCallApi = true;
        const missingFields: string[] = [];
        if (X_Filter_Multiple) {
            Object.entries(X_Filter_Multiple).forEach(([key, placeholder]) => {
                let fieldValue: any;

                if (typeof placeholder === 'string' && placeholder.startsWith('##') && placeholder.endsWith('##')) {
                    const lookupKey = placeholder.slice(2, -2);
                    fieldValue = rowValues[lookupKey];
                } else {
                    fieldValue = placeholder;
                }

                if (!fieldValue) {
                    missingFields.push(key);
                    shouldCallApi = false;
                } else {
                    xFilterMultiple += `<${key}>${fieldValue}</${key}>`;
                }
            });
        } else if (X_Filter) {
            let filterKey = '';
            let fieldValue: any;

            if (X_Filter.startsWith('##') && X_Filter.endsWith('##')) {
                filterKey = X_Filter.slice(2, -2);
                fieldValue = rowValues[filterKey];
            } else {
                filterKey = X_Filter;
                fieldValue = X_Filter;
            }

            if (!fieldValue) {
                missingFields.push(filterKey);
                shouldCallApi = false;
            } else {
                xFilter = `<${filterKey}>${fieldValue}</${filterKey}>`;
            }
        }
        if (!shouldCallApi) {
            showValidationMessage(`Missing required fields: ${missingFields.join(', ')}`);
            return;
        }
        const jUi = Object.entries(J_Ui || {}).map(([k, v]) => `"${k}":"${v}"`).join(',');
        const jApi = Object.entries({
            ...(J_Api || {}),
            UserId: (J_Api?.UserId === '<<USERID>>') ? localStorage.getItem('userId') || '' : J_Api?.UserId
        })
            .map(([k, v]) => `"${k}":"${v}"`)
            .join(',');
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
            const result = response?.data?.data?.rs0?.[0]?.Column1;
            if (result) {
                const messageMatch = result.match(/<Message>(.*?)<\/Message>/);
                const flagMatch = result.match(/<Flag>(.*?)<\/Flag>/);
                const message = messageMatch ? messageMatch[1] : 'Validation failed.';
                const flag = flagMatch ? flagMatch[1] : '';

                if (flag !== 'S') {
                    showValidationMessage(message);
                    setLocalData(prev => {
                        const updated = [...prev];
                        updated[rowIndex] = {
                            ...updated[rowIndex],
                            [key]: previousValue
                        };
                        return updated;
                    });
                }
            }
        } catch (error) {
            console.error('Validation API failed:', error);
            showValidationMessage('An error occurred during validation.');
        }
    };

    const generateDsXml = (data: RowData[]) => {
        const itemsXml = data
            .map(item => {
                const itemFields = Object.entries(item)
                    .map(([key, value]) => `<${key.trim()}>${value}</${key.trim()}>`)
                    .join('');
                return `<item>${itemFields}</item>`;
            })
            .join('');
        const userId = localStorage.getItem('userId') || 'ADMIN';
        const userType = localStorage.getItem('userType') || 'Branch';
        return `<dsXml>
                    <J_Ui>"ActionName":"${wPage}","Option":"Edit","RequestFrom":"W"</J_Ui>
                    <Sql/>
                    <X_Filter/>
                    <X_Filter_Multiple></X_Filter_Multiple>
                    <X_Data>
                        <items>
                        ${itemsXml}
                        </items>
                    </X_Data>
                    <J_Api>"UserId":"${userId}","UserType":"${userType}"</J_Api>
                </dsXml>`;
    };


    const handleSave = async () => {
        const xmlData = generateDsXml(localData);
        try {
            const response = await axios.post(
                BASE_URL + PATH_URL,
                xmlData,
                {
                    headers: {
                        'Content-Type': 'application/xml',
                        'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]?.split(';')[0]}`
                    }
                }
            );
            console.log('Save response:', response.data);
        } catch (error) {
            console.error('Error saving data:', error);
        } finally {
            onClose();
        }
    };

    const getEditableColumn = (key: string) => {
        return editableColumns.find((col) => col.wKey === key);
    };

    const fetchDropdownOptions = async (column: EditableColumn) => {
        try {
            setLoadingDropdowns(prev => ({
                ...prev,
                [column.wKey]: true
            }));

            let jUi, jApi;

            if (typeof column.dependsOn?.wQuery?.J_Ui === 'object') {
                const uiObj = column.dependsOn.wQuery.J_Ui;
                jUi = Object.keys(uiObj)
                    .map(key => `"${key}":"${uiObj[key]}"`)
                    .join(',');
            } else {
                jUi = column.dependsOn?.wQuery?.J_Ui || '{}';
            }

            if (typeof column.dependsOn?.wQuery?.J_Api === 'object') {
                const apiObj = column.dependsOn.wQuery.J_Api;
                jApi = Object.keys(apiObj)
                    .map(key => `"${key}":"${apiObj[key]}"`)
                    .join(',');
            } else {
                jApi = column.dependsOn?.wQuery?.J_Api || '{}';
            }

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${column.dependsOn?.wQuery?.Sql || ''}</Sql>
                <X_Filter>${column.dependsOn?.wQuery?.X_Filter || ''}</X_Filter>
                <J_Api>${jApi},"UserType":"${localStorage.getItem('userType')}"</J_Api>
            </dsXml>`;

            console.log('Dropdown request XML:', xmlData);

            const response = await axios.post(
                BASE_URL + PATH_URL,
                xmlData,
                {
                    headers: {
                        'Content-Type': 'application/xml',
                        'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]?.split(';')[0]}`
                    }
                }
            );

            const rs0Data = response.data?.data?.rs0;
            if (!Array.isArray(rs0Data)) {
                console.error('Unexpected data format:', response.data);
                setLoadingDropdowns(prev => ({
                    ...prev,
                    [column.wKey]: false
                }));
                return [];
            }

            const keyField = column.wDropDownKey?.key || 'DisplayName';
            const valueField = column.wDropDownKey?.value || 'Value';

            const options = rs0Data.map(dataItem => ({
                label: dataItem[keyField],
                value: dataItem[valueField]
            }));

            console.log(`Fetched ${options.length} options for ${column.wKey}:`, options);

            setDropdownOptions(prev => ({
                ...prev,
                [column.wKey]: options
            }));

            setLoadingDropdowns(prev => ({
                ...prev,
                [column.wKey]: false
            }));

            return options;
        } catch (error) {
            console.error('Error fetching dropdown options:', error);
            setLoadingDropdowns(prev => ({
                ...prev,
                [column.wKey]: false
            }));
            return [];
        }
    };

    const fetchDependentOptions = async (column: EditableColumn, parentValue: string | Record<string, any>, rowIndex: number) => {
        try {
            if (!column.dependsOn) return [];

            if (
                (typeof parentValue === 'string' && !parentValue) ||
                (typeof parentValue === 'object' && Object.values(parentValue).some(val => !val))
            ) {
                console.error(`Parent value for ${column.wKey} is empty or undefined`, parentValue);
                return [];
            }

            setLoadingDropdowns(prev => ({
                ...prev,
                [`${column.wKey}_${rowIndex}`]: true
            }));

            console.log(`Fetching dependent options for ${column.wKey} based on:`, parentValue);

            let jUi, jApi;

            if (typeof column.dependsOn.wQuery.J_Ui === 'object') {
                const uiObj = column.dependsOn.wQuery.J_Ui;
                jUi = Object.keys(uiObj)
                    .map(key => `"${key}":"${uiObj[key]}"`)
                    .join(',');
            } else {
                jUi = column.dependsOn.wQuery.J_Ui || '{}';
            }

            if (typeof column.dependsOn.wQuery.J_Api === 'object') {
                const apiObj = column.dependsOn.wQuery.J_Api;
                jApi = Object.keys(apiObj)
                    .map(key => `"${key}":"${apiObj[key]}"`)
                    .join(',');
            } else {
                jApi = column.dependsOn.wQuery.J_Api || '{}';
            }

            let xmlFilterContent = '';

            if (Array.isArray(column.dependsOn.field)) {
                if (column.dependsOn.wQuery.X_Filter_Multiple) {
                    xmlFilterContent = column.dependsOn.wQuery.X_Filter_Multiple;

                    column.dependsOn.field.forEach(field => {
                        const value = typeof parentValue === 'object' ? parentValue[field] : '';
                        xmlFilterContent = xmlFilterContent.replace(`\${${field}}`, value);
                    });
                } else {
                    xmlFilterContent = column.dependsOn.wQuery.X_Filter || '';
                    column.dependsOn.field.forEach(field => {
                        const value = typeof parentValue === 'object' ? parentValue[field] : '';
                        xmlFilterContent = xmlFilterContent.replace(`\${${field}}`, value);
                    });
                }
            } else {
                xmlFilterContent = column.dependsOn.wQuery.X_Filter || '';
                xmlFilterContent = xmlFilterContent.replace(
                    `\${${column.dependsOn.field}}`,
                    typeof parentValue === 'string' ? parentValue : ''
                );
            }

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${column.dependsOn.wQuery.Sql || ''}</Sql>
                ${Array.isArray(column.dependsOn.field) && column.dependsOn.wQuery.X_Filter_Multiple
                    ? `<X_Filter_Multiple>${xmlFilterContent}</X_Filter_Multiple><X_Filter></X_Filter>`
                    : `<X_Filter>${xmlFilterContent}</X_Filter>`
                }
                <J_Api>${jApi},"UserType":"${localStorage.getItem('userType')}"</J_Api>
            </dsXml>`;

            console.log('Dependent dropdown request XML:', xmlData);

            const response = await axios.post(
                BASE_URL + PATH_URL,
                xmlData,
                {
                    headers: {
                        'Content-Type': 'application/xml',
                        'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]?.split(';')[0]}`
                    }
                }
            );

            console.log('Dependent dropdown response:', response.data);

            const rs0Data = response.data?.data?.rs0;
            if (!Array.isArray(rs0Data)) {
                console.error('Unexpected data format:', response.data);
                setLoadingDropdowns(prev => ({
                    ...prev,
                    [`${column.wKey}_${rowIndex}`]: false
                }));
                return [];
            }

            const keyField = column.wDropDownKey?.key || 'DisplayName';
            const valueField = column.wDropDownKey?.value || 'Value';

            const options = rs0Data.map(dataItem => ({
                label: dataItem[keyField],
                value: dataItem[valueField]
            }));

            console.log(`Got ${options.length} options for ${column.wKey} at row ${rowIndex}:`, options);

            setDropdownOptions(prev => ({
                ...prev,
                [`${column.wKey}_${rowIndex}`]: options
            }));

            setLoadingDropdowns(prev => ({
                ...prev,
                [`${column.wKey}_${rowIndex}`]: false
            }));

            return options;
        } catch (error) {
            console.error('Error fetching dependent options:', error);
            setLoadingDropdowns(prev => ({
                ...prev,
                [`${column.wKey}_${rowIndex}`]: false
            }));
            return [];
        }
    };

    return (
        <>
            <Dialog open={isOpen} onClose={() => console.log("close")} className="relative z-[100]" >
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="bg-white rounded-lg shadow-xl max-w-5xl w-full p-6 max-h-[80vh] min-h-[70vh] flex flex-col">
                        <DialogTitle className="text-lg font-semibold mb-4">{title}</DialogTitle>
                        {localData.length > 0 ? (
                            <div className="overflow-auto flex-1">
                                <table className="min-w-full table-auto border text-sm">
                                    <thead>
                                        <tr>
                                            {Object.keys(localData[0]).map((key) => (
                                                <th
                                                    key={key}
                                                    className="border px-2 py-2 text-left"
                                                    style={{
                                                        backgroundColor: colors.primary,
                                                        color: colors.text,
                                                        fontFamily: fonts.content,
                                                    }}
                                                >
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {localData.map((row, rowIndex) => (
                                            <tr
                                                key={rowIndex}
                                                style={{
                                                    backgroundColor:
                                                        rowIndex % 2 === 0
                                                            ? colors.evenCardBackground
                                                            : colors.oddCardBackground,
                                                    color: colors.text,
                                                    fontFamily: fonts.content,
                                                }}
                                            >
                                                {Object.entries(row).map(([key, value]) => {
                                                    const editable = getEditableColumn(key);
                                                    const isValueNumeric = isNumeric(value);
                                                    const hasChar = hasCharacterField(key);
                                                    return (
                                                        <td
                                                            key={key}
                                                            className="border px-2 py-2"
                                                            style={{
                                                                textAlign: hasChar ? 'left' : 'right'
                                                            }}
                                                        >
                                                            {editable ? (
                                                                editable.type === "WTextBox" ? (
                                                                    <input
                                                                        type="text"
                                                                        value={value ?? ""}
                                                                        onChange={(e) =>
                                                                            handleInputChange(rowIndex, key, e.target.value)
                                                                        }
                                                                        onFocus={() =>
                                                                            setPreviousValues(prev => ({
                                                                                ...prev,
                                                                                [`${rowIndex}_${key}`]: value
                                                                            }))
                                                                        }
                                                                        onBlur={() => {
                                                                            handleInputBlur(rowIndex, key, previousValues[`${rowIndex}_${key}`]);
                                                                            setPreviousValues(prev => {
                                                                                const updated = { ...prev };
                                                                                delete updated[`${rowIndex}_${key}`];
                                                                                return updated;
                                                                            });
                                                                        }}
                                                                        placeholder={editable.wPlaceholder}
                                                                        className="w-full border border-gray-300 rounded px-2 py-1"
                                                                        style={{
                                                                            fontFamily: fonts.content,
                                                                            color: colors.text,
                                                                            backgroundColor: colors.textInputBackground,
                                                                            borderColor: colors.textInputBorder,
                                                                        }}
                                                                    />
                                                                ) : editable.type === "WDropDownBox" ? (
                                                                    <CustomDropdown
                                                                        item={{ ...editable, isMultiple: false } as any}
                                                                        value={value ?? ""}
                                                                        onChange={(newValue) =>
                                                                            handleInputChange(rowIndex, key, newValue)
                                                                        }
                                                                        options={
                                                                            editable.options
                                                                                ? editable.options.map(opt => ({
                                                                                    label: opt.label,
                                                                                    value: opt.Value,
                                                                                }))
                                                                                : editable.dependsOn
                                                                                    ? dropdownOptions[`${key}_${rowIndex}`] || []
                                                                                    : dropdownOptions[key] || []
                                                                        }
                                                                        isLoading={
                                                                            editable.dependsOn
                                                                                ? loadingDropdowns[`${key}_${rowIndex}`] || false
                                                                                : loadingDropdowns[key] || false
                                                                        }
                                                                        colors={colors}
                                                                        formData={[]}
                                                                        handleFormChange={() => { }}
                                                                        formValues={row}
                                                                    />
                                                                ) : editable.type === "WDateBox" ? (
                                                                    <div
                                                                        style={{
                                                                            fontFamily: fonts.content,
                                                                            color: colors.text,
                                                                            backgroundColor: colors.textInputBackground,
                                                                            borderColor: colors.textInputBorder,
                                                                        }}
                                                                    >
                                                                        <DatePicker
                                                                            selected={value ? new Date(value) : null}
                                                                            onChange={(date: Date | null) =>
                                                                                handleInputChange(rowIndex, key, date)
                                                                            }
                                                                            dateFormat="dd/MM/yyyy"
                                                                            className="w-full border border-gray-300 rounded px-2 py-1"
                                                                        />
                                                                    </div>
                                                                ) : null
                                                            ) : (
                                                                <span style={{ fontFamily: fonts.content }}>{value}</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>

                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-600">No data available.</p>
                        )}

                        <div className="mt-6 flex justify-end gap-4">
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Save
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                                Close
                            </button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>

            {/* Validation Modal */}
            {validationModal.isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-[200]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <div className="bg-white rounded-lg p-6 w-full max-w-[400px] shadow-xl">
                        <h4 className="text-xl font-semibold mb-4">
                            {validationModal.type === 'M' ? 'Confirmation' : 'Message'}
                        </h4>
                        <p className="text-gray-600 mb-6">{validationModal.message}</p>
                        <div className="flex justify-end gap-4">
                            {validationModal.type === 'M' && (
                                <button
                                    onClick={handleValidationClose}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                                >
                                    No
                                </button>
                            )}
                            <button
                                onClick={handleValidationClose}
                                className={`${validationModal.type === 'M'
                                    ? 'bg-blue-500 hover:bg-blue-600'
                                    : 'bg-green-500 hover:bg-green-600'
                                    } text-white px-4 py-2 rounded-md`}
                            >
                                {validationModal.type === 'M' ? 'Yes' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EditTableRowModal;
