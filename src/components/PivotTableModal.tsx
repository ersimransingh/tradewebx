"use client";
import React, { useState } from 'react';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'react-pivottable/pivottable.css';
import Plot from 'react-plotly.js';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';

import createPlotlyRenderers from 'react-pivottable/PlotlyRenderers';
import TableRenderers from 'react-pivottable/TableRenderers';

// Create Plotly renderers using the Plot component
const PlotlyRenderers = createPlotlyRenderers(Plot);

// Polyfill for ReactDOM.findDOMNode which was removed in React 19
// this is required for older libraries like react-draggable/react-pivottable
import ReactDOM from 'react-dom';
if (typeof (ReactDOM as any).findDOMNode !== 'function') {
    (ReactDOM as any).findDOMNode = (component: any) => {
        if (component instanceof Element) {
            return component;
        }
        if (component && component.current instanceof Element) {
            return component.current;
        }
        // Fallback for simple class components that might store ref in specific ways
        // or just return null to prevent crash (functionality might be degraded but app won't crash)
        return component?.node || null;
    };
}



interface PivotTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
}

const PivotTableModal: React.FC<PivotTableModalProps> = ({ isOpen, onClose, data }) => {
    const [state, setState] = useState<any>({});
    const { colors } = useTheme();

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-[95vw] h-[90vh] transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        Pivot Table Analysis
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                                        aria-label="Close modal"
                                    >
                                        <FaTimes className="text-gray-500 hover:text-gray-700" size={20} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-auto border rounded p-2" style={{ borderColor: colors.textInputBorder }}>
                                    {data && data.length > 0 ? (
                                        <PivotTableUI
                                            data={data}
                                            onChange={(s: any) => setState(s)}
                                            renderers={Object.assign({}, TableRenderers, PlotlyRenderers)}
                                            {...state}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-500">
                                            No data available for pivot analysis
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default PivotTableModal;
