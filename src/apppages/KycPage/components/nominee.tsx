'use client'
import EkycEntryForm from '@/components/component-forms/EkycEntryForm';
import { EkycComponentProps } from '@/types/EkycFormTypes';
import React, { useEffect, useState } from 'react';
import { DataGrid } from 'react-data-grid';
import { useTheme } from "@/context/ThemeContext";
import { fetchEkycDropdownOptions, handleSaveSinglePageData } from '../ekychelper';
import CaseConfirmationModal from '@/components/Modals/CaseConfirmationModal';
import moment from 'moment';
import { useAppSelector } from '@/redux/hooks';
import { selectAllMenuItems } from '@/redux/features/menuSlice';
import { findPageData, getLocalStorage } from '@/utils/helper';
import { ACTION_NAME, BASE_URL, PATH_URL } from '@/utils/constants';
import { toast } from 'react-toastify';
import { IoArrowBack } from "react-icons/io5";
import { useSaveLoading } from '@/context/SaveLoadingContext';
import apiService from '@/utils/apiService';

const Nominee = ({ formFields, tableData, setFieldData, setActiveTab, Settings }: EkycComponentProps) => {
  const { colors, fonts } = useTheme();
  const { setSaving } = useSaveLoading();
  const viewMode1 = getLocalStorage("ekyc_viewMode") === "true";
  const viewMode2 = getLocalStorage("ekyc_viewMode_for_checker") === "true";
  const viewMode = viewMode1 || viewMode2;
  const [localFormData, setLocalFormData] = useState<any>(formFields || {});

  const [openAddNominee, setOpenAddNominee] = useState(false);
  const [currentFormData, setCurrentFormData] = useState<any>({});
  const [nomineeDropdownOptions, setNomineeDropdownOptions] = useState<Record<string, any[]>>({});
  const [nomineeLoadingDropdowns, setNomineeLoadingDropdowns] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    message: string;
    type: 'M' | 'S' | 'E' | 'D';
    callback?: (confirmed: boolean) => void;
  }>({ isOpen: false, message: '', type: 'M' });
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isMinor, setIsMinor] = useState(false);
  const [showGuardianForm, setShowGuardianForm] = useState(false);
  const [guardianFormData, setGuardianFormData] = useState<any>({});
  const [guardianFormDataBackUp, setGuardianFormDataBackUp] = useState<any>({});

  const [guardianFields, setGuardianFields] = useState<any>([]);
  const [guardianDropdownOptions, setGuardianDropdownOptions] = useState<Record<string, any[]>>({});
  const [guardianLoadingDropdowns, setGuardianLoadingDropdowns] = useState<Record<string, boolean>>({});
  const [guardianFieldErrors, setGuardianFieldErrors] = useState<Record<string, string>>({});
  const [showChildForm, setShowChildForm] = useState(false)
  const menuItems = useAppSelector(selectAllMenuItems);
  const pageData: any = findPageData(menuItems, "rekyc");

  // Generate dynamic columns based on formFields
  const generateDynamicColumns = () => {
    const baseColumns: any[] = formFields
      .filter(field => field.isVisibleinTable !== "false") // Only include fields marked as visible
      .map(field => {
        // Special handling for date fields
        if (field.type === 'WDateBox') {
          return {
            key: field.wKey,
            name: field.label,
            sortable: false,
            renderCell: ({ row }: any) => (
              <span style={{
                color: row?.IsInserted === "true" || row?.IsModified === "true" ? '#006400' : 'inherit'
              }}>
                {row[field.wKey] ? moment(row[field.wKey], 'YYYYMMDD').format('DD/MM/YYYY') : ''}
              </span>
            )
          };
        }

        // Default column configuration for other field types
        return {
          key: field.wKey,
          name: field.label,
          sortable: false,
          renderCell: ({ row }: any) => (
            <span style={{
              color: row?.IsInserted === "true" || row?.IsModified === "true" ? '#006400' : 'inherit'
            }}>
              {row[field.wKey]}
            </span>
          )
        };
      });

    // Add actions column
    baseColumns.push({
      key: 'actions',
      name: 'Actions',
      sortable: false,
      renderCell: (props: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditNomineeClick(props.row, props.rowIdx)}
            className="px-2 py-1 rounded-lg"
            style={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.buttonBackground}`,
              color: props?.row?.IsInserted === "true" || props?.row?.IsModified === "true" ? '#006400' : 'inherit'
            }}
          >
            {viewMode ? "View" : "Edit"}
          </button>
        </div>
      )
    });

    return baseColumns;
  };
  const createNewNomineeEntry = () => {
    const newEntry: Record<string, any> = {};

    formFields.forEach((field: any) => {
      if (field.wKey) {
        switch (field.type) {
          case 'WCheckBox':
            newEntry[field.wKey] = "false";
            break;
          case 'WDropDownBox':
            newEntry[field.wKey] = "";
            break;
          default:
            newEntry[field.wKey] = "";
        }
      }
    });

    newEntry.IsNomineeDeleted = "false";
    newEntry.IsInserted = "true";
    return newEntry;
  };

  const handleAddNomineeClick = () => {
    const maxAllowed = Number(Settings?.maxAllowedRecords) || 0;
    if (maxAllowed > 0 && tableData?.length >= maxAllowed) {
      toast.error(`You can only add up to ${maxAllowed} nominees.`);
      return;
    } else {
      const newNomineeEntry = createNewNomineeEntry();
      setCurrentFormData(newNomineeEntry);
      setIsEditing(false);
      setEditIndex(null);
      setOpenAddNominee(true);
      setShowGuardianForm(false);
      setIsMinor(false);
      setFieldErrors({});
      setGuardianFieldErrors({});
    }
  };

  const handleEditNomineeClick = (row: any, rowIndex: number) => {
    setCurrentFormData({ ...row, IsModified: "true" });
    setGuardianFormData(row.GuardianDetails || {});
    setIsEditing(true);
    setEditIndex(rowIndex);
    setOpenAddNominee(true);
    setShowGuardianForm(!!row.GuardianDetails);
    checkIfMinor(row.NomineeDOB);
    setFieldErrors({});
    setGuardianFieldErrors({});
    if (Object.keys(row.GuardianDetails || {}).length) {
      setShowChildForm(true)
    }
  };

  const checkIfMinor = (dob: string) => {
    if (!dob) {
      setIsMinor(false);
      return false;
    }

    const birthDate = moment(dob, 'YYYYMMDD');
    if (!birthDate.isValid()) {
      setIsMinor(false);
      return false;
    }

    const age = moment().diff(birthDate, 'years');
    const minor = age < 18;
    setIsMinor(minor);
    return minor;
  };

  const validateMandatoryFields = (formData: any) => {
  const errors: Record<string, string> = {};
  let isValid = true;

  formFields.forEach((field) => {
    if (field.isMandatory === "true") {
      const value = formData[field.wKey];
      let isEmpty = false;
      // Handle different field types
      if (field.type === 'WCheckBox') {
        // For checkboxes, check if it has a valid value
        isEmpty = value !== "true" && value !== "false";
      } 
      else if (field.type === 'WDropDownBox') {
        // For dropdowns, empty string is invalid
        isEmpty = !value || value?.trim() === "";
      }
      else if (typeof value === 'string') {
        // For text fields, trim whitespace
        isEmpty = !value.trim();
      }
      else {
        // For other types
        isEmpty = !value;
      }
      if (isEmpty) {
        errors[field.wKey] = `${field.label} is required`;
        isValid = false;
      }
    }
  });

  return { isValid, errors };
};
             
  const validateGuardianMandatoryFields = (formData: any) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    guardianFields.forEach((field: any) => {
      if (field.isMandatory === "true" && !formData[field.wKey]) {
        errors[field.wKey] = `${field.label} is required`;
        isValid = false;
      }
    });

    return { isValid, errors };
  };

  const handleSaveNominee = () => {
    const { isValid, errors } = validateMandatoryFields(currentFormData);
    setFieldErrors(errors);

    if (!isValid) {
      return;
    }

    const isMinorNominee = checkIfMinor(currentFormData.NomineeDOB);

    if (isMinorNominee && !showGuardianForm) {
      toast.error('Nominee is a minor. Please add guardian details before saving.')
      return;
    }

    if (showGuardianForm) {
      const { isValid: isGuardianValid, errors: guardianErrors } = validateGuardianMandatoryFields(guardianFormData);
      setGuardianFieldErrors(guardianErrors);

      if (!isGuardianValid) {
        toast.error("Please fill all mandatory guardian details before saving.")
        return;
      }
    }

    // NOTE :- use this when you want to include the empty keys from original form
    const nomineeData = {
      ...currentFormData,
      GuardianDetails: showGuardianForm ? {
        ...guardianFormData, // start with form data
        ...Object.fromEntries(
          Object.entries(guardianFormDataBackUp)
            .filter(([key]) => !(key in guardianFormData) || guardianFormData[key] === "")
        )
      } : null
    };

    // const nomineeData = {
    //   ...currentFormData,
    //   GuardianDetails: showGuardianForm ? guardianFormData : null
    // };

    if (isEditing && editIndex !== null) {
      setFieldData((prevState: any) => {
        const prevTableData = [...(prevState.nomineeTabData.tableData || [])];
        prevTableData[editIndex] = nomineeData;

        return {
          ...prevState,
          nomineeTabData: {
            ...prevState.nomineeTabData,
            tableData: prevTableData
          }
        };
      });
    } else {
      setFieldData((prevState: any) => {
        const prevTableData = prevState.nomineeTabData.tableData || [];
        return {
          ...prevState,
          nomineeTabData: {
            ...prevState.nomineeTabData,
            tableData: [
              ...prevTableData,
              nomineeData
            ]
          }
        };
      });
    }
    clearFormAndCloseModal();
  };

  const toggleGuardianForm = () => {
    setShowGuardianForm(!showGuardianForm);
    if (showGuardianForm) {
      setGuardianFieldErrors({});
    }
  };

  const clearFormAndCloseModal = () => {
    setCurrentFormData({});
    setGuardianFormData(guardianFormDataBackUp);
    setFieldErrors({});
    setGuardianFieldErrors({});
    setShowGuardianForm(false);
    setIsMinor(false);
    setIsEditing(false);
    setEditIndex(null);
    setOpenAddNominee(false);
    setShowChildForm(false);
  };



  const fetchFormData = async () => {
    try {
      const entry = pageData[0].Entry;
      const childEntry = entry.ChildEntry;

      const userData = getLocalStorage("rekycRowData_viewMode");
      const clientCode1 = getLocalStorage("clientCode");
      const clientCode2 = getLocalStorage("userId");
      const parsedUserData = userData ? JSON.parse(userData) : null;
      const payload = !viewMode ? childEntry.X_Filter : {
        EntryName: parsedUserData?.EntryName || "Rekyc",
        ClientCode: parsedUserData?.ClientCode || clientCode1 || clientCode2,
        NomSerial: ''
      }

      let xFilter = '';
      Object.entries(payload).forEach(([key, value]) => {
        if (key === 'NomSerial') {
          xFilter += `<${key}></${key}>`;
        } else {
          xFilter += `<${key}>${value}</${key}>`;
        }
      });

      const xmlData = `<dsXml>
                <J_Ui>"ActionName":"${ACTION_NAME}","Option":"ChildEntry"</J_Ui>
                <Sql></Sql>
                <X_Filter>${xFilter}</X_Filter>
                <J_Api>"UserId":"${getLocalStorage('userId') || 'ADMIN'}","AccYear":"${getLocalStorage('accYear') || '24'}","MyDbPrefix":"${getLocalStorage('myDbPrefix') || 'undefined'}","MemberCode":"${getLocalStorage('memberCode') || ''}","SecretKey":"${getLocalStorage('secretKey') || ''}","MenuCode":"${getLocalStorage('menuCode') || 27}","ModuleID":"${getLocalStorage('moduleID') || '27'}","MyDb":"${getLocalStorage('myDb') || 'undefined'}","DenyRights":"${getLocalStorage('denyRights') || ''}"</J_Api>
            </dsXml>`;

      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
      const formData = response?.data?.data?.rs0[0].Data || [];

      setGuardianFields(formData)
      const initialValues: Record<string, any> = {};
      formData.forEach((field: any) => {
        if (field.type === 'WDateBox' && field.wValue) {
          initialValues[field.wKey] = moment(field.wValue).format('YYYYMMDD');
        } else {
          initialValues[field.wKey] = '';
        }
      });
      setGuardianFormData(initialValues);
      setGuardianFormDataBackUp(initialValues)
    } catch (error) {
      console.error('Error fetching childEntry data:', error);
    }
  };

  useEffect(() => {
    if (formFields && formFields.length > 0) {
      formFields.forEach((field) => {
        if (field.wQuery && field.wKey) {
          fetchEkycDropdownOptions(field, setNomineeDropdownOptions, setNomineeLoadingDropdowns);
        }
      });
    }
  }, [formFields]);

  useEffect(() => {
    if (guardianFields && guardianFields.length > 0) {
      guardianFields.forEach((field: any) => {
        if (field.wQuery && field.wKey) {
          fetchEkycDropdownOptions(field, setGuardianDropdownOptions, setGuardianLoadingDropdowns);
        }
      });
    }
  }, [guardianFields]);

  useEffect(() => {
    if (pageData?.[0]?.Entry) {
      fetchFormData()
    }
  }, [pageData])

  useEffect(() => {
    const newEntry = createNewNomineeEntry();
    if (Object.keys(currentFormData).length === 0) {
      setCurrentFormData(newEntry);
    }
  }, [])

  const handleSaveAndNext = () => {
    if (tableData?.length === 0) {
      setActiveTab("bank")
    } else {
      const transformedData = tableData?.map((item: any) => ({
        ...item,
        ...(item?.NomSerial && { IsInserted: "false" })
      }));
      handleSaveSinglePageData(Settings.SaveNextAPI, transformedData, setActiveTab, "bank", setSaving);
    }
  }

  const handleNext = () => {
    setActiveTab("bank")
  }

  return (
    <div className="w-full p-5 pt-2 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-2">
        <button
          className="px-4 py-1 rounded-lg"
          style={{
            backgroundColor: colors.background,
            border: `1px solid ${colors.buttonBackground}`,
          }}
          type="button"
          aria-label="Back to personal tab"
          onClick={() => setActiveTab("personal")}
        >
          <IoArrowBack size={20} />
        </button>
        {viewMode ? (
          <div className="text-end">

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
          </div>
        ) : (
          <div className="text-end">
            <button
              onClick={handleAddNomineeClick}
              style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
              className="px-4 py-1 rounded-lg"
            >
              Add Nominee
            </button>
            <button
              className="px-4 py-1 rounded-lg ml-4"
              style={{
                backgroundColor: colors.background,
                border: `1px solid ${colors.buttonBackground}`
              }}
              onClick={handleSaveAndNext}
            >
              Save and Next
            </button>
          </div>
        )}

      </div>
      <DataGrid
        columns={generateDynamicColumns()}
        rows={tableData || []}
        className="rdg-light"
        rowHeight={40}
        headerRowHeight={40}
        style={{
          backgroundColor: colors.background,
          color: colors.text,
          fontFamily: fonts.content,
        }}
      />

      {openAddNominee && (
        <div className="fixed inset-0 flex items-center justify-center z-[200]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center gap-4 mt-2 mb-4">
              <h4 className="text-xl font-semibold">
                {viewMode ? "Nominee Details" : isEditing ? 'Edit Nominee Details' : 'Add Nominee Details'}
              </h4>
              <div className="flex gap-4">
                <button
                  onClick={clearFormAndCloseModal}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                {!viewMode && (
                  <button
                    onClick={handleSaveNominee}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                  >
                    {isEditing ? 'Update' : 'Save'}
                  </button>
                )}
              </div>
            </div>
            {isMinor && !showGuardianForm && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                <p>Nominee is a minor. Please add guardian details.</p>
              </div>
            )}
            <CaseConfirmationModal
              isOpen={validationModal.isOpen}
              message={validationModal.message}
              type={validationModal.type}
              onConfirm={() => validationModal.callback?.(true)}
              onCancel={() => validationModal.callback?.(false)}
            />

            <EkycEntryForm
              formData={localFormData}
              formValues={currentFormData}
              masterValues={{}}
              setFormValues={(newValues) => {
                setCurrentFormData(newValues);
              }}
              onDropdownChange={() => undefined}
              dropdownOptions={nomineeDropdownOptions}
              loadingDropdowns={nomineeLoadingDropdowns}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
              setFormData={setLocalFormData}
              setValidationModal={setValidationModal}
              setDropDownOptions={() => undefined}
              viewMode={viewMode}
            />

            {(isMinor || showChildForm) && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold">Guardian Details</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={toggleGuardianForm}
                      disabled={viewMode}
                      className={`px-4 py-2 rounded-md ${showGuardianForm ? 'bg-gray-500 hover:bg-gray-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                    >
                      {showGuardianForm ? 'Remove Guardian' : 'Add Guardian'}
                    </button>
                    {showGuardianForm && (
                      <button
                        className={`px-4 py-2 rounded-md ${showGuardianForm ? 'bg-gray-500 hover:bg-gray-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                        onClick={() => setGuardianFormData(guardianFormDataBackUp)}
                        disabled={viewMode}
                      >
                        Reset Form
                      </button>
                    )}
                  </div>
                </div>
                {showGuardianForm && (
                  <div className="border-t pt-4">
                    <EkycEntryForm
                      formData={guardianFields}
                      formValues={guardianFormData}
                      masterValues={{}}
                      setFormValues={setGuardianFormData}
                      onDropdownChange={() => undefined}
                      dropdownOptions={guardianDropdownOptions}
                      loadingDropdowns={guardianLoadingDropdowns}
                      fieldErrors={guardianFieldErrors}
                      setFieldErrors={setGuardianFieldErrors}
                      setFormData={setGuardianFields}
                      setValidationModal={setValidationModal}
                      setDropDownOptions={setGuardianDropdownOptions}
                      viewMode={viewMode}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Nominee;