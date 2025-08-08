// components/OtpVerificationModal.tsx
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { BASE_URL, PATH_URL } from '@/utils/constants';
import apiService from '@/utils/apiService';

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (verifiedValue: string) => void;
  field: any;
  formValues: Record<string, any>;
  masterValues: Record<string, any>;
  type: 'email' | 'mobile';
  oldValue: string;
  setFieldErrors: (errors: Record<string, string>) => void;
}

const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  field,
  formValues,
  masterValues,
  type,
  oldValue,
  setFieldErrors
}) => {
  const [currentStep, setCurrentStep] = useState<'enterNewValue' | 'verifyOldOtp' | 'verifyNewOtp'>('enterNewValue');
  const [newValue, setNewValue] = useState('');
  const [oldOtp, setOldOtp] = useState('');
  const [newOtp, setNewOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [requiresOldVerification, setRequiresOldVerification] = useState(false);
  const [requiresNewVerification, setRequiresNewVerification] = useState(false);

  // Parse OTPRequire field on component mount
  useEffect(() => {
    if (field.OTPRequire) {
      const otpRequirements = field.OTPRequire.split('|');
      setRequiresOldVerification(otpRequirements.includes('OLD'));
      setRequiresNewVerification(otpRequirements.includes('NEW'));
    }
  }, [field.OTPRequire]);

  // Helper function to extract message from XML response
  const extractMessageFromResponse = (responseData: string): string => {
    const messageMatch = responseData?.match(/<Message>(.*?)<\/Message>/);
    return messageMatch ? messageMatch[1] : '';
  };

  const validateNewValue = (): boolean => {
    if (requiresOldVerification && requiresNewVerification && newValue === oldValue) {
      setError(`New ${type} cannot be same as old ${type}`);
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    setIsLoading(true);
    setError('');

    // Validate new value before sending OTP
    if (!validateNewValue()) {
      setIsLoading(false);
      return;
    }

    try {
      const { J_Ui = {}, X_Filter_Multiple = {}, J_Api = {} } = field.OTPSend.dsXml;

      // Check for missing fields and collect errors
      const errors: string[] = [];
      const fieldErrors: Record<string, string> = {};
      let shouldCallApi = true;

      let xFilterMultiple = `<OTPRequire>${field.OTPRequire}</OTPRequire>`;
      Object.entries(X_Filter_Multiple).forEach(([key, placeholder]) => {
        let fieldValue;
        if (typeof placeholder === 'string' && placeholder.startsWith('##') && placeholder.endsWith('##')) {
          const formKey = placeholder.slice(2, -2);
          fieldValue = newValue;
        } else {
          fieldValue = newValue;
        }

        // Check if field value is missing
        if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
          fieldErrors[key] = `Please fill the required field: ${key}`;
          shouldCallApi = false;
          errors.push(key);
        } else {
          xFilterMultiple += `<${key}>${fieldValue}</${key}>`;
        }
      });

      // If there are missing fields, set errors and show toast
      if (errors.length > 0) {
        toast.error(`Please fill the required fields: ${errors.join(', ')}`);
        setIsLoading(false);
        return;
      }

      const jUi = Object.entries(J_Ui).map(([key, val]) => `"${key}":"${val}"`).join(',');
      const jApi = Object.entries(J_Api).map(([key, val]) => `"${key}":"${val}"`).join(',');

      const xmlData = `<dsXml>
        <J_Ui>${jUi}</J_Ui>
        <X_Filter_Multiple>${xFilterMultiple}</X_Filter_Multiple>
        <J_Api>${jApi}</J_Api>
        <X_Filter></X_Filter>
      </dsXml>`;

      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
      const responseData = response.data?.data?.rs0?.[0]?.Column1;
      if (responseData?.includes("<Flag>S</Flag>")) {
        toast.success(`OTP sent to ${requiresOldVerification ? `old ${type} ${oldValue}` : ''} ${requiresOldVerification && requiresNewVerification ? 'and ' : ''} ${requiresNewVerification ? `new ${type} ${newValue}` : ''}`);
        setOtpSent(true);

        // Determine next step based on requirements
        if (requiresOldVerification) {
          setCurrentStep('verifyOldOtp');
        } else if (requiresNewVerification) {
          setCurrentStep('verifyNewOtp');
        }
      } else {
        const errorMessage = extractMessageFromResponse(responseData);
        setError(errorMessage || `Failed to send OTP. Please try again.`);
      }
    } catch (err) {
      console.error('OTP send error:', err);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOldOtp = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { J_Ui = {}, X_Filter_Multiple = {}, J_Api = {} } = field.OTPValidate.dsXml;

      // Check for missing fields and collect errors
      const errors: string[] = [];
      const fieldErrors: Record<string, string> = {};
      let shouldCallApi = true;

      let xFilterMultiple = '';
      Object.entries(X_Filter_Multiple).forEach(([key, placeholder]) => {
        let fieldValue;
        if (typeof placeholder === 'string' && placeholder.startsWith('##') && placeholder.endsWith('##')) {
          const formKey = placeholder.slice(2, -2);
          if (key === 'OTP') {
            fieldValue = oldOtp;
          } else if (key === 'Value') {
            fieldValue = oldValue;
          } else if (key === "Type") {
            fieldValue = "OLD";
          }
          else {
            fieldValue = formValues[formKey] || masterValues[formKey];
          }
        } else {
          fieldValue = placeholder;
        }

        // Check if field value is missing
        if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
          fieldErrors[key] = `Please fill the required field: ${key}`;
          shouldCallApi = false;
          errors.push(key);
        } else {
          xFilterMultiple += `<${key}>${fieldValue}</${key}>`;
        }
      });

      // If there are missing fields, set errors and show toast
      if (errors.length > 0) {
        toast.error(`Please fill the required fields: ${errors.join(', ')}`);
        setIsLoading(false);
        return;
      }

      const jUi = Object.entries(J_Ui).map(([key, val]) => `"${key}":"${val}"`).join(',');
      const jApi = Object.entries(J_Api).map(([key, val]) => `"${key}":"${val}"`).join(',');

      const xmlData = `<dsXml>
        <J_Ui>${jUi}</J_Ui>
        <X_Filter_Multiple>${xFilterMultiple}</X_Filter_Multiple>
        <J_Api>${jApi}</J_Api>
        <X_Filter></X_Filter>
      </dsXml>`;

      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
      const responseData = response.data?.data?.rs0?.[0]?.Column1;
      if (responseData?.includes("<Flag>S</Flag>")) {
        const message = extractMessageFromResponse(responseData);
        toast.success(message || `Old ${type} OTP verified successfully!`);

        // Determine next step based on requirements
        if (requiresNewVerification) {
          setCurrentStep('verifyNewOtp');
        } else {
          onSuccess(newValue);
          onClose();
        }
      } else {
        const errorMessage = extractMessageFromResponse(responseData);
        setError(errorMessage || 'Invalid OTP. Please try again.');
        if (errorMessage) {
          toast.error(errorMessage);
        }
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyNewOtp = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { J_Ui = {}, X_Filter_Multiple = {}, J_Api = {} } = field.OTPValidate.dsXml;

      // Check for missing fields and collect errors
      const errors: string[] = [];
      const fieldErrors: Record<string, string> = {};
      let shouldCallApi = true;

      let xFilterMultiple = '';
      Object.entries(X_Filter_Multiple).forEach(([key, placeholder]) => {
        let fieldValue;
        if (typeof placeholder === 'string' && placeholder.startsWith('##') && placeholder.endsWith('##')) {
          const formKey = placeholder.slice(2, -2);
          if (key === 'OTP') {
            fieldValue = newOtp;
          } else if (key === 'Value') {
            fieldValue = newValue;
          } else if (key === "Type") {
            fieldValue = "NEW";
          } else if (key === "Email" || key === "Mobile") {
            fieldValue = newValue;
          }
          else {
            fieldValue = formValues[formKey] || masterValues[formKey];
          }
        } else {
          fieldValue = placeholder;
        }

        // Check if field value is missing
        if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
          fieldErrors[key] = `Please fill the required field: ${key}`;
          shouldCallApi = false;
          errors.push(key);
        } else {
          xFilterMultiple += `<${key}>${fieldValue}</${key}>`;
        }
      });

      // If there are missing fields, set errors and show toast
      if (errors.length > 0) {
        toast.error(`Please fill the required fields: ${errors.join(', ')}`);
        setIsLoading(false);
        return;
      }

      const jUi = Object.entries(J_Ui).map(([key, val]) => `"${key}":"${val}"`).join(',');
      const jApi = Object.entries(J_Api).map(([key, val]) => `"${key}":"${val}"`).join(',');

      const xmlData = `<dsXml>
        <J_Ui>${jUi}</J_Ui>
        <X_Filter_Multiple>${xFilterMultiple}</X_Filter_Multiple>
        <J_Api>${jApi}</J_Api>
        <X_Filter></X_Filter>
        <X_GFilter></X_GFilter>
      </dsXml>`;

      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

      const responseData = response.data?.data?.rs0?.[0]?.Column1;
      if (responseData?.includes("<Flag>S</Flag>")) {
        const message = extractMessageFromResponse(responseData);
        toast.success(message || `New ${type} OTP verified successfully!`);
        onSuccess(newValue);
        onClose();
      } else {
        const errorMessage = extractMessageFromResponse(responseData);
        setError(errorMessage || 'Invalid OTP. Please try again.');
        if (errorMessage) {
          toast.error(errorMessage);
        }
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {type === 'email' ? 'Email' : 'Mobile'} Verification
        </h2>

        {/* Stepper indicator - dynamic based on requirements */}
        <div className="flex justify-between mb-6">
          {/* Step 1: Enter New Value */}
          <div className={`flex flex-col items-center ${currentStep === 'enterNewValue' ? 'text-blue-500' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'enterNewValue' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className="text-xs mt-1">Enter New</span>
          </div>

          {/* Step 2: Verify Old OTP (only shown if required) */}
          {requiresOldVerification && (
            <div className={`flex flex-col items-center ${currentStep === 'verifyOldOtp' ? 'text-blue-500' : currentStep === 'verifyNewOtp' ? 'text-green-500' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'verifyOldOtp' ? 'bg-blue-500 text-white' : currentStep === 'verifyNewOtp' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="text-xs mt-1">Verify Old OTP</span>
            </div>
          )}

          {/* Step 3: Verify New OTP (only shown if required) */}
          {requiresNewVerification && (
            <div className={`flex flex-col items-center ${currentStep === 'verifyNewOtp' ? 'text-green-500' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'verifyNewOtp' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                {requiresOldVerification ? 3 : 2}
              </div>
              <span className="text-xs mt-1">Verify New OTP</span>
            </div>
          )}
        </div>

        {/* Step 1: Enter New Value */}
        {currentStep === 'enterNewValue' && (
          <div>
            {requiresOldVerification && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Current {type === 'email' ? 'Email' : 'Mobile'}
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formValues[field.wKey] || oldValue}
                  readOnly
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                New {type === 'email' ? 'Email' : 'Mobile'}
              </label>
              <input
                type={type === 'email' ? 'email' : 'tel'}
                className="w-full px-3 py-2 border rounded-md"
                value={newValue}
                onChange={(e) => {
                  setNewValue(e.target.value);
                  setError(''); // Clear error when user types
                }}
                placeholder={`Enter new ${type}`}
              />
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded-md"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSendOtp}
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
                disabled={isLoading || !newValue}
              >
                {isLoading ? 'Sending OTPs...' : 'Send OTPs'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Verify Old OTP */}
        {currentStep === 'verifyOldOtp' && (
          <div>
            <div className="mb-4">
              <p className="text-sm mb-4">
                We&apos;ve sent an OTP to your old {type}: <span className="font-semibold">{formValues[field.wKey] || oldValue}</span>
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Enter OTP from old {type}
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={oldOtp}
                  onChange={(e) => setOldOtp(e.target.value)}
                  placeholder="Enter OTP"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setCurrentStep('enterNewValue')}
                className="px-4 py-2 border rounded-md"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                onClick={handleVerifyOldOtp}
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
                disabled={isLoading || !oldOtp}
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verify New OTP */}
        {currentStep === 'verifyNewOtp' && (
          <div>
            <div className="mb-4">
              <p className="text-sm mb-4">
                We&apos;ve sent an OTP to your new {type}: <span className="font-semibold">{newValue}</span>
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Enter OTP from new {type}
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={newOtp}
                  onChange={(e) => setNewOtp(e.target.value)}
                  placeholder="Enter OTP"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setCurrentStep(requiresOldVerification ? 'verifyOldOtp' : 'enterNewValue')}
                className="px-4 py-2 border rounded-md"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                onClick={handleVerifyNewOtp}
                className="px-4 py-2 bg-green-500 text-white rounded-md"
                disabled={isLoading || !newOtp}
              >
                {isLoading ? 'Verifying...' : 'Complete Verification'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OtpVerificationModal;