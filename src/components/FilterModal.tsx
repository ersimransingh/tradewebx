"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import FormCreator from './FormCreator';
import { useTheme } from '@/context/ThemeContext';
import { useSidebar } from '@/context/SidebarContext';

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
    onApply?: (values?: any) => void;
    isDownload?: boolean;
    totalRecords?: number;   // <-- NEW PROP for NVDA announcement
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
    isDownload = false,
    totalRecords = 0        // <-- default 0 records
}) => {
    const { colors } = useTheme();
    // Add local state to store filter values
    const [localFilterValues, setLocalFilterValues] = useState(initialValues);
    const [resetKey, setResetKey] = useState<number>(Date.now());
    const { toggleMobileSidebar } = useSidebar();
    const [shouldAnnounce, setShouldAnnounce] = useState(false);
    const [panelViewportHeight, setPanelViewportHeight] = useState<number | null>(null);
    const [panelViewportOffsetTop, setPanelViewportOffsetTop] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);

    // Reset local values when modal opens with new initial values
    useEffect(() => {
        setLocalFilterValues(initialValues);
    }, [initialValues, isOpen]);

    // Handle local form changes
    const handleLocalFilterChange = (values: any) => {
        setLocalFilterValues(values);
    };

    useEffect(() => {
    if (!shouldAnnounce) return;  // Only announce after Apply
    

    const liveRegion = document.getElementById("nvda_global_message");
    if (!liveRegion) return;
    // Clear old text
    liveRegion.textContent = "";

    // Speak AFTER state updates
    setTimeout(() => {
        const message =
            totalRecords > 0
                ? `Data available. Total records are ${totalRecords}.`
                : "No data available.";

        liveRegion.textContent = message;
    }, 50);

    // Reset flag so it only fires once
    setShouldAnnounce(false);

}, [totalRecords]);

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined') {
            return;
        }

        const updateViewportMetrics = () => {
            const visualViewport = window.visualViewport;
            setPanelViewportHeight(Math.round(visualViewport?.height ?? window.innerHeight));
            setPanelViewportOffsetTop(Math.round(visualViewport?.offsetTop ?? 0));
        };

        updateViewportMetrics();

        const visualViewport = window.visualViewport;
        visualViewport?.addEventListener('resize', updateViewportMetrics);
        visualViewport?.addEventListener('scroll', updateViewportMetrics);
        window.addEventListener('resize', updateViewportMetrics);
        window.addEventListener('orientationchange', updateViewportMetrics);

        return () => {
            visualViewport?.removeEventListener('resize', updateViewportMetrics);
            visualViewport?.removeEventListener('scroll', updateViewportMetrics);
            window.removeEventListener('resize', updateViewportMetrics);
            window.removeEventListener('orientationchange', updateViewportMetrics);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const panel = panelRef.current;

        if (!panel) {
            return;
        }

        const handleFocusIn = (event: FocusEvent) => {
            const target = event.target;

            if (!(target instanceof HTMLElement)) {
                return;
            }

            window.setTimeout(() => {
                target.scrollIntoView({
                    block: 'center',
                    inline: 'nearest',
                });
            }, 180);
        };

        panel.addEventListener('focusin', handleFocusIn);

        return () => {
            panel.removeEventListener('focusin', handleFocusIn);
        };
    }, [isOpen]);

    // Handle apply button click
    const handleApply = () => {
        onFilterChange(localFilterValues); // Send final values to parent
        onClose(); // Close the modal
        onApply(localFilterValues);
        const width = window.innerWidth;
        if(width < 768)  toggleMobileSidebar()

        // Tell useEffect to announce when totalRecords updates
        setShouldAnnounce(true);
    };

    // Handle clear button click
    const handleClear = () => {
        // Create a new empty object to force a complete reset
        const emptyValues = {};
        setLocalFilterValues(emptyValues);

        // Force FormCreator to reset by passing a new key
        const resetKey = Date.now();
        setResetKey(resetKey);

        // Notify parent of the reset
        onFilterChange(emptyValues);
    };

    return (
        <>
          {/* ---------------------------
                 NVDA GLOBAL LIVE REGION, OUTSIDE DIALOG PANEL
            ----------------------------- */}
            <div
                id="nvda_global_message"
                aria-live="polite"
                aria-atomic="true"
                style={{
                    position: "absolute",
                    width: "1px",
                    height: "1px",
                    margin: "-1px",
                    padding: "0",
                    overflow: "hidden",
                    clip: "rect(0,0,0,0)"
                }}
            ></div>
        <Dialog
            open={isOpen}
            onClose={onClose}
            className="relative z-50"
        >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div
                className="fixed inset-0 flex justify-end items-start"
                style={{
                    paddingTop: `${panelViewportOffsetTop}px`
                }}
            >
                <Dialog.Panel
                    ref={panelRef}
                    className="w-full max-w-md overflow-y-auto p-6 transition-transform duration-300 ease-in-out"
                    style={{
                        backgroundColor: colors.filtersBackground,
                        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                        height: panelViewportHeight ? `${panelViewportHeight}px` : '100dvh',
                        maxHeight: panelViewportHeight ? `${panelViewportHeight}px` : '100dvh',
                        WebkitOverflowScrolling: 'touch',
                        overscrollBehavior: 'contain',
                        scrollPaddingBottom: '12rem',
                        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))'
                    }}
                >


                    <div className="overflow-visible">
                        {/* Form Creator */}
                        <div className='h-20'></div>
                        <div className="mb-4 text-xl font-bold">{title}</div>
                        <FormCreator
                            key={resetKey}
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
                            <div>
                                <button
                                    className="px-4 py-2 rounded"
                                    style={{ backgroundColor: colors.buttonBackground }}
                                    onClick={onClose}
                                >
                                    <span style={{ color: colors.buttonText }}>Cancel</span>
                                </button>&nbsp;&nbsp;
                                <button
                                    className="px-4 py-2 rounded"
                                    style={{ backgroundColor: colors.buttonBackground }}
                                    onClick={handleClear}
                                >
                                    <span style={{ color: colors.buttonText }}>Clear</span>
                                </button>
                            </div>
                            <button
                                className="px-4 py-2 rounded"
                                style={{ backgroundColor: colors.buttonBackground }}
                                onClick={handleApply}
                                aria-label='Apply for Fetch Record'
                            >
                                <span style={{ color: colors.buttonText }}>Apply</span>
                            </button>
                        </div>
                    )}
                </Dialog.Panel>
            </div>
        </Dialog>
        </>
    );
};

export default FilterModal; 
