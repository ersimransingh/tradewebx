export interface EntryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    pageData: any;
    editData?: any;
    action?: 'edit' | 'delete' | 'view' | null;
    setEntryEditData?: React.Dispatch<React.SetStateAction<any>>;
    refreshFunction?: () => void;
    isTabs?: boolean;
    childModalZindex?: string;
    parentModalZindex?: string;
    pageName?: string;
}

export interface ApiResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export interface TabSettings {
    isTable: string;
    isGroup?: string;
    MakerSaveAPI? : any;
    IsChildEntryAllowed?: string;
    ChildEntryAPI?: any;
    maxAllowedRecords: string;
    EditValidate?: any;
    SaveNextAPI: {
        J_Ui: {
            ActionName: string;
            Option: string;
        };
        Sql: any;
        X_Filter_Multiple: any;
        X_DataJson: string;
        J_Api: {
            UserId: string;
        };
    };
}

export interface TabData {
    TabName: string;
    tableData: any[];
    Settings: TabSettings;
    Data: FormField[];
}

export interface FormField {
    Srno: number;
    type: string;
    label: string;
    isBR?: string;
    isUpper?: string;
    fieldJustUpdated?:string;
    isChangeColumn?:string;
    FieldVisibleTag?:string;
    CombinedName?: string;
    childDependents?: string[];
    wKey: string;
    FieldSize: string;
    iscreatable: string;
    FieldType: string;
    ValidationAPI: any;
    FieldEnabledTag: string;
    FieldWidth?: string;
    FieldRows?: string;
    isMandatory?: string;
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

export interface EntryFormProps {
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
    setValidationModal: React.Dispatch<React.SetStateAction<{
        isOpen: boolean;
        message: string;
        type: 'M' | 'S' | 'E' | 'D';
        callback?: (confirmed: boolean) => void;
    }>>;
    setDropDownOptions: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
    validationMethodToModifyTabsForm?: (param: any) => void;
    contextData?: Record<string, any>;
}

export interface ChildEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    pageName?: string;
    masterValues: Record<string, any>;
    formData: FormField[];
    masterFormData: FormField[];
    formValues: Record<string, any>;
    setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    dropdownOptions: Record<string, any[]>;
    loadingDropdowns: Record<string, boolean>;
    onDropdownChange?: (key: string, value: any) => void;
    fieldErrors: Record<string, string>;
    setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    resetChildForm: () => void;
    isEdit: boolean;
    onChildFormSubmit: () => void;
    setValidationModal: React.Dispatch<React.SetStateAction<{
        isOpen: boolean;
        message: string;
        type: 'M' | 'S' | 'E' | 'D';
        callback?: (confirmed: boolean) => void;
    }>>;
    viewAccess: boolean;
    isLoading: boolean;
    setChildEntriesTable: React.Dispatch<React.SetStateAction<any[]>>;
    setDropDownOptions: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
    childModalZindex?: string;
}

export interface TabData {
  Settings: TabSettings;
  Data: FormField[];
}

export interface GroupedFormData {
  groupName: string;
  fields: FormField[];
}

export interface GuardianEntryModalProps {
 colors: any;  
 isOpen: boolean;
    onClose: () => void;
    masterValues?: Record<string, any>;
    formData?: FormField[];
    masterFormData?: FormField[];
    formValues?: Record<string, any>;
    setFormValues?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    dropdownOptions?: Record<string, any[]>;
    loadingDropdowns?: Record<string, boolean>;
    onDropdownChange?: (key: string, value: any) => void;
    fieldErrors?: Record<string, string>;
    setFieldErrors?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setFormData?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    resetChildForm?: () => void;
    isEdit?: boolean;
    onChildFormSubmit?: () => void;
    setValidationModal?: React.Dispatch<React.SetStateAction<{
        isOpen: boolean;
        message: string;
        type: 'M' | 'S' | 'E' | 'D';
        callback?: (confirmed: boolean) => void;
    }>>;
    viewAccess?: boolean;
    isLoading?: boolean;
    setChildEntriesTable?: React.Dispatch<React.SetStateAction<any[]>>;
    setDropDownOptions?: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
    childModalZindex?: string;

}