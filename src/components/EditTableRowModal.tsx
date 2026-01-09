"use client";
import React, { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from 'react-toastify';
import { ACTION_NAME, BASE_URL, PATH_URL } from '@/utils/constants';
import CustomDropdown from './form/CustomDropdown';
import { useTheme } from '@/context/ThemeContext';
import EntryFormModal from './EntryFormModal';
import KycPage from "@/apppages/KycPage";
import { clearMakerSates, displayAndDownloadFile, dynamicXmlGenratingFn, getLocalStorage, sanitizeValueSpecialChar, storeLocalStorage } from "@/utils/helper";
import apiService from "@/utils/apiService";
import AccountClosure from "@/apppages/KycPage/account-closure";

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
    pageName?: string;
    isTabs?: boolean;
    onClose: () => void;
    title: string;
    tableData: RowData[];
    wPage: string;
    settings: {
        SavebName: any;
        ViewDocumentName: string;
        ShowView: boolean;
        EditableColumn: EditableColumn[];
        leftAlignedColumns?: string;
        leftAlignedColums?: string;
        columnWidth?: Array<{
            key: string;
            width: number;
        }>;
        hideMultiEditColumn?: string;
        ShowViewDocument?: boolean;

        ShowViewDocumentAPI?: {
            dsXml: {
                J_Ui: any;
                Sql: string;
                X_Filter: string;
                X_Filter_Multiple?: any;
                J_Api: any;
            };
        };

        ViewAPI?: {
            dsXml: {
                J_Ui: any;
                Sql: string;
                X_Filter: string;
                X_Filter_Multiple?: any;
                J_Api: any;
            };
        };


    };
    showViewDocument?: boolean;
}

const EditTableRowModal: React.FC<EditTableRowModalProps> = ({
    isOpen,
    onClose,
    title,
    tableData,
    pageName,
    wPage,
    settings,
    showViewDocument = false,
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

    // EntryFormModal states
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [entryFormData, setEntryFormData] = useState<any>(null);
    const [pageData, setPageData] = useState<any>(null);
    const [isLoadingPageData, setIsLoadingPageData] = useState(false);
    const [processResponseData, setProcessResponseData] = useState<any[]>([]);
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

    //can be use in future
    // const [viewLogHeader, setViewLogHeader] = useState({})
    //end
    // eky modal state 
    const [isEkycModalOpen, setIsKycModalOpen] = useState(false);
    const [accountClouserOpen, setAccountClosureOpen] = useState(false)
    const [accountClouserDataPass, setAccountClosureDataPass] = useState({
        "name": "Account Closure",
        "primaryHeaderKey": "",
        "primaryKey": "",
        "level": 1,
        "summary": {},
        "J_Ui": {
            "ActionName": "TradeWeb",
            "Option": "ClientClosure",
            "Level": 1,
            "RequestFrom": "W"
        },
        "settings": {},
        "clientCode": ''
    })
    // loading state for save/process button
    const [isSaving, setIsSaving] = useState(false);
    
    const formType = tableData?.length > 0 ? tableData[0].FormType : "entry";
    
    const showViewTable = settings.ShowView

    const showViewDocumentBtn = settings.ShowViewDocument

    const showViewDocumentLabel = settings.ViewDocumentName

    const saveBtnDocumentName = settings.SavebName

    const showViewDocumentAPI = settings.ShowViewDocumentAPI

    const showViewApi = settings.ViewAPI

    const editableColumns = settings.EditableColumn || [];
    
    

    // Get column width configuration from settings
    const getColumnWidth = (columnKey: string): number | undefined => {
        const columnWidthConfig = settings?.columnWidth;
        if (columnWidthConfig && Array.isArray(columnWidthConfig)) {
            const widthConfig = columnWidthConfig.find(config => config.key === columnKey);
            return widthConfig?.width;
        }
        return undefined;
    };

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



    // New function to fetch page data for EntryFormModal
    const fetchPageDataForView = async (rowData: RowData) => {
        setIsLoadingPageData(true);
        try {
            // Create X_Filter from all row data
            const xFilterTags = Object.entries(rowData)
                .map(([key, value]) => {
                    const sanatizedVal = sanitizeValueSpecialChar(value)
                    return `<${key}>${sanatizedVal}</${key}>`
                })
                .join('');

            const xmlData = `<dsXml>
                <J_Ui>"ActionName":"${ACTION_NAME}","Option":"Master_Edit"</J_Ui>
                <Sql></Sql>
                <X_Filter></X_Filter>
                <X_Filter_Multiple>${xFilterTags}</X_Filter_Multiple>
                <J_Api>"UserId":"${getLocalStorage('userId') || 'ADMIN'}","AccYear":"${getLocalStorage('accYear') || '24'}","MyDbPrefix":"${getLocalStorage('myDbPrefix') || 'undefined'}","MemberCode":"${getLocalStorage('memberCode') || ''}","SecretKey":"${getLocalStorage('secretKey') || ''}","MenuCode":"${getLocalStorage('menuCode') || 27}","ModuleID":"${getLocalStorage('moduleID') || '27'}","MyDb":"${getLocalStorage('myDb') || 'undefined'}","DenyRights":"${getLocalStorage('denyRights') || ''}"</J_Api>
            </dsXml>`;



            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            const EditTablePageData = response.data.data.rs0; // Form field configuration
            const ChildEntryData = response.data.data.rs1 || []; // Child entry data records



            // Create ChildEntry configuration structure
            // rs0 contains form field configuration, rs1 contains actual child entry data
            let childEntryStructure: any = {};

            // Check if there are child entry form fields in rs0 or if rs1 has data
            const hasChildEntryFields = EditTablePageData && Array.isArray(EditTablePageData) &&
                EditTablePageData.some(field => field.wKey && typeof field.wKey === 'string');

            const hasChildEntryData = ChildEntryData && Array.isArray(ChildEntryData) && ChildEntryData.length > 0;

            if (hasChildEntryData || hasChildEntryFields) {


                // Create child entry configuration similar to how it's done in DynamicReportComponent
                const baseStructure = {
                    J_Ui: {
                        ActionName: ACTION_NAME,
                        Option: "ChildEntry_Edit"
                    },
                    J_Api: {
                        UserId: getLocalStorage('userId') || 'ADMIN',
                        AccYear: getLocalStorage('accYear') || '24',
                        MyDbPrefix: getLocalStorage('myDbPrefix') || '',
                        MemberCode: getLocalStorage('memberCode') || '',
                        SecretKey: getLocalStorage('secretKey') || '',
                        MenuCode: getLocalStorage('menuCode') || 0,
                        ModuleID: getLocalStorage('moduleID') || 0,
                        MyDb: getLocalStorage('myDb') || '',
                        DenyRights: getLocalStorage('denyRights') || ''
                    },
                    X_Filter: rowData, // Use the current row data as filter for child entries
                    sql: {}
                };

                childEntryStructure = { ...baseStructure };

                // If we have actual child entry data, include it
                if (hasChildEntryData) {
                    childEntryStructure.childData = ChildEntryData;
                }

                // If we have child entry form fields, include them
                if (hasChildEntryFields) {
                    childEntryStructure.formFields = EditTablePageData;
                }


            } else {

            }

            // Create a mock pageData structure that EntryFormModal expects
            const mockPageData = [{
                wPage: wPage,
                Entry: {
                    MasterEntry: {
                        J_Ui: {
                            ActionName: ACTION_NAME,
                            Option: "Master_Edit"
                        },
                        J_Api: {
                            UserId: getLocalStorage('userId') || 'ADMIN',
                            AccYear: getLocalStorage('accYear') || '24',
                            MyDbPrefix: getLocalStorage('myDbPrefix') || '',
                            MemberCode: getLocalStorage('memberCode') || '',
                            SecretKey: getLocalStorage('secretKey') || '',
                            MenuCode: getLocalStorage('menuCode') || 0,
                            ModuleID: getLocalStorage('moduleID') || 0,
                            MyDb: getLocalStorage('myDb') || '',
                            DenyRights: getLocalStorage('denyRights') || ''
                        },
                        X_Filter: rowData,
                        sql: {}
                    },
                    ChildEntry: childEntryStructure // Use child entry data from API response
                }
            }];


            setPageData(mockPageData);
            setEntryFormData(rowData);
            setIsEntryModalOpen(true);

        } catch (error) {
            console.error('Error fetching page data:', error);
            showValidationMessage('Failed to load form configuration. Please try again.');
        } finally {
            setIsLoadingPageData(false);
        }
    };

    const handleViewRow = (rowData: RowData, rowIndex: number) => {


        const entryName = rowData?.EntryName?.trim().toLowerCase();

        // this condition is specifically for ekyc component form (check for entry name)
        if (entryName === "rekyc") {
            storeLocalStorage('rekycRowData_viewMode', JSON.stringify(rowData));
            storeLocalStorage("ekyc_viewMode_for_checker", "true");
            storeLocalStorage("ekyc_activeTab", "personal");
            storeLocalStorage("ekyc_checker", "false");
            setIsKycModalOpen(true);
            clearMakerSates();
        } else if (entryName === "account closure") {
            setAccountClosureOpen(true)
            setAccountClosureDataPass(prev => ({
                ...prev,
                clientCode: rowData.ClientCode
            }));
        }
        else {
            fetchPageDataForView(rowData);
        }
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

    // Initialize dependent fields when modal opens and tableData is available
    useEffect(() => {
        if (isOpen && localData.length > 0) {


            // Initialize dependent fields for each row
            localData.forEach((row, rowIndex) => {
                editableColumns.forEach(column => {
                    if (column.type === 'WDropDownBox' && column.dependsOn && !column.options) {
                        let shouldInitialize = false;
                        let parentFieldValue: any = null;

                        if (Array.isArray(column.dependsOn.field)) {
                            // Handle multiple dependencies
                            const parentValues: Record<string, any> = {};
                            let allFieldsHaveValues = true;

                            column.dependsOn.field.forEach(fieldName => {
                                const value = row[fieldName];
                                parentValues[fieldName] = value;
                                if (!value) {
                                    allFieldsHaveValues = false;
                                }
                            });

                            if (allFieldsHaveValues) {
                                shouldInitialize = true;
                                parentFieldValue = parentValues;
                            }
                        } else {
                            // Handle single dependency
                            parentFieldValue = row[column.dependsOn.field];
                            if (parentFieldValue) {
                                shouldInitialize = true;
                            }
                        }

                        if (shouldInitialize) {
                           
                            fetchDependentOptions(column, parentFieldValue, rowIndex);
                        }
                    }
                });
            });
        }
    }, [isOpen, localData, editableColumns]);

    // Console log EntryFormModal data when modal opens
    useEffect(() => {
        if (isEntryModalOpen && pageData) {
            // console.log('=== EntryFormModal Data from EditTableRowModal ===', {
            //     isOpen: isEntryModalOpen,
            //     pageData: pageData,
            //     editData: entryFormData,
            //     action: 'view',
            //     wPage: wPage,
            //     timestamp: new Date().toISOString()
            // });


        }
    }, [isEntryModalOpen, pageData, entryFormData, wPage]);

    const handleInputChange = (rowIndex: number | string, key: string, value: any) => {
        let updated: RowData[];

        if (rowIndex === "viewModal") {
            // Skip view modal handling since we removed it
            return;
        } else {
            updated = [...localData];
            updated[rowIndex as number] = { ...updated[rowIndex as number], [key]: value };
            setLocalData(updated);
        }

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
                if (rowIndex === "viewModal") {
                    // Skip view modal handling since we removed it
                    return;
                } else {
                    // Handle table rows
                    updated!.forEach((_, idx) => {
                        if (Array.isArray(column.dependsOn!.field)) {
                            const allFieldValues = column.dependsOn!.field.reduce((acc, field) => {
                                acc[field] = updated![idx][field];
                                return acc;
                            }, {} as Record<string, any>);

                            fetchDependentOptions(column, allFieldValues, idx);
                        } else {
                            fetchDependentOptions(column, updated![idx][key], idx);
                        }
                    });
                }
            });
        }
    };

    const handleInputBlur = async (rowIndex: number | string, key1: string, previousValue: any, newValue?:any) => {
        const field = editableColumns.find(col => col.wKey === key1);
        if (!field?.ValidationAPI?.dsXml) return;
        if (rowIndex === "viewModal") {
            // Skip view modal handling since we removed it
            return;
        }
        const rowValues = localData[rowIndex as number] || {};
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
                    if(lookupKey === key1){
                        fieldValue = newValue
                    }else{
                        fieldValue = rowValues[lookupKey];
                    }
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
            UserId: (J_Api?.UserId === '<<USERID>>') ? getLocalStorage('userId') || '' : J_Api?.UserId
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
            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            const result = response?.data?.data?.rs0?.[0]?.Column1;
            if (result) {
                const messageMatch = result.match(/<Message>(.*?)<\/Message>/);
                const flagMatch = result.match(/<Flag>(.*?)<\/Flag>/);
                const message = messageMatch ? messageMatch[1] : 'Validation failed.';
                const flag = flagMatch ? flagMatch[1] : '';

                if (flag !== 'S') {
                    showValidationMessage(message);
                    if (rowIndex === "viewModal") {
                        // Skip view modal handling since we removed it
                        return;
                    } else {
                        setLocalData(prev => {
                            const updated = [...prev];
                            updated[rowIndex as number] = {
                                ...updated[rowIndex as number],
                                [key1]: previousValue
                            };
                            return updated;
                        });
                    }
                } else {
                    // Validation successful - extract additional column values
                    // Find all XML tags except Flag and Message
                    const xmlTagRegex = /<(\w+)>(.*?)<\/\1>/g;
                    const columnUpdates: Record<string, any> = {};
                    let match;

                    while ((match = xmlTagRegex.exec(result)) !== null) {
                        const tagName = match[1];
                        const tagValue = match[2];

                        // Skip Flag and Message tags, extract all other values
                        if (tagName !== 'Flag' && tagName !== 'Message') {
                            columnUpdates[tagName] = tagValue;
                        }
                    }

                    // Update the row data with any additional column values returned
                    if (Object.keys(columnUpdates).length > 0) {
                        if (rowIndex === "viewModal") {
                            // Skip view modal handling since we removed it
                            return;
                        } else {
                            setLocalData(prev => {
                                const updated = [...prev];
                                updated[rowIndex as number] = {
                                    ...updated[rowIndex as number],
                                    ...columnUpdates
                                };
                                return updated;
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Validation API failed:', error);
            showValidationMessage('An error occurred during validation.');
        }
    };

    const generateDsXml = (data: RowData[]) => {
        // Note: This function includes ALL columns in the API call, including hidden ones
        // The hideMultiEditColumn setting only affects the UI display, not the data sent to API
        const itemsXml = data
            .map(item => {
                const itemFields = Object.entries(item)
                    .map(([key, value]) => {
                        const sanatizedValue = sanitizeValueSpecialChar(value);
                        return `<${key.trim()}>${sanatizedValue}</${key.trim()}>`
                    })
                    .join('');
                return `<item>${itemFields}</item>`;
            })
            .join('');
        const userId = getLocalStorage('userId') || 'ADMIN';
        const userType = getLocalStorage('userType') || 'Branch';
        const optiontag = (showViewDocumentBtn && showViewDocumentLabel ? 'Process' : 'Edit')
        return `<dsXml>
                    <J_Ui>"ActionName":"${wPage}","Option":"${optiontag}","RequestFrom":"W"</J_Ui>
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

    const hadleViewLog = async (rowData: any) => {
        try {
            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, dynamicXmlGenratingFn(showViewApi, rowData));
            const rs0 = response?.data?.data?.rs0 || [];

            if (!Array.isArray(rs0) || rs0.length === 0) {
                toast.error('No logs found.');
                return;
            }
            setProcessResponseData(rs0);
            setIsProcessModalOpen(true);


        } catch (error) {
            console.error('Error in handleProcess:', error);
            toast.error('Failed to process request.');

        } finally {
            setIsSaving(false);
        }
    }


    const handleSave = async () => {
        
        setIsSaving(true);
        const xmlData = generateDsXml(localData);
        
        try {
            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            const responseData = response.data?.data?.rs0?.[0];
            const responseKra = response.data?.data?.rs0

            // Check API-level failure
            if (response.data?.success === false) {
                let errorMessage = response.data.message || 'An error occurred while saving';
                const messageMatch = errorMessage.match(/<Message>(.*?)<\/Message>/);
                if (messageMatch) errorMessage = messageMatch[1];

                showValidationMessage(errorMessage, 'E');
                return;
            }

            // Check business logic error from rs0[0]
            if (responseData?.Flag === "E") {
                const businessError = responseData?.Message || "Business error occurred";
                showValidationMessage(businessError, "E");
                return;
            }

            // Success handling
            let successMessage = 'Record saved successfully';
            if (response.data?.message) {
                const match = response.data.message.match(/<Message>(.*?)<\/Message>/);
                if (match) successMessage = match[1];
                else successMessage = response.data.message;
            }

            const RemarkArray = responseData?.Remark?.[0];
            if (RemarkArray?.fileContents) {
                const base64 = RemarkArray.fileContents;
                const fileDownloadName = RemarkArray.fileDownloadName;
                displayAndDownloadFile(base64, fileDownloadName);
            }

            if(responseKra?.fileContents){
                const base64 = responseKra?.fileContents
                const fileName = responseKra?.fileDownloadName
                displayAndDownloadFile(base64,fileName)
            }

            toast.success(successMessage);
            onClose();
        } catch (error) {
            console.error('Error saving data:', error);
            let errorMessage = 'An error occurred while saving. Please try again.';

            if (error.response?.data?.success === false) {
                errorMessage = error.response.data.message || errorMessage;
                const match = errorMessage.match(/<Message>(.*?)<\/Message>/);
                if (match) errorMessage = match[1];
            }

            showValidationMessage(errorMessage, 'E');
        } finally {
            setIsSaving(false);
        }
    };



    //this logic can be use in future

    // const handleProcess = async () => {
    //     setIsSaving(true);
    //     try {
    //         const response = await apiService.postWithAuth(BASE_URL + PATH_URL, viewApiXml);
    //         const rs0 = response?.data?.data?.rs0 || [];

    //         if (!Array.isArray(rs0) || rs0.length === 0) {
    //             toast.error('No logs found.');
    //             return;
    //         }
    //         setProcessResponseData(rs0);
    //         setIsProcessModalOpen(true);
    //         // setIsProcessButtonEnabled(false);

    //     } catch (error) {
    //         console.error('Error in handleProcess:', error);
    //         toast.error('Failed to process request.');
    //         setIsProcessButtonEnabled(false);
    //     } finally {
    //         setIsSaving(false);
    //     }
    // };

    //end




    const getEditableColumn = (key: string) => {
        return editableColumns.find((col) => col.wKey === key);
    };

    // Function to get column order - editable columns first, then non-editable
    // Also handles hiding columns based on hideMultiEditColumn setting
    // When showViewDocument is true, show non-editable columns first
    const getOrderedColumns = (dataKeys: string[]) => {
        // Get columns to hide from settings
        const hideMultiEditColumn = settings?.hideMultiEditColumn || '';
        const columnsToHide = hideMultiEditColumn
            .split(',')
            .map(col => col.trim())
            .filter(col => col !== ''); // Remove empty strings

        // Log for debugging
        if (columnsToHide.length > 0) {

        }

        // Filter out hidden columns from dataKeys
        const visibleDataKeys = dataKeys.filter(key => !columnsToHide.includes(key));

        if (columnsToHide.length > 0) {

        }

        const editableKeys = editableColumns.map(col => col.wKey);
        const editableColumnKeys = visibleDataKeys.filter(key => editableKeys.includes(key));
        const nonEditableColumnKeys = visibleDataKeys.filter(key => !editableKeys.includes(key));

        // If showViewDocument is true, show non-editable columns first, then editable columns
        if (showViewDocument) {
            return [...nonEditableColumnKeys, ...editableColumnKeys];
        }

        // Default behavior: editable columns first, then non-editable
        return [...editableColumnKeys, ...nonEditableColumnKeys];
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
                <J_Api>${jApi},"UserType":"${getLocalStorage('userType')}"</J_Api>
            </dsXml>`;



            const response = await apiService.postWithAuth(
                BASE_URL + PATH_URL,
                xmlData,
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

    const fetchDependentOptions = async (column: EditableColumn, parentValue: string | Record<string, any>, rowIndex: number | string) => {
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
                <J_Api>${jApi},"UserType":"${getLocalStorage('userType')}"</J_Api>
            </dsXml>`;



            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);



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



    const handleDocumentView = async (rowData: any,) => {
        //needed in future
        // if ((rowData.RekycDocumentType === undefined || rowData.RekycDocumentType === '')) {
        //     setValidationModal({
        //         isOpen: true,
        //         message: 'Please select a Rekyc Document Type from the dropdown to view the document.',
        //         type: 'E'
        //     });
        //     return;
        // }

        const J_Ui = Object.entries(showViewDocumentAPI.dsXml.J_Ui)
            .map(([key, value]) => `"${key}":"${value}"`)
            .join(',');

        const X_Filter_Multiple = Object.keys(showViewDocumentAPI.dsXml.X_Filter_Multiple)
            .filter(key => key in rowData)
            .map(key => `<${key}>${rowData[key]}</${key}>`)
            .join('');

        const xmlData = `<dsXml>
          <J_Ui>${J_Ui}</J_Ui>
          <Sql>${showViewDocumentAPI.dsXml.Sql || ''}</Sql>
          <X_Filter>${showViewDocumentAPI.dsXml.X_Filter || ''}</X_Filter>
          <X_Filter_Multiple>${X_Filter_Multiple}</X_Filter_Multiple>
          <J_Api>"UserId":"${getLocalStorage('userId')}"</J_Api>
        </dsXml>`;

        try {
            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            const base64 = response?.data?.data?.rs0?.Base64PDF;
            // const fileName = response?.data?.data?.rs0?.PDFName


            if (base64) {
                displayAndDownloadFile(base64)
            }
            if (response?.data?.data?.rs0[0].Flag === "E") {
                toast.error(response?.data?.data?.rs0[0]?.Message || "something went wrong")
            }

        } catch (error) {
            console.error("Error fetching DocumentView:", error);
            toast.error(error)
        }
    };

    return (
        <>
            <Dialog open={isOpen} onClose={() => console.log("close")} className="relative z-[100]" >
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="bg-white rounded-lg shadow-xl max-w-5xl w-full p-6 flex flex-col max-h-[70vh]">
                        <DialogTitle className="text-lg font-semibold mb-2 flex-shrink-0">{title}</DialogTitle>
                        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
                            {localData.length > 0 ? (
                                showViewDocument ? (
                                    // Form layout for ShowViewDocument
                                    <div className="mx-auto p-2">
                                        {localData.map((row, rowIndex) => (
                                            <div key={rowIndex} className="mb-2">
                                                {rowIndex > 0 && <hr className="my-6 border-gray-300" />}

                                                {/* Action buttons for view */}
                                                {showViewTable === true && (
                                                    <div className="mb-4 flex justify-end">
                                                        <button
                                                            onClick={() => handleViewRow(row, rowIndex)}
                                                            className="bg-green-50 text-green-500 hover:bg-green-100 hover:text-green-700 px-4 py-2 rounded-md transition-colors"
                                                            style={{
                                                                fontFamily: fonts.content,
                                                            }}
                                                        >
                                                            View Details
                                                        </button>

                                                    </div>
                                                )}

                                                {/* Form fields */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {getOrderedColumns(Object.keys(row)).map((key) => {
                                                        const value = row[key];
                                                        const editable = getEditableColumn(key);

                                                        return (
                                                            <div key={key} className="mb-2">
                                                                <label
                                                                    className="block text-sm font-medium mb-2"
                                                                    style={{
                                                                        color: colors.text,
                                                                        fontFamily: fonts.content
                                                                    }}
                                                                >
                                                                    {key}
                                                                </label>
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
                                                                            onBlur={(e) => {
                                                                                handleInputBlur(rowIndex, key, previousValues[`${rowIndex}_${key}`],e.target.value);
                                                                                setPreviousValues(prev => {
                                                                                    const updated = { ...prev };
                                                                                    delete updated[`${rowIndex}_${key}`];
                                                                                    return updated;
                                                                                });
                                                                            }}
                                                                            placeholder={editable.wPlaceholder}
                                                                            className="w-full border border-gray-300 rounded px-3 py-2"
                                                                            style={{
                                                                                fontFamily: fonts.content,
                                                                                color: colors.text,
                                                                                backgroundColor: colors.textInputBackground,
                                                                                borderColor: colors.textInputBorder,
                                                                            }}
                                                                        />
                                                                    ) : editable.type === "WDropDownBox" ? (
                                                                        <CustomDropdown
                                                                            item={{
                                                                                ...editable,
                                                                                isMultiple: false,
                                                                                label: "" // Override label to empty string to hide internal label
                                                                            } as any}
                                                                            value={value ?? ""}
                                                                            onChange={async (newValue) => {
                                                                                const previousValue = value;
                                                                                handleInputChange(rowIndex, key, newValue);

                                                                                // Trigger validation API if configured
                                                                                if (editable.ValidationAPI?.dsXml) {
                                                                                    // Small delay to ensure state is updated
                                                                                    setTimeout(() => {
                                                                                        handleInputBlur(rowIndex, key, previousValue,newValue);
                                                                                    }, 100);
                                                                                }
                                                                            }}
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
                                                                            handleFormChange={() => undefined}
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
                                                                                className="w-full border border-gray-300 rounded px-3 py-2"
                                                                            />
                                                                        </div>
                                                                    ) : null
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        value={value ?? ""}
                                                                        disabled
                                                                        className="w-full border rounded px-3 py-2 cursor-not-allowed"
                                                                        style={{
                                                                            fontFamily: fonts.content,
                                                                            color: '#6b7280', // Gray-500 for disabled text
                                                                            backgroundColor: '#f9fafb', // Gray-50 for disabled background
                                                                            borderColor: '#d1d5db', // Gray-300 for disabled border
                                                                            opacity: 0.6
                                                                        }}
                                                                        readOnly
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    // Table layout for normal editing
                                    <div className="p-2 w-full">
                                        <table className="w-full min-w-full border text-sm">
                                            <thead>
                                                <tr>
                                                    {showViewTable === true && <th
                                                        className="border px-2 py-2 text-left"
                                                        style={{
                                                            backgroundColor: colors.primary,
                                                            color: colors.text,
                                                            fontFamily: fonts.content,
                                                            minWidth: '100px'
                                                        }}
                                                    >
                                                        Actions
                                                    </th>}
                                                    {getOrderedColumns(Object.keys(localData[0])).map((key) => {
                                                        const columnWidth = getColumnWidth(key);
                                                        return (
                                                            <th
                                                                key={key}
                                                                className="border px-2 py-2 text-left"
                                                                style={{
                                                                    backgroundColor: colors.primary,
                                                                    color: colors.text,
                                                                    fontFamily: fonts.content,
                                                                    ...(columnWidth && { minWidth: `${columnWidth}px` }),
                                                                }}
                                                            >
                                                                {key}
                                                            </th>
                                                        );
                                                    })}
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
                                                        {showViewTable === true && <td className="border px-2 py-2">
                                                            <button
                                                                onClick={() => handleViewRow(row, rowIndex)}
                                                                className="bg-green-50 text-green-500 hover:bg-green-100 hover:text-green-700 px-3 py-1 rounded-md transition-colors"
                                                                style={{
                                                                    fontFamily: fonts.content,
                                                                }}
                                                            >
                                                                View
                                                            </button>
                                                        </td>}
                                                        {getOrderedColumns(Object.keys(row)).map((key) => {
                                                            const value = row[key];
                                                            const editable = getEditableColumn(key);
                                                            const isValueNumeric = isNumeric(value);
                                                            const hasChar = hasCharacterField(key);

                                                            // Get columns that should be left-aligned even if they contain numbers
                                                            const leftAlignedColumns = settings?.leftAlignedColumns || settings?.leftAlignedColums
                                                                ? (settings?.leftAlignedColumns || settings?.leftAlignedColums).split(',').map((col: string) => col.trim())
                                                                : [];

                                                            const isLeftAligned = leftAlignedColumns.includes(key);

                                                            return (
                                                                <td
                                                                    key={key}
                                                                    className="border px-2 py-2"
                                                                    style={{
                                                                        textAlign: isLeftAligned || editable ? 'left' : (hasChar ? 'left' : 'right')
                                                                    }}
                                                                >
                                                                    {editable ? (
                                                                        editable.type === "WTextBox" ? (
                                                                            <input
                                                                                type="text"
                                                                                aria-label="Enter Value"
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
                                                                                onBlur={(e) => {
                                                                                    handleInputBlur(rowIndex, key, previousValues[`${rowIndex}_${key}`],e.target.value);
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
                                                                                item={{
                                                                                    ...editable,
                                                                                    isMultiple: false,
                                                                                    label: "" // Override label to empty string for table layout too
                                                                                } as any}
                                                                                value={value ?? ""}
                                                                                onChange={async (newValue) => {
                                                                                    const previousValue = value;
                                                                                    handleInputChange(rowIndex, key, newValue);

                                                                                    // Trigger validation API if configured
                                                                                    if (editable.ValidationAPI?.dsXml) {
                                                                                        // Small delay to ensure state is updated
                                                                                        setTimeout(() => {
                                                                                            handleInputBlur(rowIndex, key, previousValue,newValue);
                                                                                        }, 100);
                                                                                    }
                                                                                }}
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
                                                                                handleFormChange={() => undefined}
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
                                )
                            ) : (
                                <p className="text-gray-600">No data available.</p>
                            )}
                        </div>

                        <div className="mt-2 flex justify-end gap-4 flex-shrink-0">

                            {showViewDocumentBtn === true &&
                                <button
                                    onClick={(showViewDocumentBtn && showViewDocumentLabel ? () => hadleViewLog(localData[0]) : () => handleDocumentView(localData[0]))}
                                    className="bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700 px-4 py-2 rounded-md transition-colors ml-4"
                                    style={{
                                        fontFamily: fonts.content,
                                    }}
                                >
                                    {(showViewDocumentBtn && showViewDocumentLabel ? showViewDocumentLabel : 'View Document')}
                                </button>
                            }

                            <button
                                //this logic can be used in future
                                // disabled={isSaving || ((showViewDocumentBtn && showViewDocumentLabel) && !isProcessButtonEnabled)}
                                // (showViewDocumentBtn && showViewDocumentLabel ? handleProcess :
                                //end
                                onClick={() => handleSave()}
                                className="px-4 py-2 rounded ml-2 flex items-center gap-2 bg-green-700 hover:bg-green-700 text-white"
                            >
                                {isSaving && (
                                    <svg
                                        className="animate-spin h-4 w-4"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                )}
                                {isSaving
                                    ? 'Processing...'
                                    : (showViewDocumentBtn && showViewDocumentLabel ? saveBtnDocumentName : 'Save')
                                }
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                                Close
                            </button>
                        </div>
                    </DialogPanel>
                </div >
            </Dialog >

            {/* Validation Modal */}
            {
                validationModal.isOpen && (
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
                )
            }

            {/* Entry Form Modal */}
            {
                isEntryModalOpen && pageData && (
                    <EntryFormModal
                        isOpen={isEntryModalOpen}
                        onClose={() => {

                            setIsEntryModalOpen(false);
                            setEntryFormData(null);
                            setPageData(null);
                        }}
                        pageData={pageData}
                        editData={entryFormData}
                        action="view"
                        setEntryEditData={(data) => {

                            setEntryFormData(data);
                        }}
                        pageName={pageName}
                        isTabs={formType === "multientry"}
                        refreshFunction={() => {

                            // Refresh the main table data if needed
                        }}
                        childModalZindex="z-500"
                        parentModalZindex="z-400"
                    />
                )
            }
            {
                isEkycModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center z-400" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                        <div className="bg-white rounded-lg py-3 w-full max-w-[85vw] overflow-y-auto min-h-[85vh] max-h-[85vh]">
                            <div className="flex justify-end items-center pr-4 mb-2">
                                <button
                                    onClick={() => {
                                        storeLocalStorage('rekycRowData_viewMode', null);
                                        storeLocalStorage("ekyc_viewMode_for_checker", "false");
                                        setIsKycModalOpen(false);
                                    }}
                                    style={{
                                        backgroundColor: colors.buttonBackground,
                                        color: colors.buttonText,
                                    }}
                                    className="px-4 py-1 rounded-lg ml-4"

                                >
                                    Close
                                </button>
                            </div>
                            <KycPage />
                        </div>
                    </div>
                )
            }

            {
                isProcessModalOpen && (
                    <Dialog open={isProcessModalOpen} onClose={() => setIsProcessModalOpen(false)} className="relative z-[200]">
                        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                        <div className="fixed inset-0 flex items-center justify-center p-4">
                            <DialogPanel className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[80vh] overflow-auto">
                                <DialogTitle className="text-lg font-semibold mb-4">Client Export Logs</DialogTitle>

                                {/* Header Info */}
                                <div className="grid grid-cols-3 gap-4 text-sm font-medium mb-4">
                                    {Object.keys(showViewApi.dsXml.X_Filter_Multiple)
                                        .filter(key => key in localData[0])
                                        .map(key => (
                                            <div key={key}>
                                                <strong>{key.replace(/([A-Z])/g, ' $1').trim()}:</strong> {localData[0][key]}
                                            </div>
                                        ))}
                                </div>


                                <div className="overflow-x-auto">
                                    <table className="min-w-full border border-gray-300 text-sm">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                {processResponseData.length > 0 &&
                                                    Object.keys(processResponseData[0]).map((key) => (
                                                        <th key={key} className="border px-4 py-2 text-left">{key}</th>
                                                    ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {processResponseData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    {Object.keys(row).map((key) => (
                                                        <td key={key} className="border px-4 py-2 break-all">
                                                            {row[key]}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={() => setIsProcessModalOpen(false)}
                                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                        Close
                                    </button>
                                </div>
                            </DialogPanel>
                        </div>
                    </Dialog>
                )
            }


            {
                accountClouserOpen && (
                    <div className="fixed inset-0 flex items-center justify-center z-400" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                        <div className="bg-white rounded-lg py-3 w-full max-w-[85vw] overflow-y-auto min-h-[70vh] max-h-[75vh]">
                            <div className="flex justify-end items-center pr-4 mb-2">
                                <button
                                    onClick={() => {
                                        setAccountClosureOpen(false);
                                    }}
                                    style={{
                                        backgroundColor: colors.buttonBackground,
                                        color: colors.buttonText,
                                    }}
                                    className="px-4 py-1 rounded-lg ml-4"

                                >
                                    Close
                                </button>
                            </div>
                            <div className="mt-4 border-t-2 border-solid p-4">
                                <AccountClosure accountClouserOpen={accountClouserOpen} accountClouserDataPass={accountClouserDataPass} />
                            </div>
                        </div>
                    </div>
                )
            }


        </>
    );
};

export default EditTableRowModal;
