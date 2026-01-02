"use client";
import React from 'react';
import { useTheme } from "@/context/ThemeContext";
import { EkycComponentProps } from '@/types/EkycFormTypes';
import { DataGrid } from 'react-data-grid';
import { IoArrowBack } from 'react-icons/io5';
import { handleSaveSinglePageData } from '../ekychelper';
import { useSaveLoading } from '@/context/SaveLoadingContext';
import { getLocalStorage } from '@/utils/helper';

const Segment = ({ formFields, tableData, setFieldData, setActiveTab, Settings }: EkycComponentProps) => {
  const { colors, fonts } = useTheme();
  const { setSaving } = useSaveLoading();
  const viewMode = getLocalStorage("ekyc_viewMode") === "true" || getLocalStorage("ekyc_viewMode_for_checker") === "true";


  // Handler to update the segment tableData
  const handleSegmentUpdate = (id: string, fieldKey: string, value: string) => {
    setFieldData((prevState: any) => {
      // Create a copy of the previous state
      const newState = { ...prevState };

      // Find and update the specific row in segmentTabData
      newState.segmentTabData = {
        ...newState.segmentTabData,
        tableData: newState.segmentTabData.tableData.map((row: any) =>
          row.SegmentValue === id ? { ...row, [fieldKey]: value } : row
        )
      };

      return newState;
    });
  };

  // Dynamically create columns from formFields
  const columns = formFields.map((field) => {
    const baseColumn = {
      key: field.wKey,
      name: field.label,
      sortable: true,
    };

    // Special handling for checkbox fields
    if (field.type === 'WCheckBox') {
      return {
        ...baseColumn,
        renderCell: ({ row }: any) => (
          <input
            type="checkbox"
            disabled={viewMode}
            checked={row[field.wKey] === "true"}
            onChange={(e) => {
              const newValue = e.target.checked ? "true" : "false";
              handleSegmentUpdate(row.SegmentValue, field.wKey, newValue);
            }}
            className="h-4 w-4"
            aria-label={`${field.label} for segment ${row.SegmentValue}`}
          />
        )
      };
    }

    return baseColumn;
  });

  // Add unique IDs to rows based on SegmentValue
  const rows = tableData.map((item) => ({
    ...item,
    id: item.SegmentValue // Using SegmentValue as unique identifier
  }));


  const handleSaveAndNext = () => {
    // Perform validation checks here   
    handleSaveSinglePageData(Settings.SaveNextAPI, tableData, setActiveTab, "attachments", setSaving)
    // setActiveTab("attachments")
  }

  const handleNext = () => {
    setActiveTab("attachments")
  }


  return (
    <div className="w-full p-5 pt-2 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-2">
        <button
          className="rounded-lg px-4 py-1"
          style={{
            backgroundColor: colors.background,
            border: `1px solid ${colors.buttonBackground}`,
          }}
          type="button"
          aria-label="Back to demat tab"
          onClick={() => setActiveTab("demat")}
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
              className="rounded-lg ml-4 px-4 py-1"
              style={{
                backgroundColor: colors.background,
                border: `1px solid ${colors.buttonBackground}`,
              }}
              onClick={handleSaveAndNext}
            >
              Save and Next
            </button>
          </div>
        )}
      </div>
      <DataGrid
        columns={columns}
        rows={rows}
        className="rdg-light"
        rowHeight={40}
        headerRowHeight={40}
        style={{
          backgroundColor: colors.background,
          color: colors.text,
          fontFamily: fonts.content,
        }}
        rowKeyGetter={(row) => row.id}
      />
    </div>
  );
};

export default Segment;