import EkycEntryForm from '@/components/component-forms/EkycEntryForm';
import { EkycComponentProps } from '@/types/EkycFormTypes';
import React, { useEffect, useState } from 'react'
import { fetchEkycDropdownOptions, handleSaveSinglePageData } from '../ekychelper';
import CaseConfirmationModal from '@/components/Modals/CaseConfirmationModal';
import { useTheme } from '@/context/ThemeContext';
import { toast } from 'react-toastify';
import { useSaveLoading } from '@/context/SaveLoadingContext';


const Personal = ({ formFields, tableData, fieldErrors, setFieldData, setActiveTab, Settings }: EkycComponentProps) => {

    const { colors } = useTheme();
    const viewMode = localStorage.getItem("ekyc_viewMode") === "true" || localStorage.getItem("ekyc_viewMode_for_checker") === "true" ;

    const { setSaving } = useSaveLoading();
    const [localFormData, setLocalFormData] = useState<any>(formFields || {});
    const [personalDropdownOptions, setPersonalDropdownOptions] = useState<Record<string, any[]>>({});
    const [personalLoadingDropdowns, setPersonalLoadingDropdowns] = useState<Record<string, boolean>>({});
    const [fieldVlaues, setFieldValues] = useState<Record<string, any>>(tableData[0] || {});

    const [personalFieldErrors, setPersonalFieldErrors] = useState<Record<string, string>>({});
    const [validationModal, setValidationModal] = useState<{
        isOpen: boolean;
        message: string;
        type: 'M' | 'S' | 'E' | 'D';
        callback?: (confirmed: boolean) => void;
    }>({ isOpen: false, message: '', type: 'M' });

    useEffect(() => {
        if (formFields && formFields.length > 0) {
            formFields.forEach((field) => {
                if (field.wQuery && field.wKey) {
                    // Fetch dropdown options for each field with a query
                    fetchEkycDropdownOptions(field, setPersonalDropdownOptions, setPersonalLoadingDropdowns);
                }
            })
        }
    }, [])

    // Validate mandatory fields for nominee
    const validateMandatoryFields = (formData: any) => {
        const errors: Record<string, string> = {};
        let isValid = true;
        formFields.forEach((field) => {
            if (field.isMandatory === "true" && !formData[field.wKey]) {
                errors[field.wKey] = `${field.label} is required`;
                isValid = false;
            }
        });
        return { isValid, errors };
    };

    const handleSaveAndNext = () => {
        const { isValid, errors } = validateMandatoryFields(fieldVlaues);
        const localPersonalData : any = [fieldVlaues];
        setPersonalFieldErrors(errors);
        if (!isValid) {
            toast.error("Please fill all mandatory fields");
            return;
        } else {
            setFieldData((prevState: any) => {
                const prevTableData = prevState.personalTabData.tableData || [];
                return {
                    ...prevState,
                    personalTabData: {
                        ...prevState.personalTabData,
                        tableData: [
                            {
                                ...fieldVlaues,
                                IsInserted: "true"
                            },
                            ...prevTableData.slice(1)
                        ]
                    }
                };
            })
            handleSaveSinglePageData(Settings.SaveNextAPI, localPersonalData, setActiveTab, "nominee", setSaving)
            // setActiveTab("nominee")
        }
    }
    const handleNext = () => {
        setActiveTab("nominee")
    }

    return (
        <div className="w-full p-5 pt-2 bg-white rounded-lg shadow-md">
            <div className="text-end">
                {viewMode ? (
                    <button
                        className="rounded-lg px-4 py-1"
                        style={{
                            backgroundColor: colors.background,
                            border: `1px solid ${colors.buttonBackground}`,
                        }}
                        onClick={handleNext}
                    >
                        Next
                    </button>
                ) : (
                    <button
                        className="rounded-lg px-4 py-1"
                        style={{
                            backgroundColor: colors.background,
                            border: `1px solid ${colors.buttonBackground}`,
                        }}
                        onClick={handleSaveAndNext}
                    >
                        Save and Next
                    </button>
                )}
            </div>
            <CaseConfirmationModal
                isOpen={validationModal.isOpen}
                message={validationModal.message}
                type={validationModal.type}
                onConfirm={() => validationModal.callback?.(true)}
                onCancel={() => validationModal.callback?.(false)}
            />
            <EkycEntryForm
                formData={localFormData}
                formValues={fieldVlaues || {}}
                masterValues={{}}
                setFormValues={setFieldValues}
                onDropdownChange={() => { }}
                dropdownOptions={personalDropdownOptions}
                loadingDropdowns={personalLoadingDropdowns}
                fieldErrors={personalFieldErrors}
                setFieldErrors={setPersonalFieldErrors}
                setFormData={setLocalFormData}
                setValidationModal={setValidationModal}
                setDropDownOptions={() => { }}
                viewMode={viewMode}
            />
        </div>
    )
}

export default Personal