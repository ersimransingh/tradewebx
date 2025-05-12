interface ValidationModalProps {
    isOpen: boolean;
    message: string;
    type: 'M' | 'S' | 'E' | 'D';
    onConfirm: () => void;
    onCancel?: () => void;
  }
  
  const CaseConfirmationModal: React.FC<ValidationModalProps> = ({ 
    isOpen, 
    message, 
    type, 
    onConfirm, 
    onCancel 
  }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 flex items-center justify-center z-[300]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div className="bg-white rounded-lg p-6 w-full max-w-[400px]">
          <h4 className="text-xl font-semibold mb-4">
            {type === 'M' ? 'Confirmation' : 'Message'}
          </h4>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end gap-4">
            {type === 'M' && (
              <button
                onClick={onCancel}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
              >
                No
              </button>
            )}
            <button
              onClick={onConfirm}
              className={`${
                type === 'M' 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-green-500 hover:bg-green-600'
              } text-white px-4 py-2 rounded-md`}
            >
              {type === 'M' ? 'Yes' : 'OK'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  export default CaseConfirmationModal;