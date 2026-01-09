import React, { useEffect, useRef, useCallback } from "react";

interface ValidationModalProps {
  isOpen: boolean;
  message: string;
  type: "M" | "S" | "E" | "D";
  onConfirm: () => void;
  onCancel?: () => void;
}

const CaseConfirmationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  message,
  type,
  onConfirm,
  onCancel,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Trap focus inside modal
  const trapFocus = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const focusableElements = modalRef.current?.querySelectorAll<
      HTMLElement
    >(
      'button, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      }
    } else {
      if (document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  };


  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel?.();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current =
        document.activeElement as HTMLElement;

      // Wait a tick for modal to mount
      setTimeout(() => {
        modalRef.current?.focus();
      }, 10);

      document.addEventListener("keydown", trapFocus);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", trapFocus);
      document.removeEventListener("keydown", handleEscape);

      // Restore previous focus
      previouslyFocusedElement.current?.focus();
    };
  }, [isOpen,handleEscape]);

  // const handleEscape = (e: KeyboardEvent) => {
  //   if (e.key === "Escape") {
  //     onCancel?.();
  //   }
  // };

  if (!isOpen) return null;

  return (
    <div
      aria-hidden={!isOpen}
      className="fixed inset-0 flex items-center justify-center z-[300]"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        tabIndex={-1}
        className="bg-white rounded-lg p-6 w-full max-w-[400px] shadow-lg outline-none"
      >
        <h4 id="modal-title" className="text-xl font-semibold mb-4">
          {type === "M" ? "Confirmation" : "Message"}
        </h4>

        <p id="modal-description" className="text-gray-600 mb-6">
          {message}
        </p>

        <div className="flex justify-end gap-4">
          {type === "M" && (
            <button
              onClick={onCancel}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md focus:outline focus:outline-2 focus:outline-blue-500"
            >
              No
            </button>
          )}

          <button
            onClick={onConfirm}
            className={`${
              type === "M"
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-green-500 hover:bg-green-600"
            } text-white px-4 py-2 rounded-md focus:outline focus:outline-2 focus:outline-blue-500`}
          >
            {type === "M" ? "Yes" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaseConfirmationModal;
