import React from 'react';
import { toast } from 'react-toastify';
import { MdOutlineClose } from "react-icons/md";
import Button from '../ui/button/Button';
import EntryForm from '../component-forms/EntryForm';
import { GuardianEntryModalProps, GroupedFormData } from '@/types';
import { groupFormData, validateForm } from '../component-forms/form-helper/utils';

const GuardianEntryForm: React.FC<GuardianEntryModalProps> = ({
    colors,
    onClose,
    masterValues,
    formData,
    formValues,
    setFormValues,
    dropdownOptions,
    loadingDropdowns,
    onDropdownChange,
    fieldErrors,
    setFieldErrors,
    setFormData,
    resetChildForm,
    isEdit,
    onChildFormSubmit,
    setValidationModal,
    viewAccess,
    isLoading,
    setDropDownOptions,
}) => {
    const isChildInvalid = Object.values(fieldErrors).some(error => error);

    const handleFormSubmit = () => {
        const childErrors = validateForm(formData, formValues);

        if (Object.keys(childErrors).length > 0) {
            setFieldErrors({ ...childErrors });
            toast.error("Please fill all mandatory fields before submitting.");
            return;
        } else {
            onChildFormSubmit();
        }

    }

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-500`} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-lg p-6 w-full max-w-[80vw] overflow-y-auto min-h-[75vh] max-h-[75vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">{viewAccess ? "Guardian Details" : isEdit ? "Edit Guardian Details" : "Add Guardian Details"}</h2>
                    <Button
                        className={`flex items-center text-white`}
                        onClick={onClose}>
                        <MdOutlineClose /> Close
                    </Button>

                </div>
                {isLoading ? (
                    <div className="text-center py-4">Loading...</div>
                ) : (
                    <>
                        <div className="text-end mt-1 mb-2">
                            <Button
                                onClick={resetChildForm}
                                className={`mr-2 ${viewAccess
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                disabled={viewAccess}
                            >
                                Reset
                            </Button>
                            <Button
                                onClick={handleFormSubmit}
                                disabled={viewAccess || isChildInvalid}
                                className={`${(viewAccess || isChildInvalid)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                    }`}
                            >
                                Submit
                            </Button>
                        </div>
                        <div>
                            {(() => {
                                const groupedFormData: GroupedFormData[] = groupFormData(
                                    formData,
                                    true
                                );
                                return (
                                    <div>
                                        {groupedFormData.map((group, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    border: group.groupName ? `1px solid ${colors.textInputBorder}` : "none",
                                                    borderRadius: "6px",
                                                    padding: group.groupName ? "12px" : "0",
                                                    marginBottom: "16px",
                                                }}
                                            >
                                                {group.groupName && (
                                                    <h6
                                                        style={{
                                                            marginBottom: "10px",
                                                            fontWeight: "bold",
                                                            background: `${colors.background}`,
                                                            padding: "6px 10px",
                                                            borderRadius: "4px",
                                                            fontSize: "14px"
                                                        }}
                                                    >
                                                        {group.groupName}
                                                    </h6>
                                                )}

                                                <EntryForm
                                                    formData={group.fields}
                                                    formValues={formValues}
                                                    masterValues={masterValues}
                                                    setFormValues={setFormValues}
                                                    dropdownOptions={dropdownOptions}
                                                    loadingDropdowns={loadingDropdowns}
                                                    onDropdownChange={onDropdownChange}
                                                    fieldErrors={fieldErrors}
                                                    setFieldErrors={setFieldErrors}
                                                    setFormData={setFormData}
                                                    setValidationModal={setValidationModal}
                                                    setDropDownOptions={setDropDownOptions}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GuardianEntryForm;
