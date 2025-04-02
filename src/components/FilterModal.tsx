"use client";
import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import FormCreator from './FormCreator';
import Select from 'react-select';
import { FaSort, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    filters: any[];
    onFilterChange: (values: any) => void;
    initialValues: Record<string, any>;
    sortableFields?: Array<{ label: string; value: string }>;
    currentSort?: { field: string; direction: string };
    onSortChange?: (sortConfig: { field: string; direction: string }) => void;
    isSortingAllowed?: boolean;
    onApply: () => void;
    isDownload?: boolean;
}

const FilterModal: React.FC<FilterModalProps> = ({
    isOpen,
    onClose,
    title,
    filters,
    onFilterChange,
    initialValues,
    sortableFields = [],
    currentSort,
    onSortChange,
    isSortingAllowed = false,
    onApply,
    isDownload = false
}) => {
    const { colors } = useTheme();
    // Add local state to store filter values
    const [localFilterValues, setLocalFilterValues] = useState(initialValues);

    // Reset local values when modal opens with new initial values
    useEffect(() => {
        setLocalFilterValues(initialValues);
    }, [initialValues, isOpen]);

    // Handle local form changes
    const handleLocalFilterChange = (values: any) => {
        console.log('Local filter change in modal:', values);
        setLocalFilterValues(values);
    };

    // Handle apply button click
    const handleApply = () => {
        onFilterChange(localFilterValues); // Send final values to parent
        onClose(); // Close the modal
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            className="relative z-50"
        >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex justify-end">
                <Dialog.Panel
                    className="h-full w-full max-w-md overflow-y-auto p-6 transition-transform duration-300 ease-in-out"
                    style={{
                        backgroundColor: colors.filtersBackground,
                        transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
                    }}
                >


                    <div className="overflow-visible">
                        {/* Form Creator */}
                        <div className='h-20'></div>
                        <div>{title}</div>
                        <FormCreator
                            formData={filters || [[]]}
                            onFilterChange={handleLocalFilterChange}
                            initialValues={localFilterValues}
                        />
                        {/* <div className='h-50'></div> */}
                        {/* Download Buttons */}
                        {isDownload && (
                            <div className="flex justify-around mt-4">
                                {['CSV', 'PDF'].map((type) => (
                                    <button
                                        key={type}
                                        className="px-4 py-2 rounded flex flex-col items-center"
                                        style={{ backgroundColor: colors.buttonBackground }}
                                        onClick={() => {/* Handle download */ }}
                                    >
                                        <i className={`fa fa-file-${type}-o text-xl`} />
                                        <span className="mt-1" style={{ color: colors.buttonText }}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {!isDownload && (
                        <div className="mt-4 flex justify-between">
                            <button
                                className="px-4 py-2 rounded"
                                style={{ backgroundColor: colors.buttonBackground }}
                                onClick={onClose}
                            >
                                <span style={{ color: colors.buttonText }}>Cancel</span>
                            </button>
                            <button
                                className="px-4 py-2 rounded"
                                style={{ backgroundColor: colors.buttonBackground }}
                                onClick={handleApply}
                            >
                                <span style={{ color: colors.buttonText }}>Apply</span>
                            </button>
                        </div>
                    )}
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default FilterModal; 