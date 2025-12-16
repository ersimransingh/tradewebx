import React, { useId } from "react";
import AccessibleModal from "@/components/a11y/AccessibleModal";

type ConfirmationModalProps = {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onConfirm, onCancel }) => {
    const titleId = useId();
    const descriptionId = useId();

    return (
        <AccessibleModal
            isOpen={isOpen}
            onDismiss={onCancel}
            labelledBy={titleId}
            describedBy={descriptionId}
            role="alertdialog"
            className="bg-white p-6 shadow-theme-lg max-w-md w-full rounded-lg"
            closeOnOverlayClick={false}
        >
            <div>
                <h4 id={titleId} className="text-xl font-semibold mb-4">
                    Confirm Deletion
                </h4>
                <p id={descriptionId} className="text-gray-600 mb-6">
                    Are you sure you want to delete this record?
                </p>
                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </AccessibleModal>
    );
};

export default ConfirmationModal;
