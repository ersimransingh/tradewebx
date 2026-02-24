"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Select from 'react-select';
import moment from 'moment';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import { useTheme } from '@/context/ThemeContext';
import EyeIcon from "@/components/icons/EyeIcon";
import EyeCloseIcon from "@/components/icons/EyeCloseIcon";
import { FaCalendarAlt } from 'react-icons/fa';
import CustomDropdown from './form/CustomDropdown';
import apiService from '@/utils/apiService';

import { getLocalStorage } from '@/utils/helper';
import AsyncSearchDropdown from './form/AsyncSearchDropdown';

export interface FormElement {
    name:string;
    type: string;
    label: string;
    wKey: string | string[];
    FromMinDate?: string;
    FromMaxDate?: string;
    ToMinDate?: string;
    ToMaxDate?: string;
    placeholder?: string;
    dynamicSearch?: {
    isDynamic: boolean,
    minSearchLength: number,
    debounceMs: number
    }
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
    ValidationAPI?: {
        dsXml?: {
            J_Ui: any;
            Sql: string;
            X_Filter?: string;
            X_Filter_Multiple?: Record<string, string>;
            J_Api: any;
        };
        // Also support flat structure (without dsXml wrapper)
        J_Ui?: any;
        Sql?: string;
        X_Filter?: string;
        X_Filter_Multiple?: Record<string, string>;
        X_Filte_Multiple?: Record<string, string>; // Handle typo in some configs
        J_Api?: any;
    };
    FieldVisibleTag?: string;
    FieldEnabledTag?: string;
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
    // State for field visibility - tracks which fields are hidden (for Flag D)
    const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({});
    // State for field enabled/disabled status
    const [fieldEnabled, setFieldEnabled] = useState<Record<string, boolean>>({});
    const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({});

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

      const handlePresetSelection = (
      presetId: string,
      fromKey: string,
      toKey: string,
      item: FormElement
    ) => {
          const today = moment();

          // Backend limits (optional)
          const fromMin = item?.FromMinDate ? moment(item.FromMinDate, "YYYYMMDD") : null;
          const fromMax = item?.FromMaxDate ? moment(item.FromMaxDate, "YYYYMMDD") : null;
          const toMin = item?.ToMinDate ? moment(item.ToMinDate, "YYYYMMDD") : null;
          const toMax = item?.ToMaxDate ? moment(item.ToMaxDate, "YYYYMMDD") : null;

          let startDate: moment.Moment;
          let endDate: moment.Moment;

          // --- Define Preset Logic ---
          switch (presetId) {
            case "today":
              startDate = today.clone().startOf("day");
              endDate = today.clone().endOf("day");
              break;
            case "yesterday":
              startDate = today.clone().subtract(1, "day").startOf("day");
              endDate = today.clone().subtract(1, "day").endOf("day");
              break;
            case "last7days":
              startDate = today.clone().subtract(6, "days").startOf("day");
              endDate = today.clone().endOf("day");
              break;
            case "last30days":
              startDate = today.clone().subtract(29, "days").startOf("day");
              endDate = today.clone().endOf("day");
              break;
            case "thismonth":
              startDate = today.clone().startOf("month");
              endDate = today.clone().endOf("month");
              break;
            case "lastmonth":
              startDate = today.clone().subtract(1, "month").startOf("month");
              endDate = today.clone().subtract(1, "month").endOf("month");
              break;
            case "thisfinancialyear":
              {
                const fyStart =
                  today.month() >= 3
                    ? moment([today.year(), 3, 1])
                    : moment([today.year() - 1, 3, 1]);
                startDate = fyStart.clone();
                endDate = fyStart.clone().add(1, "year").subtract(1, "day");
              }
              break;
            case "lastfinancialyear":
              {
                const lastFyStart =
                  today.month() >= 3
                    ? moment([today.year() - 1, 3, 1])
                    : moment([today.year() - 2, 3, 1]);
                startDate = lastFyStart.clone();
                endDate = lastFyStart.clone().add(1, "year").subtract(1, "day");
              }
              break;
            default:
              return;
          }
      
          // -- Clamp Dates According to Backend Limits ---
          if (fromMin && startDate.isBefore(fromMin)) startDate = fromMin.clone();
          if (fromMax && startDate.isAfter(fromMax)) startDate = fromMax.clone();
          if (toMin && endDate.isBefore(toMin)) endDate = toMin.clone();
          if (toMax && endDate.isAfter(toMax)) endDate = toMax.clone();
      
          // --- Ensure FromDate ≤ ToDate ---
          if (startDate.isAfter(endDate)) {
            const fallback = toMin || fromMax || today;
            startDate = fallback.clone();
            endDate = fallback.clone();
          }
      
          // ---  Update Form Values ---
          const newValues = { ...formValues };
          newValues[fromKey] = startDate.toDate();
          newValues[toKey] = endDate.toDate();
          handleFormChange(newValues);
      
          // --- Close Preset Menu ---
          setShowDatePresets((prev) => ({
            ...prev,
            [fromKey]: false,
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

    // Handle validation API response for flags S and D
    const handleValidationApiResponse = (response: string, currFieldKey: string) => {
        if (!response?.trim().startsWith("<root>")) {
            response = `<root>${response}</root>`;
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, "text/xml");

        const flag = xmlDoc.getElementsByTagName("Flag")[0]?.textContent;
        const dynamicTags = Array.from(xmlDoc.documentElement.children).filter(
            (node) => node.tagName !== "Flag" && node.tagName !== "Message"
        );

        switch (flag) {
            case 'S':
                // Success - apply dynamic tag values silently
                dynamicTags.forEach((tag) => {
                    const tagName = tag.tagName;
                    const tagValue = tag.textContent;
                    setFormValues(prev => ({ ...prev, [tagName]: tagValue }));
                });
                break;

            case 'D':
                // Disable/Enable and Hide/Show fields
                dynamicTags.forEach((tag) => {
                    const tagName = tag.tagName;
                    const tagValue = tag.textContent?.toLowerCase();
                    const isDisabled = tagValue === 'false';

                    if (tagValue === 'true' || tagValue === 'false') {
                        // For Flag D: false = hide/disable, true = show/enable
                        setFieldVisibility(prev => ({ ...prev, [tagName]: !isDisabled }));
                        setFieldEnabled(prev => ({ ...prev, [tagName]: !isDisabled }));

                        // If field is being hidden/disabled, clear its value
                        if (isDisabled) {
                            setFormValues(prev => ({ ...prev, [tagName]: undefined }));
                        }
                    } else {
                        // If it's not a boolean, set the value
                        setFormValues(prev => ({ ...prev, [tagName]: tag.textContent }));
                    }
                });
                break;

            default:
                console.log("Unknown or unhandled flag received:", flag);
        }
    };

    // Function to handle validation API call on blur/change
    const handleBlur = async (item: FormElement, fieldKey?: string, fieldValue?: any) => {
        if (!item.ValidationAPI) return;

        // Support both structures: ValidationAPI.dsXml.* or ValidationAPI.*
        const validationConfig = item.ValidationAPI.dsXml || item.ValidationAPI;
        const J_Ui = validationConfig.J_Ui;
        const Sql = validationConfig.Sql;
        const J_Api = validationConfig.J_Api;
        // Handle both X_Filter_Multiple and X_Filte_Multiple (typo in some configs)
        const X_Filter = validationConfig.X_Filter;
        const X_Filter_Multiple = validationConfig.X_Filter_Multiple || (validationConfig as any).X_Filte_Multiple;

        let xFilter = '';
        let xFilterMultiple = '';
        let shouldCallApi = true;

        // The key to use - for date range, use the specific field key
        const currentKey = fieldKey || (Array.isArray(item.wKey) ? item.wKey[0] : item.wKey);
        // The current field value - use passed value or get from formValues
        const currentValue = fieldValue !== undefined ? fieldValue : formValues[currentKey as string];

        if (X_Filter_Multiple && typeof X_Filter_Multiple === 'object') {
            Object.entries(X_Filter_Multiple).forEach(([key, placeholder]) => {
                let resolvedValue;
                if (typeof placeholder === 'string' && placeholder.startsWith('##') && placeholder.endsWith('##')) {
                    const formKey = placeholder.slice(2, -2);
                    // For date fields, format the date
                    const value = formValues[formKey];
                    if (value instanceof Date) {
                        resolvedValue = moment(value).format('YYYYMMDD');
                    } else {
                        resolvedValue = value;
                    }
                } else {
                    resolvedValue = placeholder;
                }

                if (!resolvedValue) {
                    shouldCallApi = false;
                } else {
                    xFilterMultiple += `<${key}>${resolvedValue}</${key}>`;
                }
            });
        }

        if (X_Filter) {
            let resolvedValue;
            if (typeof X_Filter === 'string') {
                if (X_Filter.startsWith('##') && X_Filter.endsWith('##')) {
                    // Placeholder format: ##fieldName##
                    const formKey = X_Filter.slice(2, -2);
                    const value = formValues[formKey];
                    if (value instanceof Date) {
                        resolvedValue = moment(value).format('YYYYMMDD');
                    } else {
                        resolvedValue = value;
                    }
                } else if (X_Filter === '${value}') {
                    // Direct value placeholder - use current field value
                    if (currentValue instanceof Date) {
                        resolvedValue = moment(currentValue).format('YYYYMMDD');
                    } else {
                        resolvedValue = currentValue;
                    }
                } else {
                    resolvedValue = X_Filter;
                }
            }

            if (!resolvedValue) {
                shouldCallApi = false;
            } else {
                xFilter = resolvedValue;
            }
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
            const columnData = response?.data?.data?.rs0?.[0]?.Column1;
            if (columnData) {
                handleValidationApiResponse(columnData, currentKey as string);
            }
        } catch (error) {
            console.error('Validation API error:', error);
        }
    };

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
                    if (dependentItem.type === 'WDropDownBox' || dependentItem.type === "WSearchDropDownBox") {
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

  const fetchDropdownOptions = async (
    item: FormElement,
    searchQuery?: string
    ) => {
          try {
            // Generate cache key
            const cacheKey = generateCacheKey(item);
        
            // Check cache first
            const cachedOptions = getCachedOptions(cacheKey);
            if (cachedOptions && item.type === "WDropDownBox") {
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
        
            let jUi, jApi;
        
            // Handle J_Ui
            if (typeof item.wQuery?.J_Ui === "object") {
              const uiObj = item.wQuery.J_Ui;
              jUi = Object.keys(uiObj)
                .map(key => `"${key}":"${uiObj[key]}"`)
                .join(",");
            } else {
              jUi = item.wQuery?.J_Ui;
            }
        
            // Handle J_Api
            if (typeof item.wQuery?.J_Api === "object") {
              const apiObj = item.wQuery.J_Api;
              jApi = Object.keys(apiObj)
                .map(key => `"${key}":"${apiObj[key]}"`)
                .join(",");
            } else {
              jApi = item.wQuery?.J_Api;
            }
        
            // Build XML filter content based on searchQuery
            const xmlFilterContent = item.wQuery?.X_Filter || "";
        
            // Add SearchQuery logic
            let xmlFilterMultiple = "";
            if (item.dynamicSearch?.isDynamic && searchQuery && searchQuery.trim() !== "") {
              // Include X_Filter_Multiple with SearchQuery tag
              xmlFilterMultiple = `<X_Filter_Multiple><SearchQuery>${searchQuery}</SearchQuery></X_Filter_Multiple>`;
            }
        
            // Final XML to send
            const xmlData = `<dsXml>
                <J_Ui>${jUi}</J_Ui>
                <Sql>${item.wQuery?.Sql || ""}</Sql>
                ${
                  xmlFilterMultiple
                    ? `${xmlFilterMultiple}<X_Filter></X_Filter>`
                    : `<X_Filter>${xmlFilterContent}</X_Filter>`
                }
                <J_Api>${jApi},"UserType":"${getLocalStorage("userType")}"</J_Api>
            </dsXml>`;
            
            // Make API call
            const response = await apiService.postWithAuth(
              BASE_URL + PATH_URL,
              xmlData
            );
        
            const rs0Data = response.data?.data?.rs0;
            if (!Array.isArray(rs0Data)) {
              console.error("Unexpected data format:", response.data);
              setLoadingDropdowns(prev => ({
                ...prev,
                [item.wKey as string]: false
              }));
              return [];
            }
        
            const keyField = item.wDropDownKey?.key || "DisplayName";
            const valueField = item.wDropDownKey?.value || "Value";
        
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
            console.error("Error fetching dropdown options:", error);
            setLoadingDropdowns(prev => ({
              ...prev,
              [item.wKey as string]: false
            }));
            return [];
          }
        };

    const fetchDependentOptions = async (item: FormElement, parentValue: string | Record<string, any>, searchQuery?: string) => {
        try {
            if (!item.dependsOn) return [];

            if (
                  !item.dynamicSearch?.isDynamic && 
                  ((typeof parentValue === 'string' && !parentValue) ||
                   (typeof parentValue === 'object' && Object.values(parentValue).some(val => !val)))
                ){
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
            if (cachedOptions && item.type === "WDropDownBox") {
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
                        } else if ((fieldElement?.type === 'WDropDownBox' || fieldElement?.type === 'WSearchDropDownBox') && fieldElement.isMultiple) {
                            // For multiple select dropdowns, ensure we're working with an array
                            const values = Array.isArray(value) ? value : [value];
                            // Join with pipe and ensure no extra spaces
                            formattedValue = values.filter(Boolean).join('|');
                            // console.log('Multiple select formatted value:', formattedValue);
                        }
                        xmlFilterContent = xmlFilterContent.replace(`\${${field}}`, formattedValue);
                    });

                    if (searchQuery !== undefined) {
                        xmlFilterContent = xmlFilterContent.replace(/\$\{SearchQuery\}/g, searchQuery || '');
                    }else{
                        xmlFilterContent = xmlFilterContent.replace(/\$\{SearchQuery\}/g, '');
                    }

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
                if(item.type === "WSearchDropDownBox"){
                    setDropdownOptions(prev => ({
                      ...prev,
                      [item.wKey as string]: []
                    }));
                }
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

          // Extract backend date limits (if any)
          const fromMin = item.FromMinDate ? moment(item.FromMinDate, "YYYYMMDD").toDate() : undefined;
          const fromMax = item.FromMaxDate ? moment(item.FromMaxDate, "YYYYMMDD").toDate() : undefined;
          const toMin = item.ToMinDate ? moment(item.ToMinDate, "YYYYMMDD").toDate() : undefined;
          const toMax = item.ToMaxDate ? moment(item.ToMaxDate, "YYYYMMDD").toDate() : undefined;

          // Check visibility for individual date fields - default to visible if not set
          const isFromVisible = fieldVisibility[fromKey] !== false;
          const isToVisible = fieldVisibility[toKey] !== false;

          // Check enabled state for individual date fields - default to enabled if not set
          const isFromEnabled = fieldEnabled[fromKey] !== false;
          const isToEnabled = fieldEnabled[toKey] !== false;

          // If both fields are hidden, don't render the component at all
          if (!isFromVisible && !isToVisible) {
            return null;
          }

          return (
            <div className={isHorizontal ? "mb-2" : "mb-4"}>
              <label
                className={`block text-sm mb-1 ${isHorizontal ? "font-bold" : "font-medium"}`}
                style={{ color: colors.text }}
              >
                {item.label}
              </label>

              <div className="flex gap-4">
                {/* From Date - only render if visible */}
                {isFromVisible && (
                  <div className="flex-1">
                    <DatePicker
                      selected={formValues[fromKey]}
                      onChange={(date: Date) => {
                        handleInputChange(fromKey, date);
                        // Call validation API on change if configured
                        if (item.ValidationAPI) {
                          handleBlur(item, fromKey, date);
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      className={`w-full px-3 py-2 border rounded-md ${!isFromEnabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                      wrapperClassName="w-full"
                      placeholderText="From Date"
                      showYearDropdown
                      showMonthDropdown
                      yearDropdownItemNumber={50}
                      scrollableYearDropdown
                      dropdownMode="select"
                      disabled={!isFromEnabled}
                      // Apply backend limits (if any)
                      minDate={fromMin}
                      maxDate={fromMax}
                    />
                  </div>
                )}

                {/* To Date - only render if visible */}
                {isToVisible && (
                  <div className="flex-1">
                    <DatePicker
                      selected={formValues[toKey]}
                      onChange={(date: Date) => {
                        handleInputChange(toKey, date);
                        // Call validation API on change if configured
                        if (item.ValidationAPI) {
                          handleBlur(item, toKey, date);
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      className={`w-full px-3 py-2 border rounded-md ${!isToEnabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                      wrapperClassName="w-full"
                      placeholderText="To Date"
                      showYearDropdown
                      showMonthDropdown
                      yearDropdownItemNumber={50}
                      scrollableYearDropdown
                      dropdownMode="select"
                      disabled={!isToEnabled}
                      // Apply backend limits (if any)
                      minDate={toMin}
                      maxDate={toMax}
                    />
                  </div>
                )}

                {/* Preset Button - only show if at least one date field is visible and enabled */}
                {(isFromVisible || isToVisible) && (isFromEnabled || isToEnabled) && (
                  <div className="relative">
                    <button
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                      onClick={() =>
                        setShowDatePresets((prev) => ({
                          ...prev,
                          [fromKey]: !prev[fromKey],
                        }))
                      }
                      aria-label="Open date presets"
                    >
                      <FaCalendarAlt />
                    </button>

                    {showDatePresets[fromKey] && (
                      <div
                        className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                        style={{ backgroundColor: colors.textInputBackground }}
                      >
                        <div className="py-1" role="menu" aria-orientation="vertical">
                          {contextMenuItems.map((menuItem) => (
                            <button
                              key={menuItem.id}
                              className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-100"
                              style={{
                                color: colors.textInputText,
                              }}
                              onClick={() => handlePresetSelection(menuItem.id, fromKey, toKey, item)}
                            >
                              {menuItem.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        };


    const renderPasswordBox = (item: FormElement) => {
        const fieldKey = item.wKey as string;
        const isEnabled = fieldEnabled[fieldKey] !== false;
        const isPasswordVisible = !!passwordVisibility[fieldKey];

        return (
            <div className={isHorizontal ? "mb-2" : "mb-4"}>
                <label className={`block text-sm mb-1 ${isHorizontal ? 'font-bold' : 'font-medium'}`} style={{ color: colors.text }}>
                    {item.label}
                </label>
                <div className="relative">
                    <input
                        type={isPasswordVisible ? "text" : "password"}
                        className={`w-full px-3 py-2 pr-10 border rounded-md ${!isEnabled ? 'cursor-not-allowed' : ''}`}
                        style={{
                            borderColor: colors.textInputBorder,
                            backgroundColor: isEnabled ? colors.textInputBackground : '#f2f2f0',
                            color: colors.textInputText
                        }}
                        value={formValues[fieldKey] || ''}
                        onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                        onBlur={() => item.ValidationAPI && handleBlur(item)}
                        placeholder={item.label}
                        disabled={!isEnabled}
                    />
                    <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() =>
                            setPasswordVisibility(prev => ({
                                ...prev,
                                [fieldKey]: !prev[fieldKey]
                            }))
                        }
                        aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                        aria-pressed={isPasswordVisible}
                        disabled={!isEnabled}
                        style={{ color: colors.text }}
                    >
                        {isPasswordVisible ? <EyeIcon /> : <EyeCloseIcon />}
                    </button>
                </div>
            </div>
        );
    };

    const renderTextBox = (item: FormElement) => {
        const fieldKey = item.wKey as string;
        const isEnabled = fieldEnabled[fieldKey] !== false;

        return (
            <div className={isHorizontal ? "mb-2" : "mb-4"}>
                <label className={`block text-sm mb-1 ${isHorizontal ? 'font-bold' : 'font-medium'}`} style={{ color: colors.text }}>
                    {item.label}
                </label>
                <input
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md ${!isEnabled ? 'cursor-not-allowed' : ''}`}
                    style={{
                        borderColor: colors.textInputBorder,
                        backgroundColor: isEnabled ? colors.textInputBackground : '#f2f2f0',
                        color: colors.textInputText
                    }}
                    value={formValues[fieldKey] || ''}
                    onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                    onBlur={() => item.ValidationAPI && handleBlur(item)}
                    placeholder={item.label}
                    disabled={!isEnabled}
                />
            </div>
        );
    };

    const renderDateBox = (item: FormElement) => {
      const fieldKey = item.wKey as string;
      const isEnabled = fieldEnabled[fieldKey] !== false;

      // Extract backend values (if present)
      const fromMin = item.FromMinDate ? moment(item.FromMinDate, "YYYYMMDD").toDate() : undefined;
      const fromMax = item.FromMaxDate ? moment(item.FromMaxDate, "YYYYMMDD").toDate() : undefined;

      return (
        <div className={isHorizontal ? "mb-2" : "mb-4"}>
          <label
            className={`block text-sm mb-1 ${isHorizontal ? "font-bold" : "font-medium"}`}
            style={{ color: colors.text }}
          >
            {item.label}
          </label>

          <DatePicker
            selected={formValues[fieldKey]}
            onChange={(date: Date) => {
              handleInputChange(fieldKey, date);
              if (item.ValidationAPI) {
                handleBlur(item, fieldKey, date);
              }
            }}
            dateFormat="dd/MM/yyyy"
            className={`w-full px-3 py-2 border rounded-md ${!isEnabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            wrapperClassName="w-full"
            placeholderText="Select Date"
            showYearDropdown
            showMonthDropdown
            yearDropdownItemNumber={50}
            scrollableYearDropdown
            dropdownMode="select"
            disabled={!isEnabled}
            minDate={fromMin}
            maxDate={fromMax}
          />
        </div>
      );
    };


    const renderDropDownBox = (item: FormElement) => {
        const fieldKey = item.wKey as string;
        const isEnabled = fieldEnabled[fieldKey] !== false;

        const options = item.options
            ? item.options.map(opt => ({
                label: opt.label,
                value: opt.Value || opt.value
            }))
            : dropdownOptions[fieldKey] || [];

        const isLoading = loadingDropdowns[fieldKey];

        return (
            <CustomDropdown
                item={item}
                value={formValues[fieldKey]}
                onChange={(value) => {
                    handleInputChange(fieldKey, value);
                    if (item.ValidationAPI) {
                        // Pass the new value directly since state update is async
                        handleBlur(item, fieldKey, value);
                    }
                }}
                options={options}
                isLoading={isLoading}
                colors={colors}
                formData={sortedFormData}
                handleFormChange={handleFormChange}
                formValues={formValues}
                isHorizontal={isHorizontal}
                isDisabled={!isEnabled}
            />
        );
    };

    const renderSearchDropDownBox = (item: FormElement) => {
        const fieldKey = item.wKey as string;
        const isEnabled = fieldEnabled[fieldKey] !== false;

        if (item.dynamicSearch?.isDynamic && !item?.wQuery) {
          return (
            <AsyncSearchDropdown
              item={item}
              value={formValues[fieldKey]}
              onChange={(val) => {
                handleInputChange(fieldKey, val);
                if (item.ValidationAPI) {
                  handleBlur(item, fieldKey, val);
                }
              }}
              colors={colors}
              formData={sortedFormData}
              formValues={formValues}
              handleFormChange={handleFormChange}
              fetchDependentOptions={fetchDependentOptions}
              isHorizontal={isHorizontal}
              isDisabled={!isEnabled}
            />
          );
        }else{
            return(
                <AsyncSearchDropdown
                   item={item}
                   value={formValues[fieldKey]}
                   onChange={(val) => {
                     handleInputChange(fieldKey, val);
                     if (item.ValidationAPI) {
                       handleBlur(item, fieldKey, val);
                     }
                   }}
                   colors={colors}
                   formData={sortedFormData}
                   formValues={formValues}
                   handleFormChange={handleFormChange}
                   fetchDependentOptions={(item,parentValue,searchValue)=>{
                     return fetchDropdownOptions(item,searchValue);
                 }}
                   isHorizontal={isHorizontal}
                   isDisabled={!isEnabled}
                 /> )
        }
    };

    const renderCheckBox = (item: FormElement) => {
        const fieldKey = item.wKey as string;
        const isEnabled = fieldEnabled[fieldKey] !== false;

        return (
            <div className={`${isHorizontal ? "mb-2" : "mb-4"} flex items-center`}>
                <input
                    type="checkbox"
                    className={`h-4 w-4 rounded border-gray-300 ${!isEnabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    checked={formValues[fieldKey] || false}
                    onChange={(e) => {
                        handleInputChange(fieldKey, e.target.checked);
                        if (item.ValidationAPI) {
                            handleBlur(item, fieldKey, e.target.checked);
                        }
                    }}
                    disabled={!isEnabled}
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
        // Check field visibility from validation API response (Flag D)
        // For non-date-range fields, use the wKey directly
        // For date-range fields, visibility is handled inside renderDateRangeBox
        if (item.type !== 'WDateRangeBox') {
            const fieldKey = item.wKey as string;
            const isVisible = fieldVisibility[fieldKey] !== false;
            if (!isVisible) {
                return null;
            }
        }

        // Check if this is a dependent dropdown with no options or unfulfilled dependencies
        if ((item.type === 'WDropDownBox' || item.type === "WSearchDropDownBox") && item.dependsOn) {
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
            if (options.length === 0 && item.type === 'WDropDownBox') {
                return null;
            }
        }

        switch (item.type) {
            case 'WDateRangeBox':
                return renderDateRangeBox(item);
            case 'WTextBox':
                return renderTextBox(item);
            case 'WPasswordBox':
                return renderPasswordBox(item);
            case 'WDateBox':
                return renderDateBox(item);
            case 'WDropDownBox':
                return renderDropDownBox(item);
            case 'WSearchDropDownBox':
                return renderSearchDropDownBox(item);
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
