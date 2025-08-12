"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';
import moment from 'moment';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import { useTheme } from '@/context/ThemeContext';
import { FaCalendarAlt } from 'react-icons/fa';
import CustomDropdown from './form/CustomDropdown';
import apiService from '@/utils/apiService';

export interface FormElement {
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
    Srno?: number;
}

interface FormCreatorProps {
    formData: FormElement[][];
    onFilterChange: (values: any) => void;
    initialValues?: Record<string, any>;
    isHorizontal?: boolean;
}

// Global cache for dropdown options to prevent redundant API calls
const dropdownCache = new Map<string, {
    options: any[];
    timestamp: number;
    expiry: number; // 5 minutes
}>();

// Helper functions for cache management
const generateCacheKey = (item: FormElement, parentValue?: string | Record<string, any>) => {
    if (parentValue) {
        // For dependent dropdowns
        const parentStr = typeof parentValue === 'object'
            ? JSON.stringify(parentValue)
            : parentValue;
        return `${item.wKey}_${btoa(parentStr)}_${JSON.stringify(item.dependsOn)}`;
    }
    // For regular dropdowns
    return `${item.wKey}_${JSON.stringify(item.wQuery)}`;
};

const getCachedOptions = (cacheKey: string) => {
    const cached = dropdownCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.expiry) {
        return cached.options;
    }
    // Remove expired cache
    if (cached) {
        dropdownCache.delete(cacheKey);
    }
    return null;
};

const setCachedOptions = (cacheKey: string, options: any[]) => {
    dropdownCache.set(cacheKey, {
        options,
        timestamp: Date.now(),
        expiry: 5 * 60 * 1000 // 5 minutes
    });

    // Cleanup old cache entries if map gets too large
    if (dropdownCache.size > 50) {
        const now = Date.now();
        for (const [key, value] of dropdownCache.entries()) {
            if (now - value.timestamp > value.expiry) {
                dropdownCache.delete(key);
            }
        }
    }
};

const FormCreator: React.FC<FormCreatorProps> = ({
    formData,
    onFilterChange,
    initialValues = {},
    isHorizontal = false
}) => {
    const { colors } = useTheme();
    const [formValues, setFormValues] = useState(initialValues);
    const [dropdownOptions, setDropdownOptions] = useState<Record<string, any[]>>({});
    const [loadingDropdowns, setLoadingDropdowns] = useState<Record<string, boolean>>({});
    const [showDatePresets, setShowDatePresets] = useState<Record<string, boolean>>({});

    // Sort filters by Srno
    const sortedFormData = useMemo(() => {
        if (!formData) return [];
        return formData.map(filterGroup => {
            return [...filterGroup].sort((a, b) => {
                const srnoA = a.Srno || 0;
                const srnoB = b.Srno || 0;
                return srnoA - srnoB;
            });
        });
    }, [formData]);

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
        sortedFormData?.flat().forEach(item => {
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
    }, [sortedFormData, formValues]);

    useEffect(() => {
        // Reset everything when initialValues changes
        setFormValues(initialValues);

        // Reset loading states
        setLoadingDropdowns({});

        // Load dropdown options (check cache first)
        if (sortedFormData) {
            const currentDropdownOptions: Record<string, any[]> = {};

            sortedFormData.flat().forEach(item => {
                if (item.type === 'WDropDownBox' && !item.options && item.wQuery) {
                    const cacheKey = generateCacheKey(item);
                    const cachedOptions = getCachedOptions(cacheKey);

                    if (cachedOptions) {
                        // Use cached options
                        currentDropdownOptions[item.wKey as string] = cachedOptions;
                    } else {
                        // Fetch fresh options
                        fetchDropdownOptions(item);
                    }
                }
            });

            // Set cached options immediately
            setDropdownOptions(currentDropdownOptions);
        }
    }, [initialValues, sortedFormData]);

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
        const dateRangeField = sortedFormData.flat().find(item =>
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
        const dependentFields = sortedFormData.flat().filter(dependentItem => {
            if (!dependentItem.dependsOn) return false;

            return Array.isArray(dependentItem.dependsOn.field)
                ? dependentItem.dependsOn.field.includes(key)
                : dependentItem.dependsOn.field === key;
        });

        if (dependentFields.length > 0) {
            // Clear all dependent fields and their dependent fields recursively
            const clearDependentFields = (fields: FormElement[]) => {
                if (fields.length === 0) return;

                fields.forEach(dependentItem => {
                    // Clear the dependent field value
                    newValues[dependentItem.wKey as string] = undefined;

                    // Also clear dropdown options for dependent fields to ensure they're hidden
                    if (dependentItem.type === 'WDropDownBox') {
                        setDropdownOptions(prev => ({
                            ...prev,
                            [dependentItem.wKey as string]: []
                        }));
                    }

                    // Find fields that depend on this field
                    const nestedDependentFields = sortedFormData.flat().filter(nestedItem => {
                        if (!nestedItem.dependsOn) return false;

                        return Array.isArray(nestedItem.dependsOn.field)
                            ? nestedItem.dependsOn.field.includes(dependentItem.wKey as string)
                            : nestedItem.dependsOn.field === dependentItem.wKey;
                    });

                    // Recursively clear nested dependent fields
                    if (nestedDependentFields.length > 0) {
                        clearDependentFields(nestedDependentFields);
                    }
                });
            };

            // Start the recursive clearing process
            clearDependentFields(dependentFields);

            // Now fetch new options for the direct dependents
            dependentFields.forEach(dependentItem => {
                if (Array.isArray(dependentItem.dependsOn!.field)) {
                    const allDependenciesFilled = dependentItem.dependsOn!.field.every(field =>
                        newValues[field] !== undefined && newValues[field] !== null
                    );

                    if (allDependenciesFilled) {
                        const dependencyValues = dependentItem.dependsOn!.field.reduce((acc, field) => {
                            const fieldElement = sortedFormData.flat().find(el => el.wKey === field);

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
                    const fieldElement = sortedFormData.flat().find(el => el.wKey === dependentItem.dependsOn!.field);
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
            // Generate cache key
            const cacheKey = generateCacheKey(item);

            // Check cache first
            const cachedOptions = getCachedOptions(cacheKey);
            if (cachedOptions) {
                console.log('Using cached dropdown options for:', item.wKey);
                setDropdownOptions(prev => ({
                    ...prev,
                    [item.wKey as string]: cachedOptions
                }));
                return cachedOptions;
            }

            setLoadingDropdowns(prev => ({
                ...prev,
                [item.wKey as string]: true
            }));

            console.log('Fetching fresh dropdown options for:', item.wKey);
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
                <J_Api>${jApi},"UserType":"${localStorage.getItem('userType')}"</J_Api>
            </dsXml>`;

            // console.log('Dropdown request XML:', xmlData);

            const response = await apiService.postWithAuth(
                BASE_URL + PATH_URL,
                xmlData,
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

            // Cache the options
            setCachedOptions(cacheKey, options);

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

                // Clear dropdown options when parent value is invalid
                setDropdownOptions(prev => ({
                    ...prev,
                    [item.wKey as string]: []
                }));

                setLoadingDropdowns(prev => ({
                    ...prev,
                    [item.wKey as string]: false
                }));

                return [];
            }

            // Generate cache key for dependent dropdown
            const cacheKey = generateCacheKey(item, parentValue);

            // Check cache first
            const cachedOptions = getCachedOptions(cacheKey);
            if (cachedOptions) {
                console.log('Using cached dependent options for:', item.wKey);
                setDropdownOptions(prev => ({
                    ...prev,
                    [item.wKey as string]: cachedOptions
                }));
                return cachedOptions;
            }

            setLoadingDropdowns(prev => ({
                ...prev,
                [item.wKey as string]: true
            }));

            console.log('Fetching fresh dependent options for:', item.wKey);

            // console.log(`Fetching dependent options for ${item.wKey} based on:`, parentValue);

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
                        // console.log('field_multiple', field);
                        const value = typeof parentValue === 'object' ? parentValue[field] : '';
                        const fieldElement = sortedFormData.flat().find(el => el.wKey === field);
                        // console.log('fieldElement', fieldElement);
                        // Format date values for both WDateBox and WDateRangeBox
                        let formattedValue = value instanceof Date ? moment(value).format('YYYYMMDD') : value;
                        if (fieldElement?.type === 'WDateBox' && value instanceof Date) {
                            // console.log('formattedValue_CHK1', formattedValue);
                        } else if (fieldElement?.type === 'WDateRangeBox' && Array.isArray(fieldElement.wKey)) {
                            const [fromKey, toKey] = fieldElement.wKey;
                            if (field === fromKey || field === toKey) {
                                // console.log('formattedValue_CHK2', formattedValue);
                            }
                        } else if (fieldElement?.type === 'WDropDownBox' && fieldElement.isMultiple) {
                            // For multiple select dropdowns, ensure we're working with an array
                            const values = Array.isArray(value) ? value : [value];
                            // Join with pipe and ensure no extra spaces
                            formattedValue = values.filter(Boolean).join('|');
                            // console.log('Multiple select formatted value:', formattedValue);
                        }
                        xmlFilterContent = xmlFilterContent.replace(`\${${field}}`, formattedValue);
                    });
                } else {
                    xmlFilterContent = item.dependsOn.wQuery.X_Filter || '';
                    item.dependsOn.field.forEach(field => {
                        // console.log('field', field);
                        const value = typeof parentValue === 'object' ? parentValue[field] : '';
                        const fieldElement = sortedFormData.flat().find(el => el.wKey === field);

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
                const fieldElement = sortedFormData.flat().find(el => el.wKey === item.dependsOn.field);
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
                    const fieldElement = sortedFormData.flat().find(el => el.wKey === tag);
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

            // console.log('Dependent dropdown request XML:', xmlData);

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            // console.log('Dependent dropdown response:', response.data);

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

            console.log(`Got ${options.length} dependent options for ${item.wKey}:`, options);

            // Cache the dependent options
            setCachedOptions(cacheKey, options);

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
        sortedFormData?.flat().forEach(item => {
            if (item.dependsOn) {
                if (Array.isArray(item.dependsOn.field)) {
                    const allDependenciesFilled = item.dependsOn.field.every(field =>
                        formValues[field] !== undefined && formValues[field] !== null
                    );

                    if (allDependenciesFilled) {
                        const dependencyValues = item.dependsOn.field.reduce((acc, field) => {
                            const fieldElement = sortedFormData.flat().find(el => el.wKey === field);

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
                    const fieldElement = sortedFormData.flat().find(el => el.wKey === item.dependsOn.field);

                    if (fieldElement?.type === 'WDateBox') {
                        const formattedDate = moment(formValues[item.dependsOn.field]).format('YYYYMMDD');
                        fetchDependentOptions(item, formattedDate);
                    } else {
                        fetchDependentOptions(item, formValues[item.dependsOn.field]);
                    }
                }
            }
        });
    }, [sortedFormData, formValues]);

    const renderDateRangeBox = (item: FormElement) => {
        const [fromKey, toKey] = item.wKey as string[];

        return (
            <div className={isHorizontal ? "mb-2" : "mb-4"}>
                <label className={`block text-sm mb-1 ${isHorizontal ? 'font-bold' : 'font-medium'}`} style={{ color: colors.text }}>
                    {item.label}
                </label>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <DatePicker
                            selected={formValues[fromKey]}
                            onChange={(date: Date) => handleInputChange(fromKey, date)}
                            dateFormat="dd/MM/yyyy"
                            className={`w-full px-3 py-2 border rounded-md bg-white`}
                            wrapperClassName={`w-full`}
                            placeholderText="From Date"
                        />
                    </div>
                    <div className="flex-1">
                        <DatePicker
                            selected={formValues[toKey]}
                            onChange={(date: Date) => handleInputChange(toKey, date)}
                            dateFormat="dd/MM/yyyy"
                            className="w-full px-3 py-2 border rounded-md bg-white"
                            wrapperClassName={`w-full`}
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
            <div className={isHorizontal ? "mb-2" : "mb-4"}>
                <label className={`block text-sm mb-1 ${isHorizontal ? 'font-bold' : 'font-medium'}`} style={{ color: colors.text }}>
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
            <div className={isHorizontal ? "mb-2" : "mb-4"}>
                <label className={`block text-sm mb-1 ${isHorizontal ? 'font-bold' : 'font-medium'}`} style={{ color: colors.text }}>
                    {item.label}
                </label>
                <DatePicker
                    selected={formValues[item.wKey as string]}
                    onChange={(date: Date) => {
                        handleInputChange(item.wKey as string, date);
                    }}
                    dateFormat="dd/MM/yyyy"
                    className={`w-full px-3 py-2 border rounded-md bg-white`}
                    wrapperClassName={`w-full`}
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

        const isLoading = loadingDropdowns[item.wKey as string];

        return (
            <CustomDropdown
                item={item}
                value={formValues[item.wKey as string]}
                onChange={(value) => handleInputChange(item.wKey as string, value)}
                options={options}
                isLoading={isLoading}
                colors={colors}
                formData={sortedFormData}
                handleFormChange={handleFormChange}
                formValues={formValues}
                isHorizontal={isHorizontal}
            />
        );
    };

    const renderCheckBox = (item: FormElement) => {
        return (
            <div className={`${isHorizontal ? "mb-2" : "mb-4"} flex items-center`}>
                <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={formValues[item.wKey as string] || false}
                    onChange={(e) => handleInputChange(item.wKey as string, e.target.checked)}
                    style={{
                        accentColor: colors.primary
                    }}
                />
                <label className={`ml-2 text-sm ${isHorizontal ? 'font-bold' : 'font-medium'}`} style={{ color: colors.text }}>
                    {item.label}
                </label>
            </div>
        );
    };

    const renderFormElement = (item: FormElement) => {
        // Check if this is a dependent dropdown with no options or unfulfilled dependencies
        if (item.type === 'WDropDownBox' && item.dependsOn) {
            // Check if all dependencies are fulfilled
            const dependenciesFulfilled = Array.isArray(item.dependsOn.field)
                ? item.dependsOn.field.every(field =>
                    formValues[field] !== undefined &&
                    formValues[field] !== null &&
                    formValues[field] !== ''
                )
                : formValues[item.dependsOn.field] !== undefined &&
                formValues[item.dependsOn.field] !== null &&
                formValues[item.dependsOn.field] !== '';

            // Hide dependent dropdown if dependencies are not fulfilled
            if (!dependenciesFulfilled) {
                return null;
            }

            const options = item.options
                ? item.options.map(opt => ({
                    label: opt.label,
                    value: opt.Value || opt.value
                }))
                : dropdownOptions[item.wKey as string] || [];

            // Hide dependent dropdown if it has no options available
            if (options.length === 0) {
                return null;
            }
        }

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
        sortedFormData?.flat().forEach(item => {
            if (item.type === 'WDropDownBox' && !item.options && item.wQuery) {
                fetchDropdownOptions(item);
            }
        });
    }, [sortedFormData]);

    useEffect(() => {
        // Initialize all WDateBox fields with wValue on component mount
        const dateFieldsWithValue = sortedFormData?.flat().filter(
            item => item.type === 'WDateBox' && item.wValue && !formValues[item.wKey as string]
        );

        if (dateFieldsWithValue?.length > 0) {
            const updatedValues = { ...formValues };

            dateFieldsWithValue.forEach(item => {
                const year = parseInt(item.wValue!.substring(0, 4));
                const month = parseInt(item.wValue!.substring(4, 6)) - 1; // Month is 0-based
                const day = parseInt(item.wValue!.substring(6, 8));
                updatedValues[item.wKey as string] = new Date(year, month, day);
            });

            handleFormChange(updatedValues);
        }
    }, [sortedFormData, formValues, handleFormChange]); // Run when formData or formValues change

    useEffect(() => {
        // Handle single option pre-selection for dropdowns
        sortedFormData?.flat().forEach(item => {
            if (item.type === 'WDropDownBox') {
                const options = item.options
                    ? item.options.map(opt => ({
                        label: opt.label,
                        value: opt.Value || opt.value
                    }))
                    : dropdownOptions[item.wKey as string] || [];

                if (options.length === 1 && !formValues[item.wKey as string]) {
                    handleInputChange(item.wKey as string, options[0].value);
                }
            }
        });
    }, [dropdownOptions, sortedFormData, formValues]);

    return (
        <div
            className={isHorizontal ? "flex flex-wrap gap-4 items-start" : "p-4"}
            style={{
                backgroundColor: isHorizontal ? 'transparent' : colors.filtersBackground
            }}
        >
            {sortedFormData?.map((filterGroup, groupIndex) => (
                <div key={groupIndex} className={isHorizontal ? "contents" : "mb-4"}>
                    {filterGroup.map((item, itemIndex) => (
                        <div
                            key={`${groupIndex}-${itemIndex}`}
                            className={isHorizontal ? "min-w-[250px]" : ""}
                        >
                            {renderFormElement(item)}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default FormCreator; 