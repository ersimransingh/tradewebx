"use client";
import React, { useEffect, useState, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';
import moment from 'moment';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import { useTheme } from '@/context/ThemeContext';
import { FaCalendarAlt } from 'react-icons/fa';

interface FormElement {
    type: string;
    label: string;
    wKey: string | string[];
    options?: Array<{ label: string; value: string, Value: string }>;
    wQuery?: {
        J_Ui: any;
        Sql: string;
        X_Filter: string;
        X_Filter_Multiple?: string;
        J_Api: any;
    };
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
    wValue?: string;
    isMultiple?: boolean;
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
    const [loadingDropdowns, setLoadingDropdowns] = useState<Record<string, boolean>>({});
    const [showDatePresets, setShowDatePresets] = useState<Record<string, boolean>>({});

    const contextMenuItems = [
        { id: "today", text: "Today" },
        { id: "yesterday", text: "Yesterday" },
        { id: "last7days", text: "Last 7 Days" },
        { id: "last30days", text: "Last 30 Days" },
        { id: "thismonth", text: "This Month" },
        { id: "lastmonth", text: "Last Month" },
        { id: "thisfinancialyear", text: "This Financial Year" },
        { id: "lastfinancialyear", text: "Last Financial Year" },
    ];

    const getFinancialYear = (date: moment.Moment) => {
        const financialYearStart = date.month() >= 3 ? date.year() : date.year() - 1;
        return [
            moment(`${financialYearStart}-04-01`),
            moment(`${financialYearStart + 1}-03-31`),
        ];
    };

    const handlePresetSelection = (itemId: string, fromKey: string, toKey: string) => {
        let date1: moment.Moment | null = null;
        let date2: moment.Moment | null = null;

        switch (itemId) {
            case "today":
                date1 = moment().startOf("day");
                date2 = moment().endOf("day");
                break;
            case "yesterday":
                date1 = moment().subtract(1, "day").startOf("day");
                date2 = moment().subtract(1, "day").endOf("day");
                break;
            case "last7days":
                date1 = moment().subtract(6, "days").startOf("day");
                date2 = moment().endOf("day");
                break;
            case "last30days":
                date1 = moment().subtract(29, "days").startOf("day");
                date2 = moment().endOf("day");
                break;
            case "thismonth":
                date1 = moment().startOf("month");
                date2 = moment().endOf("month");
                break;
            case "lastmonth":
                date1 = moment().subtract(1, "month").startOf("month");
                date2 = moment().subtract(1, "month").endOf("month");
                break;
            case "thisfinancialyear":
                [date1, date2] = getFinancialYear(moment());
                break;
            case "lastfinancialyear":
                [date1, date2] = getFinancialYear(moment().subtract(1, "year"));
                break;
        }

        if (date1 && date2) {
            const newValues = { ...formValues };
            newValues[fromKey] = date1.toDate();
            newValues[toKey] = date2.toDate();
            handleFormChange(newValues);
        }

        setShowDatePresets(prev => ({
            ...prev,
            [fromKey]: false
        }));
    };

    useEffect(() => {
        setFormValues(initialValues);
    }, [initialValues]);

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
            } else if (item.type === 'WDateBox' && item.wValue && !formValues[item.wKey as string]) {
                const defaultValues = { ...formValues };
                // Convert YYYYMMDD format to Date object
                const year = parseInt(item.wValue.substring(0, 4));
                const month = parseInt(item.wValue.substring(4, 6)) - 1; // Month is 0-based
                const day = parseInt(item.wValue.substring(6, 8));
                defaultValues[item.wKey as string] = new Date(year, month, day);
                setFormValues(defaultValues);
            }
        });
    }, [formData, formValues]);

    useEffect(() => {
        // Reset everything when initialValues changes
        setFormValues(initialValues);

        // Reset all dropdown options
        setDropdownOptions({});

        // Reset loading states
        setLoadingDropdowns({});

        // Re-fetch dropdown options if needed
        if (formData) {
            formData.flat().forEach(item => {
                if (item.type === 'WDropDownBox' && !item.options && item.wQuery) {
                    fetchDropdownOptions(item);
                }
            });
        }
    }, [initialValues, formData]);

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
        const newValues = { ...formValues };

        // Find if this key belongs to a WDateRangeBox
        const dateRangeField = formData.flat().find(item =>
            item.type === 'WDateRangeBox' &&
            Array.isArray(item.wKey) &&
            item.wKey.includes(key)
        );

        if (dateRangeField) {
            // This is part of a date range
            const [fromKey, toKey] = dateRangeField.wKey as string[];
            if (key === fromKey) {
                newValues[fromKey] = value;
                // If from date is after to date, update to date
                if (value && formValues[toKey] && value > formValues[toKey]) {
                    newValues[toKey] = value;
                }
            } else if (key === toKey) {
                newValues[toKey] = value;
                // If to date is before from date, update from date
                if (value && formValues[fromKey] && value < formValues[fromKey]) {
                    newValues[fromKey] = value;
                }
            }
        } else {
            // Regular field update
            newValues[key] = value;
        }

        // Find dependent fields that need to be updated
        const dependentFields = formData.flat().filter(dependentItem => {
            if (!dependentItem.dependsOn) return false;

            return Array.isArray(dependentItem.dependsOn.field)
                ? dependentItem.dependsOn.field.includes(key)
                : dependentItem.dependsOn.field === key;
        });

        if (dependentFields.length > 0) {
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
                            } else if (fieldElement?.type === 'WDateRangeBox' && Array.isArray(fieldElement.wKey)) {
                                const [fromKey, toKey] = fieldElement.wKey;
                                if (field === fromKey || field === toKey) {
                                    acc[field] = moment(newValues[field]).format('YYYYMMDD');
                                }
                            } else {
                                acc[field] = newValues[field];
                            }
                            return acc;
                        }, {} as Record<string, any>);

                        fetchDependentOptions(dependentItem, dependencyValues);
                    }
                } else {
                    const fieldElement = formData.flat().find(el => el.wKey === dependentItem.dependsOn!.field);
                    if (fieldElement?.type === 'WDateBox' && newValues[dependentItem.dependsOn!.field]) {
                        const formattedDate = moment(newValues[dependentItem.dependsOn!.field]).format('YYYYMMDD');
                        fetchDependentOptions(dependentItem, formattedDate);
                    } else if (fieldElement?.type === 'WDateRangeBox' && Array.isArray(fieldElement.wKey)) {
                        const [fromKey, toKey] = fieldElement.wKey;
                        const field = dependentItem.dependsOn!.field;
                        if (field === fromKey || field === toKey) {
                            const formattedDate = moment(newValues[field]).format('YYYYMMDD');
                            fetchDependentOptions(dependentItem, formattedDate);
                        } else {
                            fetchDependentOptions(dependentItem, newValues[field]);
                        }
                    } else {
                        fetchDependentOptions(dependentItem, newValues[dependentItem.dependsOn!.field]);
                    }
                }
            });
        }

        handleFormChange(newValues);
    };

    const fetchDropdownOptions = async (item: FormElement) => {
        try {
            setLoadingDropdowns(prev => ({
                ...prev,
                [item.wKey as string]: true
            }));

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
                setLoadingDropdowns(prev => ({
                    ...prev,
                    [item.wKey as string]: false
                }));
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

            setLoadingDropdowns(prev => ({
                ...prev,
                [item.wKey as string]: false
            }));

            return options;
        } catch (error) {
            console.error('Error fetching dropdown options:', error);
            setLoadingDropdowns(prev => ({
                ...prev,
                [item.wKey as string]: false
            }));
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

            setLoadingDropdowns(prev => ({
                ...prev,
                [item.wKey as string]: true
            }));

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

            let xmlFilterContent = '';

            if (Array.isArray(item.dependsOn.field)) {
                if (item.dependsOn.wQuery.X_Filter_Multiple) {
                    xmlFilterContent = item.dependsOn.wQuery.X_Filter_Multiple;

                    item.dependsOn.field.forEach(field => {
                        console.log('field_multiple', field);
                        const value = typeof parentValue === 'object' ? parentValue[field] : '';
                        const fieldElement = formData.flat().find(el => el.wKey === field);
                        console.log('fieldElement', fieldElement);
                        // Format date values for both WDateBox and WDateRangeBox
                        let formattedValue = value instanceof Date ? moment(value).format('YYYYMMDD') : value;
                        if (fieldElement?.type === 'WDateBox' && value instanceof Date) {
                            console.log('formattedValue_CHK1', formattedValue);
                        } else if (fieldElement?.type === 'WDateRangeBox' && Array.isArray(fieldElement.wKey)) {
                            const [fromKey, toKey] = fieldElement.wKey;
                            if (field === fromKey || field === toKey) {
                                console.log('formattedValue_CHK2', formattedValue);
                            }
                        } else if (fieldElement?.type === 'WDropDownBox' && fieldElement.isMultiple) {
                            // For multiple select dropdowns, ensure we're working with an array
                            const values = Array.isArray(value) ? value : [value];
                            // Join with pipe and ensure no extra spaces
                            formattedValue = values.filter(Boolean).join('|');
                            console.log('Multiple select formatted value:', formattedValue);
                        }
                        xmlFilterContent = xmlFilterContent.replace(`\${${field}}`, formattedValue);
                    });
                } else {
                    xmlFilterContent = item.dependsOn.wQuery.X_Filter || '';
                    item.dependsOn.field.forEach(field => {
                        console.log('field', field);
                        const value = typeof parentValue === 'object' ? parentValue[field] : '';
                        const fieldElement = formData.flat().find(el => el.wKey === field);

                        // Format date values for both WDateBox and WDateRangeBox
                        let formattedValue = value;
                        if (fieldElement?.type === 'WDateBox' && value instanceof Date) {
                            formattedValue = moment(value).format('YYYYMMDD');
                        } else if (fieldElement?.type === 'WDateRangeBox' && Array.isArray(fieldElement.wKey)) {
                            const [fromKey, toKey] = fieldElement.wKey;
                            if (field === fromKey || field === toKey) {
                                formattedValue = moment(value).format('YYYYMMDD');
                            }
                        }
                        console.log('formattedValue_single', formattedValue);
                        xmlFilterContent = xmlFilterContent.replace(`\${${field}}`, formattedValue);
                    });
                }
            } else {
                const fieldElement = formData.flat().find(el => el.wKey === item.dependsOn.field);
                if (fieldElement?.type === 'WDateBox' && parentValue instanceof Date) {
                    xmlFilterContent = moment(parentValue).format('YYYYMMDD');
                } else if (fieldElement?.type === 'WDateRangeBox' && Array.isArray(fieldElement.wKey)) {
                    const [fromKey, toKey] = fieldElement.wKey;
                    if (item.dependsOn.field === fromKey || item.dependsOn.field === toKey) {
                        xmlFilterContent = moment(parentValue).format('YYYYMMDD');
                    } else {
                        xmlFilterContent = typeof parentValue === 'string' ? parentValue : '';
                    }
                } else {
                    xmlFilterContent = typeof parentValue === 'string' ? parentValue : '';
                }
            }

            // Format dates in X_Filter_Multiple
            if (item.dependsOn.wQuery.X_Filter_Multiple) {
                const formattedXmlFilter = xmlFilterContent.replace(/<([^>]+)>([^<]+)<\/\1>/g, (match, tag, value) => {
                    const fieldElement = formData.flat().find(el => el.wKey === tag);
                    if (fieldElement?.type === 'WDateBox' ||
                        (fieldElement?.type === 'WDateRangeBox' && Array.isArray(fieldElement.wKey) &&
                            (fieldElement.wKey.includes(tag)))) {
                        try {
                            const date = new Date(value);
                            if (!isNaN(date.getTime())) {
                                return `<${tag}>${moment(date).format('YYYYMMDD')}</${tag}>`;
                            }
                        } catch (e) {
                            console.error('Error parsing date:', e);
                        }
                    }
                    return match;
                });
                xmlFilterContent = formattedXmlFilter;
            }

            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${item.dependsOn.wQuery.Sql || ''}</Sql>
                ${Array.isArray(item.dependsOn.field) && item.dependsOn.wQuery.X_Filter_Multiple
                    ? `<X_Filter_Multiple>${xmlFilterContent}</X_Filter_Multiple><X_Filter></X_Filter>`
                    : `<X_Filter>${xmlFilterContent}</X_Filter>`
                }
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
                setLoadingDropdowns(prev => ({
                    ...prev,
                    [item.wKey as string]: false
                }));
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

            setLoadingDropdowns(prev => ({
                ...prev,
                [item.wKey as string]: false
            }));

            return options;
        } catch (error) {
            console.error('Error fetching dependent options:', error);
            setLoadingDropdowns(prev => ({
                ...prev,
                [item.wKey as string]: false
            }));
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
                    <div className="relative">
                        <button
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                            onClick={() => setShowDatePresets(prev => ({
                                ...prev,
                                [fromKey]: !prev[fromKey]
                            }))}
                        >
                            <FaCalendarAlt />
                        </button>
                        {showDatePresets[fromKey] && (
                            <div
                                className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                                style={{ backgroundColor: colors.textInputBackground }}
                            >
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                    {contextMenuItems.map((item) => (
                                        <button
                                            key={item.id}
                                            className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-100"
                                            style={{
                                                color: colors.textInputText
                                            }}
                                            onClick={() => handlePresetSelection(item.id, fromKey, toKey)}
                                        >
                                            {item.text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
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

        const selectedOption = item.isMultiple
            ? options.filter(opt =>
                Array.isArray(formValues[item.wKey as string])
                    ? formValues[item.wKey as string].includes(String(opt.value))
                    : false
            )
            : options.find(opt =>
                String(opt.value) === String(formValues[item.wKey as string])
            );

        const isLoading = loadingDropdowns[item.wKey as string];

        return (
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    {item.label}
                    {isLoading && <span className="ml-2 inline-block animate-pulse">Loading...</span>}
                </label>
                <Select
                    options={options}
                    value={selectedOption}
                    isMulti={item.isMultiple}
                    closeMenuOnSelect={!item.isMultiple}
                    blurInputOnSelect={!item.isMultiple}
                    onChange={(selected) => {
                        const newValues = { ...formValues };

                        if (selected) {
                            if (item.isMultiple) {
                                // Ensure we're working with an array of values
                                const selectedValues = Array.isArray(selected)
                                    ? selected.map(opt => opt.value)
                                    : [selected.value];
                                newValues[item.wKey as string] = selectedValues;
                            } else {
                                newValues[item.wKey as string] = selected.value;
                            }

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
                                                    } else if (fieldElement?.type === 'WDropDownBox' && fieldElement.isMultiple) {
                                                        const values = Array.isArray(newValues[field]) ? newValues[field] : [newValues[field]];
                                                        acc[field] = values.filter(Boolean).join('|');
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
                                            } else if (fieldElement?.type === 'WDropDownBox' && fieldElement.isMultiple) {
                                                const values = Array.isArray(selected)
                                                    ? selected.map(opt => opt.value)
                                                    : [selected.value];
                                                const formattedValue = values.filter(Boolean).join('|');
                                                fetchDependentOptions(dependentItem, formattedValue);
                                            } else {
                                                fetchDependentOptions(dependentItem, selected.value);
                                            }
                                        }
                                    }
                                }
                            });
                        } else {
                            newValues[item.wKey as string] = item.isMultiple ? [] : undefined;

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
                    isDisabled={isLoading}
                    placeholder={isLoading ? "Loading options..." : "Select..."}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                        control: (base) => ({
                            ...base,
                            borderColor: colors.textInputBorder,
                            backgroundColor: colors.textInputBackground,
                            boxShadow: isLoading ? `0 0 0 1px ${colors.primary}` : base.boxShadow,
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
                        multiValue: (base) => ({
                            ...base,
                            backgroundColor: colors.primary,
                        }),
                        multiValueLabel: (base) => ({
                            ...base,
                            color: colors.buttonText,
                        }),
                        multiValueRemove: (base) => ({
                            ...base,
                            color: colors.buttonText,
                            ':hover': {
                                backgroundColor: colors.primary,
                                color: colors.buttonText,
                            },
                        }),
                    }}
                />
                {isLoading && (
                    <div className="mt-1 text-xs text-right" style={{ color: colors.primary }}>
                        Fetching options...
                    </div>
                )}
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