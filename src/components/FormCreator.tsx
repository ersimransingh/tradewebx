"use client";
import React, { useEffect, useState, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';
import moment from 'moment';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import { useTheme } from '@/context/ThemeContext';

interface FormElement {
    type: string;
    label: string;
    wKey: string | string[];
    options?: Array<{ label: string; value: string, Value: string }>;
    wQuery?: {
        J_Ui: any;
        Sql: string;
        X_Filter: string;
        J_Api: any;
    };
    dependsOn?: {
        field: string;
        wQuery: {
            J_Ui: any;
            Sql: string;
            X_Filter: string;
            J_Api: any;
        };
    };
    wDropDownKey?: {
        key: string;
        value: string;
    };
}

interface FormCreatorProps {
    formData: FormElement[][];
    onFilterChange: (values: any) => void;
    initialValues?: Record<string, any>;
}

const FormCreator: React.FC<FormCreatorProps> = ({
    formData,
    onFilterChange,
    initialValues = {}
}) => {
    const { colors } = useTheme();
    const [formValues, setFormValues] = useState(initialValues);
    const [dropdownOptions, setDropdownOptions] = useState<Record<string, any[]>>({});

    useEffect(() => {
        setFormValues(initialValues);
    }, [initialValues]);

    const handleFormChange = useCallback((newValues: any) => {
        const cleanedValues = Object.fromEntries(
            Object.entries(newValues).filter(([_, value]) =>
                value !== undefined && value !== null
            )
        );

        setFormValues(cleanedValues);
        onFilterChange(cleanedValues);
    }, [onFilterChange]);

    const handleInputChange = (key: string, value: any) => {
        const newValues = {
            ...formValues,
            [key]: value
        };
        handleFormChange(newValues);
    };

    useEffect(() => {
        formData?.[0]?.forEach(item => {
            if (item.type === 'WDateRangeBox') {
                const [fromKey, toKey] = item.wKey as string[];
                if (!formValues[fromKey] && !formValues[toKey]) {
                    const defaultValues = { ...formValues };
                    defaultValues[fromKey] = moment().subtract(3, 'months').toDate();
                    defaultValues[toKey] = moment().toDate();
                    setFormValues(defaultValues);
                }
            }
        });
    }, [formData, formValues]);

    const fetchDropdownOptions = async (item: FormElement) => {
        try {
            let jUi, jApi;

            if (typeof item.wQuery?.J_Ui === 'object') {
                const uiObj = item.wQuery.J_Ui;
                jUi = Object.keys(uiObj)
                    .map(key => `"${key}":"${uiObj[key]}"`)
                    .join(',');
            } else {
                jUi = item.wQuery?.J_Ui;
            }

            if (typeof item.wQuery?.J_Api === 'object') {
                const apiObj = item.wQuery.J_Api;
                jApi = Object.keys(apiObj)
                    .map(key => `"${key}":"${apiObj[key]}"`)
                    .join(',');
            } else {
                jApi = item.wQuery?.J_Api;
            }

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${item.wQuery?.Sql || ''}</Sql>
                <X_Filter>${item.wQuery?.X_Filter || ''}</X_Filter>
                <J_Api>${jApi}</J_Api>
            </dsXml>`;

            console.log('Dropdown request XML:', xmlData);

            const response = await axios.post(
                BASE_URL + PATH_URL,
                xmlData,
                {
                    headers: {
                        'Content-Type': 'application/xml',
                        'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                    }
                }
            );

            const rs0Data = response.data?.data?.rs0;
            if (!Array.isArray(rs0Data)) {
                console.error('Unexpected data format:', response.data);
                return [];
            }

            const keyField = item.wDropDownKey?.key || 'DisplayName';
            const valueField = item.wDropDownKey?.value || 'Value';

            const options = rs0Data.map(dataItem => ({
                label: dataItem[keyField],
                value: dataItem[valueField]
            }));

            console.log(`Fetched ${options.length} options for ${item.wKey}:`, options);

            setDropdownOptions(prev => ({
                ...prev,
                [item.wKey as string]: options
            }));

            return options;
        } catch (error) {
            console.error('Error fetching dropdown options:', error);
            return [];
        }
    };

    const fetchDependentOptions = async (item: FormElement, parentValue: string | Record<string, any>) => {
        try {
            if (!item.dependsOn) return [];

            if (
                (typeof parentValue === 'string' && !parentValue) ||
                (typeof parentValue === 'object' && Object.values(parentValue).some(val => !val))
            ) {
                console.error(`Parent value for ${item.wKey} is empty or undefined`, parentValue);
                return [];
            }

            console.log(`Fetching dependent options for ${item.wKey} based on:`, parentValue);

            let jUi, jApi;

            if (typeof item.dependsOn.wQuery.J_Ui === 'object') {
                const uiObj = item.dependsOn.wQuery.J_Ui;
                jUi = Object.keys(uiObj)
                    .map(key => `"${key}":"${uiObj[key]}"`)
                    .join(',');
            } else {
                jUi = item.dependsOn.wQuery.J_Ui;
            }

            if (typeof item.dependsOn.wQuery.J_Api === 'object') {
                const apiObj = item.dependsOn.wQuery.J_Api;
                jApi = Object.keys(apiObj)
                    .map(key => `"${key}":"${apiObj[key]}"`)
                    .join(',');
            } else {
                jApi = item.dependsOn.wQuery.J_Api;
            }

            let xFilter = item.dependsOn.wQuery.X_Filter || '';

            if (Array.isArray(item.dependsOn.field)) {
                item.dependsOn.field.forEach(field => {
                    const value = typeof parentValue === 'object' ? parentValue[field] : '';
                    xFilter = xFilter.replace(`\${${field}}`, value);
                });
            } else {
                xFilter = typeof parentValue === 'string' ? parentValue : '';
            }

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${item.dependsOn.wQuery.Sql || ''}</Sql>
                <X_Filter>${xFilter}</X_Filter>
                <J_Api>${jApi}</J_Api>
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
                return [];
            }

            const keyField = item.wDropDownKey?.key || 'DisplayName';
            const valueField = item.wDropDownKey?.value || 'Value';

            const options = rs0Data.map(dataItem => ({
                label: dataItem[keyField],
                value: dataItem[valueField]
            }));

            console.log(`Got ${options.length} options for ${item.wKey}:`, options);

            setDropdownOptions(prev => ({
                ...prev,
                [item.wKey as string]: options
            }));

            return options;
        } catch (error) {
            console.error('Error fetching dependent options:', error);
            return [];
        }
    };

    useEffect(() => {
        formData?.flat().forEach(item => {
            if (item.dependsOn) {
                if (Array.isArray(item.dependsOn.field)) {
                    const allDependenciesFilled = item.dependsOn.field.every(field =>
                        formValues[field] !== undefined && formValues[field] !== null
                    );

                    if (allDependenciesFilled) {
                        const dependencyValues = item.dependsOn.field.reduce((acc, field) => {
                            const fieldElement = formData.flat().find(el => el.wKey === field);

                            if (fieldElement?.type === 'WDateBox' && formValues[field]) {
                                acc[field] = moment(formValues[field]).format('YYYYMMDD');
                            } else {
                                acc[field] = formValues[field];
                            }
                            return acc;
                        }, {} as Record<string, any>);

                        fetchDependentOptions(item, dependencyValues);
                    }
                } else if (formValues[item.dependsOn.field]) {
                    const fieldElement = formData.flat().find(el => el.wKey === item.dependsOn.field);

                    if (fieldElement?.type === 'WDateBox') {
                        const formattedDate = moment(formValues[item.dependsOn.field]).format('YYYYMMDD');
                        fetchDependentOptions(item, formattedDate);
                    } else {
                        fetchDependentOptions(item, formValues[item.dependsOn.field]);
                    }
                }
            }
        });
    }, [formData, formValues]);

    const renderDateRangeBox = (item: FormElement) => {
        const [fromKey, toKey] = item.wKey as string[];

        return (
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    {item.label}
                </label>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <DatePicker
                            selected={formValues[fromKey]}
                            onChange={(date: Date) => handleInputChange(fromKey, date)}
                            dateFormat="dd/MM/yyyy"
                            className="w-full px-3 py-2 border rounded-md"
                            wrapperClassName="w-full"
                            placeholderText="From Date"
                        />
                    </div>
                    <div className="flex-1">
                        <DatePicker
                            selected={formValues[toKey]}
                            onChange={(date: Date) => handleInputChange(toKey, date)}
                            dateFormat="dd/MM/yyyy"
                            className="w-full px-3 py-2 border rounded-md"
                            wrapperClassName="w-full"
                            placeholderText="To Date"
                        />
                    </div>
                </div>
            </div>
        );
    };

    const renderTextBox = (item: FormElement) => {
        return (
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    {item.label}
                </label>
                <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-md"
                    style={{
                        borderColor: colors.textInputBorder,
                        backgroundColor: colors.textInputBackground,
                        color: colors.textInputText
                    }}
                    value={formValues[item.wKey as string] || ''}
                    onChange={(e) => handleInputChange(item.wKey as string, e.target.value)}
                    placeholder={item.label}
                />
            </div>
        );
    };

    const renderDateBox = (item: FormElement) => {
        return (
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    {item.label}
                </label>
                <DatePicker
                    selected={formValues[item.wKey as string]}
                    onChange={(date: Date) => {
                        handleInputChange(item.wKey as string, date);

                        const dependentFields = formData.flat().filter(dependentItem => {
                            if (!dependentItem.dependsOn) return false;

                            return Array.isArray(dependentItem.dependsOn.field)
                                ? dependentItem.dependsOn.field.includes(item.wKey as string)
                                : dependentItem.dependsOn.field === item.wKey;
                        });

                        if (dependentFields.length > 0) {
                            const newValues = { ...formValues, [item.wKey as string]: date };

                            dependentFields.forEach(dependentItem => {
                                newValues[dependentItem.wKey as string] = undefined;

                                if (Array.isArray(dependentItem.dependsOn!.field)) {
                                    const allDependenciesFilled = dependentItem.dependsOn!.field.every(field =>
                                        newValues[field] !== undefined && newValues[field] !== null
                                    );

                                    if (allDependenciesFilled) {
                                        const dependencyValues = dependentItem.dependsOn!.field.reduce((acc, field) => {
                                            const fieldElement = formData.flat().find(el => el.wKey === field);

                                            if (fieldElement?.type === 'WDateBox' && newValues[field]) {
                                                acc[field] = moment(newValues[field]).format('YYYYMMDD');
                                            } else {
                                                acc[field] = newValues[field];
                                            }
                                            return acc;
                                        }, {} as Record<string, any>);

                                        fetchDependentOptions(dependentItem, dependencyValues);
                                    }
                                } else {
                                    const formattedDate = moment(date).format('YYYYMMDD');
                                    fetchDependentOptions(dependentItem, formattedDate);
                                }
                            });

                            handleFormChange(newValues);
                        }
                    }}
                    dateFormat="dd/MM/yyyy"
                    className="w-full px-3 py-2 border rounded-md"
                    wrapperClassName="w-full"
                    placeholderText="Select Date"
                />
            </div>
        );
    };

    const renderDropDownBox = (item: FormElement) => {
        const options = item.options
            ? item.options.map(opt => ({
                label: opt.label,
                value: opt.Value || opt.value
            }))
            : dropdownOptions[item.wKey as string] || [];

        const selectedOption = options.find(opt =>
            String(opt.value) === String(formValues[item.wKey as string])
        );

        return (
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    {item.label}
                </label>
                <Select
                    options={options}
                    value={selectedOption}
                    onChange={(selected) => {
                        const newValues = { ...formValues };

                        if (selected) {
                            newValues[item.wKey as string] = selected.value;

                            formData.flat().forEach(dependentItem => {
                                if (dependentItem.dependsOn) {
                                    const dependsOnField = dependentItem.dependsOn.field;
                                    const isDependent = Array.isArray(dependsOnField)
                                        ? dependsOnField.includes(item.wKey as string)
                                        : dependsOnField === item.wKey;

                                    if (isDependent) {
                                        newValues[dependentItem.wKey as string] = undefined;

                                        if (Array.isArray(dependsOnField)) {
                                            const allDependenciesFilled = dependsOnField.every(field =>
                                                newValues[field] !== undefined && newValues[field] !== null
                                            );

                                            if (allDependenciesFilled) {
                                                const dependencyValues = dependsOnField.reduce((acc, field) => {
                                                    const fieldElement = formData.flat().find(el => el.wKey === field);

                                                    if (fieldElement?.type === 'WDateBox' && newValues[field]) {
                                                        acc[field] = moment(newValues[field]).format('YYYYMMDD');
                                                    } else {
                                                        acc[field] = newValues[field];
                                                    }
                                                    return acc;
                                                }, {} as Record<string, any>);

                                                fetchDependentOptions(dependentItem, dependencyValues);
                                            }
                                        } else {
                                            const fieldElement = formData.flat().find(
                                                el => el.wKey === dependentItem.dependsOn!.field
                                            );

                                            if (fieldElement?.type === 'WDateBox') {
                                                const formattedDate = moment(selected.value).format('YYYYMMDD');
                                                fetchDependentOptions(dependentItem, formattedDate);
                                            } else {
                                                fetchDependentOptions(dependentItem, selected.value);
                                            }
                                        }
                                    }
                                }
                            });
                        } else {
                            newValues[item.wKey as string] = undefined;

                            formData.flat().forEach(dependentItem => {
                                if (dependentItem.dependsOn) {
                                    const dependsOnField = dependentItem.dependsOn.field;
                                    const isDependent = Array.isArray(dependsOnField)
                                        ? dependsOnField.includes(item.wKey as string)
                                        : dependsOnField === item.wKey;

                                    if (isDependent) {
                                        newValues[dependentItem.wKey as string] = undefined;
                                    }
                                }
                            });
                        }

                        handleFormChange(newValues);
                    }}
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
    };

    const renderCheckBox = (item: FormElement) => {
        return (
            <div className="mb-4 flex items-center">
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={formValues[item.wKey as string] || false}
                    onChange={(e) => handleInputChange(item.wKey as string, e.target.checked)}
                    style={{
                        accentColor: colors.primary
                    }}
                />
                <label className="ml-2 text-sm font-medium" style={{ color: colors.text }}>
                    {item.label}
                </label>
            </div>
        );
    };

    const renderFormElement = (item: FormElement) => {
        switch (item.type) {
            case 'WDateRangeBox':
                return renderDateRangeBox(item);
            case 'WTextBox':
                return renderTextBox(item);
            case 'WDateBox':
                return renderDateBox(item);
            case 'WDropDownBox':
                return renderDropDownBox(item);
            case 'WCheckBox':
                return renderCheckBox(item);
            default:
                return null;
        }
    };

    useEffect(() => {
        console.log('Current form values:', formValues);
    }, [formValues]);

    useEffect(() => {
        formData?.flat().forEach(item => {
            if (item.type === 'WDropDownBox' && !item.options && item.wQuery) {
                fetchDropdownOptions(item);
            }
        });
    }, [formData]);

    return (
        <div className="p-4" style={{ backgroundColor: colors.filtersBackground }}>
            {formData?.map((filterGroup, groupIndex) => (
                <div key={groupIndex} className="mb-4">
                    {filterGroup.map((item, itemIndex) => (
                        <div key={`${groupIndex}-${itemIndex}`}>
                            {renderFormElement(item)}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default FormCreator; 