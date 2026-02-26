"use client";
import { useEffect, useState, useRef } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { DataGrid, Column } from "react-data-grid";
import { Modal } from "@/components/ui/modal";
import axios from "axios";
import { toast } from "react-toastify";
import CryptoJS from "crypto-js";
import { useTheme } from "@/context/ThemeContext";
import { getLocalStorage, decodeFernetToken } from "@/utils/helper";
import { FamilyRow, LoginData } from "@/types/FamilyTypes";
import { BASE_URL, OTP_VERIFICATION_URL, PRODUCT, ACTION_NAME, PATH_URL, ENABLE_FERNET, LOGIN_OPTION } from "@/utils/constants";
import apiService from "@/utils/apiService";
import { otpApi } from "@/utils/auth";
import { storeTempOtpToken } from "@/utils/auth";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from "@/redux/store";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import ConfirmationModal from "@/components/Modals/ConfirmationModal";

const passKey = "TradeWebX1234567";

export default function Family() {
  const { colors } = useTheme();

  // --- States ---
  const [rows, setRows] = useState<FamilyRow[]>([]);
  const [isUccModalOpen, setIsUccModalOpen] = useState<boolean>(false);
  const [ucc, setUcc] = useState<string>("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginData, setLoginData] = useState<LoginData>({ userId: "", password: "" });
  const [otp, setOtp] = useState<string>("");
  const [otpRequired, setOtpRequired] = useState<boolean>(false);
  const [loginMessage, setLoginMessage] = useState<string>("");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [otpError, setOtpError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const tempTokenRef = useRef<string | null>(null);
  const { encPayload } = useSelector((state: RootState) => state.common);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showOtp, setShowOtp] = useState<boolean>(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [confirmMessage, setConfirmMessage] = useState<string>("");
  const [selectedRow, setSelectedRow] = useState<FamilyRow | null>(null);

  // --- Columns ---
  const columns: Column<FamilyRow>[] = [
    { key: "FamilyHead", name: "Family Head" },
    { key: "ClientCode", name: "Client Code" },
    { key: "ClientName", name: "Client Name" },
    {
      key: "remove",
      name: "",
      width: 100,
      renderCell: ({ row }) => (
        <span
          className="text-red-700 cursor-pointer underline"
          onClick={() => handleRemoveClick(row)}
        >
          Remove
        </span>
      )
    }
  ];

  // --- AES Encryption ---
  function Encryption(data: string): string {
    const key = CryptoJS.enc.Utf8.parse(passKey);
    const iv = CryptoJS.enc.Utf8.parse(passKey);
    return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(data), key, {
      keySize: 128 / 8,
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();
  }

  // --- Get IP Address ---
  const getIPAddress = async (): Promise<string> => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      if (!res.ok) throw new Error("Ipify failed");
      const data = await res.json();
      return data.ip;
    } catch {
      toast.error(" Ipify lookup failed, using backup service...");
      try {
        const backupRes = await fetch("https://ipapi.co/json/");
        if (!backupRes.ok) throw new Error("ipapi failed");
        const backupData = await backupRes.json();
        toast.success(" Backup API worked!");
        return backupData.ip;
      } catch {
        toast.error("All IP lookups failed!");
        return "0.0.0.0"; // Last fallback if everything fails
      }
    }
  };

  // --- Fetch Family Mapping ---
  const fetchFamilyMapping = async (): Promise<void> => {
    try {
      const xmlData = `<dsXml>
        <J_Ui>"ActionName":"${ACTION_NAME}","Option":"FamilyMapping","RequestFrom":"W"</J_Ui>
        <Sql></Sql>
        <X_Filter></X_Filter>
        <X_Filter_Multiple></X_Filter_Multiple>
        <X_Data></X_Data>
        <J_Api>"UserId":"${getLocalStorage("userId")}"</J_Api>
      </dsXml>`;

      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

      if (response.data?.data?.rs0?.length) {
        const formattedRows: FamilyRow[] = response.data.data.rs0.map((item: any, idx: number) => ({
          id: idx + 1,
          FamilyHead: item.FamilyHead?.trim() || "",
          ClientCode: item.ClientCode?.trim() || "",
          ClientName: item.ClientName?.trim() || "",
        }));
        setRows(formattedRows);
      } else setRows([]);
    } catch {
      setRows([]);
    }
  };

  useEffect(() => {
    fetchFamilyMapping();
  }, []);

  // --- Modal Handlers ---
  const openUccModal = () => setIsUccModalOpen(true);
  const closeUccModal = () => {
    setUcc("");
    setError("");        // optional: clears validation error
    setIsUccModalOpen(false);
  };


  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setOtpRequired(false);
    setOtp("");
    setLoginMessage("");
    setError("");
    setOtpError("");
    setLoginData({ userId: "", password: "" });
    setUcc("");
  };

  const handleUccNext = () => {
    if (!ucc.trim()) {
      setError("UCC Code is required.");
      return;
    }
    setError("");
    closeUccModal();
    openLoginModal();
  };

  // --- Login API ---
  const handleLogin = async (): Promise<void> => {
    setError("");
    if (!loginData.userId.trim()) return setError("User ID is required.");
    if (!loginData.password.trim()) return setError("Password is required.");
    //  Same user check
    if (loginData.userId === getLocalStorage("userId")) {
      setError("You are already logged in with this User ID.");
      return;
    }

    setIsLoading(true);
    try {
      const xmlData = `<dsXml>
        <J_Ui>"ActionName":"${ACTION_NAME}","Option":"${LOGIN_OPTION}"</J_Ui>
        <Sql/>
        <X_Data>
          <UserId>${loginData.userId}</UserId>
          <EPassword>${Encryption(loginData.password)}</EPassword>
          <Product>${PRODUCT}</Product>
          <ICPV></ICPV>
          <Feature></Feature>
        </X_Data>
        <J_Api>"UserId":"", "UserType":"User"</J_Api>
      </dsXml>`;

      const response = await apiService.postWithAuth(BASE_URL + OTP_VERIFICATION_URL, xmlData);
      const data = response.data;
      if (!data?.status) return setError(data?.message || "Invalid credentials.");

      if (data?.token) {
        storeTempOtpToken(data.token);   // store safely
        tempTokenRef.current = data.token; // optional (instant access)
      }

      const loginType = data?.data?.[0]?.LoginType;
      if (loginType === "2FA") {
        setOtpRequired(true);
        setLoginMessage(data?.data?.[0]?.LoginMessage || "");
      } else {
        await saveUccData(loginData.userId); //  latest value
        fetchFamilyMapping();
        setUcc("");
        setOtp("");
        setOtpRequired(false);
        closeLoginModal();
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  // --- Verify OTP ---
  const handleOTPVerify = async (): Promise<void> => {
    if (!otp.trim()) return setOtpError("OTP is required.");
    if (!/^\d{4}$/.test(otp)) return setOtpError("OTP must be 4 digits.");
    const authToken = tempTokenRef.current;
    setIsLoading(true);
    try {
      const xmlData = `<dsXml>
        <J_Ui>"ActionName":"${ACTION_NAME}","Option":"Verify2FA","Level":1,"RequestFrom":"W"</J_Ui>
        <Sql/>
        <X_Filter></X_Filter>
        <X_Data>
          <OTP>${otp}</OTP>
        </X_Data>
        <X_GFilter/>
        <J_Api>"UserId":"${loginData.userId}", "UserType":"${getLocalStorage("userType")}"</J_Api>
      </dsXml>`;

      const response = await otpApi.request({
        method: 'post',
        url: BASE_URL + OTP_VERIFICATION_URL,
        data: xmlData,
      });
      // Check both ENABLE_FERNET constant and encPayload from Redux state
      const shouldDecode = ENABLE_FERNET && encPayload;
      const data = shouldDecode ? decodeFernetToken(response.data.data) : response.data;

      if (data?.status === false) {
        toast.error(data?.message || "Invalid OTP. Please try again.");
        return; // stop further execution
      }
      /** OTP success */
      if (data?.status === true) {
        await saveUccData(loginData.userId); //  always latest
        fetchFamilyMapping();
        setUcc("");
        setOtp("");
        setOtpRequired(false);
        closeLoginModal();
      }
    } catch {
      setOtpError("OTP verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Save UCC Data ---
  const saveUccData = async (userId: string): Promise<void> => {
    try {
      const ipAddress = await getIPAddress();
      const xmlData = `<dsXml>
        <J_Ui>"ActionName":"FamilyMapping","Option":"Add","RequestFrom":"W"</J_Ui>
        <Sql></Sql>
        <X_Filter></X_Filter>
        <X_Data>
          <UccCode>${userId}</UccCode>
          <IPAddress>${ipAddress}</IPAddress>
        </X_Data>
        <J_Api>"UserId":"${getLocalStorage("userId")}","UserType":"${getLocalStorage("userType")}"</J_Api>
      </dsXml>`;

      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

      if (response?.data?.success === true) {
        toast.success(response?.data?.message?.replace(/<[^>]+>/g, "") || "Family Mapped successfully");
        fetchFamilyMapping();
        setUcc("");
        setOtp("");
        setOtpRequired(false);
        setLoginData({ userId: "", password: "" });
        closeLoginModal();
      }
      if (response?.data?.success === false) {
        toast.error(response?.data?.message.replace(/<[^>]+>/g, "") || "Something went wrong...!");
        return; // stop further execution
      }
    } catch {
      toast.error("Something went wrong...!");
    }
  };

  //Delete working
  const handleRemoveClick = (row: FamilyRow) => {
    
    const isMainMember = row.FamilyHead?.trim().toUpperCase() === "MAIN";
    const message = isMainMember
      ? `[${row.ClientCode}  ${row.ClientName} ] Is Main Person Of Family, Remove All Members From Family ?`
      : `[${row.ClientCode}  ${row.ClientName} ] Remove Member?`;

    setSelectedRow(row);
    setConfirmMessage(message);
    setIsConfirmOpen(true);
  };

  //Yes No Hnadlers 
  const handleConfirmDelete = async () => {
    if (!selectedRow) return;

    await deleteFamilyMember(selectedRow.ClientCode);

    setIsConfirmOpen(false);
    setSelectedRow(null);
  };

  const handleCancelDelete = () => {
    setIsConfirmOpen(false);
    setSelectedRow(null);
  };

  //Delete API

  const deleteFamilyMember = async (userId: string): Promise<void> => {
    try {
      const ipAddress = await getIPAddress();

      const xmlData = `<dsXml>
      <J_Ui>"ActionName":"FamilyMapping","Option":"DELETE","RequestFrom":"W"</J_Ui>
      <Sql></Sql>
      <X_Filter></X_Filter>
      <X_Data>
        <UccCode>${userId}</UccCode>
        <IPAddress>${ipAddress}</IPAddress>
      </X_Data>
      <J_Api>"UserId":"${getLocalStorage("userId")}","UserType":"${getLocalStorage("userType")}"</J_Api>
    </dsXml>`;

      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
      console.log("delete", response)
      if (response?.data?.success === true) {
        toast.success(
          response?.data?.message?.replace(/<[^>]+>/g, "") ||
          "Member removed successfully"
        );
        fetchFamilyMapping();
      } else {
        toast.error(
          response?.data?.message?.replace(/<[^>]+>/g, "") ||
          "Failed to remove member"
        );
      }
    } catch {
      toast.error("Something went wrong while removing member.");
    }
  };


  // --- JSX ---
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Family Mapping</h2>
          <button
            onClick={openLoginModal}
            className="py-2 px-4 rounded text-white flex items-center mt-3"
            style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
          >
            Add
          </button>
        </div>

        {rows.length === 0 ? (
          <p className="text-center text-gray-500 py-6">No member mapped yet.</p>
        ) : (
          <div className="mt-6">
            <DataGrid columns={columns} rows={rows} />
          </div>
        )}
      </div>

      {/* --- UCC Modal --- */}
      {/* <Modal isOpen={isUccModalOpen} onClose={closeUccModal} isOutsideClickAllowed={false} className="max-w-[400px] p-6">
        <h4 className="text-lg font-semibold mb-4 mt-4">UCC/Code</h4>
        <Input value={ucc} onChange={(e) => setUcc(e.target.value)} placeholder="Enter UCC Code" />
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button className="py-2 px-4 rounded text-black bg-white border-2" onClick={closeUccModal}>Cancel</button>
          <button
            className="py-2 px-4 rounded text-white"
            style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
            onClick={handleUccNext}
          >
            Next
          </button>
        </div>
      </Modal> */}

      {/* --- Login & OTP Modal --- */}
      <Modal isOpen={isLoginModalOpen} onClose={closeLoginModal} isOutsideClickAllowed={false} className="max-w-[500px] p-6">
        <h4 className="text-lg font-semibold mb-4">{otpRequired ? "Verify OTP" : "Add Family"}</h4>

        {!otpRequired && (
          <>
            <Label>User ID</Label>
            <Input
              value={loginData.userId}
              onChange={(e) => setLoginData({ ...loginData, userId: e.target.value })}
            />
            <Label className="mt-5">Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              />
              <button
                type="button"
                aria-label="Show Password"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {error && <div className="text-red-600">{error}</div>}
          </>
        )}

        {otpRequired && (
          <>
            {loginMessage && <p className="text-sm text-blue-600 mb-2">{loginMessage}</p>}
            <Label>OTP</Label>
            <div className="relative">
              <Input type={showOtp ? "text" : "password"} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 4-digit OTP" />
              <button
                type="button"
                aria-label="Show Password"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowOtp(!showOtp)}
              >
                {showOtp ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {otpError && <div className="text-red-600">{otpError}</div>}
          </>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button className="py-2 px-4 rounded text-black bg-white border-2" onClick={closeLoginModal}>Cancel</button>
          {!otpRequired ? (
            <button
              className="py-2 px-4 rounded text-white"
              style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Verify"}
            </button>
          ) : (
            <button
              className="py-2 px-4 rounded text-white"
              style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
              onClick={handleOTPVerify}
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>
          )}
        </div>
      </Modal>
      <ConfirmationModal
        message={confirmMessage}
        isOpen={isConfirmOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

