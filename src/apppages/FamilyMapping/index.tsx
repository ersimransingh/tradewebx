
"use client";
import { useEffect, useState } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { DataGrid } from "react-data-grid";
import { Modal } from "@/components/ui/modal";
import axios from "axios";
import { toast } from "react-toastify";  //  Import toast
import { BASE_URL, OTP_VERIFICATION_URL, LOGIN_KEY, PRODUCT, LOGIN_AS } from "@/utils/constants";
import CryptoJS from "crypto-js";
import { useTheme } from "@/context/ThemeContext";

const passKey = "TradeWebX1234567";

export default function Family() {
  // States
  const { colors, fonts } = useTheme();
  const [rows, setRows] = useState<any[]>([]);
  const [isUccModalOpen, setIsUccModalOpen] = useState(false);
  const [ucc, setUcc] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginData, setLoginData] = useState({ userId: "", password: "" });
  const [otp, setOtp] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  //  DataGrid Columns
  const columns = [
    { key: "FamilyHead", name: "Family Head" },
    { key: "ClientCode", name: "Client Code" },
    { key: "ClientName", name: "Client Name" },
  ];

  //  AES Encryption
  function Encryption(data: string) {
    const key = CryptoJS.enc.Utf8.parse(passKey);
    const iv = CryptoJS.enc.Utf8.parse(passKey);
    return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(data), key, {
      keySize: 128 / 8,
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();
  }

  //  Get Public IP
  const getIPAddress = async (): Promise<string> => {
    try {
      //  First try ipify
      const res = await fetch("https://api.ipify.org?format=json");
      if (!res.ok) throw new Error("Ipify failed");
      const data = await res.json();
      return data.ip;
    } catch (err) {
        toast.error(" Ipify lookup failed, using backup service...");
      try {
        // Fallback to ipapi
        const backupRes = await fetch("https://ipapi.co/json/");
        if (!backupRes.ok) throw new Error("ipapi failed");
        const backupData = await backupRes.json();
        toast.success(" Backup API worked!");
        return backupData.ip; // ipapi also returns { ip: "203.x.x.x", ... }
      } catch (backupErr) {
        toast.error("All IP lookups failed!");
        return "0.0.0.0"; // Last fallback if everything fails
      }
    }
  };
  

  // Load Family Mapping Data on page load
  useEffect(() => {
    fetchFamilyMapping();
  }, []);

  const fetchFamilyMapping = async () => {
    try {
      const xmlData = `<dsXml>
        <J_Ui>"ActionName":"TRADEWEB","Option":"FamilyMapping","RequestFrom":"W"</J_Ui>
        <Sql></Sql>
        <X_Filter></X_Filter>
        <X_Filter_Multiple></X_Filter_Multiple>
        <X_Data></X_Data>
        <J_Api>"UserId":"${localStorage.getItem('userId')}"</J_Api>
      </dsXml>`;

      const response = await axios.post(BASE_URL + OTP_VERIFICATION_URL, xmlData, {
        headers: { "Content-Type": "application/xml" },
      });

      if (response.data?.data?.rs0?.length) {
        const formattedRows = response.data.data.rs0.map((item: any, idx: number) => ({
          id: idx + 1,
          FamilyHead: item.FamilyHead?.trim() || "",
          ClientCode: item.ClientCode?.trim() || "",
          ClientName: item.ClientName?.trim() || "",
        }));
        setRows(formattedRows);
      } else {
        setRows([]); // No data → empty grid
      }
    } catch (err) {
      setRows([]);
    }
  };

  //  Handle Add Button → Open UCC Modal
  const openUccModal = () => setIsUccModalOpen(true);
  const closeUccModal = () => setIsUccModalOpen(false);

  // Handle Login Modal
  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setOtpRequired(false);
    setOtp("");
    setLoginMessage("");
  };

  //  After UCC code entered → go to Login Modal
  const handleUccNext = () => {
    if (!ucc.trim()) {
      setError(" UCC Code is required.");
      return;
    }
    setError("");
    closeUccModal();
    openLoginModal();
  };

  //  Login API
  const handleLogin = async () => {
    setError("");

    if (!loginData.userId.trim()) {
      setError(" User ID is required.");
      return;
    }
    if (!loginData.password.trim()) {
      setError(" Password is required.");
      return;
    }


    setIsLoading(true);
    try {
      const xmlData = `<dsXml>
        <J_Ui>"ActionName":"TradeWeb","Option":"Login"</J_Ui>
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

      const response = await axios.post(BASE_URL + OTP_VERIFICATION_URL, xmlData, {
        headers: { "Content-Type": "application/xml" },
      });

      const data = response.data;

      //  Stop if login fails
      if (!data?.status) {
        setError(data?.message || "Invalid credentials.");
        setIsLoading(false);
        return;
      }

      if (data?.token) setTempToken(data.token);

      const loginType = data?.data?.[0]?.LoginType;
      if (loginType === "2FA") {
        setOtpRequired(true);
        setLoginMessage(data?.data?.[0]?.LoginMessage || "");
      } else {
        await saveUccData();
      }
    } catch (err) {
      setError(" Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  //  Verify OTP API
  const handleOTPVerify = async () => {
    if (!otp.trim()) {
      setOtpError("OTP is required.");
      return;
    }
    if (!/^\d{4}$/.test(otp)) {
      setOtpError("OTP must be 4 digits.");
      return;
    }
    setIsLoading(true);
    try {
      const xmlData = `<dsXml>
        <J_Ui>"ActionName":"TradeWeb","Option":"Verify2FA","Level":1,"RequestFrom":"M"</J_Ui>
        <Sql/>
        <X_Data><OTP>${otp}</OTP></X_Data>
        <J_Api>"UserId":"${loginData.userId}", "UserType":"${localStorage.getItem('userType')}"</J_Api>
      </dsXml>`;

      await axios.post(BASE_URL + OTP_VERIFICATION_URL, xmlData, {
        headers: {
          "Content-Type": "application/xml",
          "Authorization": `Bearer ${tempToken}`,
        },
      });

      await saveUccData();
      setIsLoading(false);
    } catch {
        setIsLoading(false);
      setOtpError("OTP verification failed.");
    }
  };

  // Save UCC Data (Show toast)
  const saveUccData = async () => {
    try {
      const ipAddress = await getIPAddress();
      const xmlData = `<dsXml>
        <J_Ui>"ActionName":"FamilyMapping","Option":"Add","RequestFrom":"W"</J_Ui>
        <Sql></Sql>
        <X_Data>
          <UccCode>${ucc}</UccCode>
          <IPAddress>${ipAddress}</IPAddress>
        </X_Data>
        <J_Api>"UserId":"${localStorage.getItem('userId')}"</J_Api>
      </dsXml>`;

      const response = await axios.post(BASE_URL + OTP_VERIFICATION_URL, xmlData, {
        headers: { "Content-Type": "application/xml" },
      });

      if (response.data?.success) {
        toast.success(response.data.message?.replace(/<[^>]+>/g, "") || "UCC added successfully");

        // Refresh grid data after adding
        fetchFamilyMapping();

        // Reset
        setUcc("");
        setOtp("");
        setOtpRequired(false);
        closeLoginModal();
      } else {
        toast.error(" Failed to add UCC.");
      }
    } catch {
      toast.error("Failed to save UCC.");
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        {/*  Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Family Mapping</h2>
          <button
           onClick={openUccModal}
           className="py-2 px-4 rounded text-white flex items-center mt-3"
           style={{
             backgroundColor: colors.buttonBackground,
             color: colors.buttonText
           }}>
            Add
          </button>
        </div>

        {/* Grid or Empty Message */}
        {rows.length === 0 ? (
          <p className="text-center text-gray-500 py-6">No member mapped yet.</p>
        ) : (
          <div className="mt-6">
            <DataGrid columns={columns} rows={rows} />
          </div>
        )}
      </div>

      {/* Modal 1: UCC Code */}
      <Modal isOpen={isUccModalOpen} onClose={closeUccModal}  isOutsideClickAllowed={false} className="max-w-[400px] p-6">
        <h4 className="text-lg font-semibold mb-4 mt-4"> UCC/Code</h4>
        {/* <Label>UCC Code</Label> */}
        <Input value={ucc} onChange={(e) => setUcc(e.target.value)} placeholder="Enter UCC Code" />
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button 
          className="py-2 px-4 rounded text-black bg-white flex items-center mt-3 border-2 border-solid"

            onClick={closeUccModal}
            >Cancel
            </button>
          <button
            className="py-2 px-4 rounded text-white flex items-center mt-3"
            style={{
              backgroundColor: colors.buttonBackground,
              color: colors.buttonText
            }}  
            onClick={handleUccNext}
            >Next
            </button>
        </div>
      </Modal>

      {/*  Modal 2: Login & OTP */}
      <Modal isOpen={isLoginModalOpen} onClose={closeLoginModal}  isOutsideClickAllowed={false} className="max-w-[500px] p-6">
        <h4 className="text-lg font-semibold mb-4">{otpRequired ? "Verify OTP" : "Verify User"}</h4>

        {!otpRequired && (
          <>
            <Label>User ID</Label>
            <Input value={loginData.userId} onChange={(e) => setLoginData({ ...loginData, userId: e.target.value })} />
            <Label>Password</Label>
            <Input type="password" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} />
            {error && <div className="text-red-600">{error}</div>}
          </>
        )}

        {otpRequired && (
          <>
            {loginMessage && <p className="text-sm text-blue-600 mb-2">{loginMessage}</p>}
            <Label>OTP</Label>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 4-digit OTP" />
            {otpError && <div className="text-red-600">{otpError}</div>}
          </>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button 
          className="py-2 px-4 rounded text-black bg-white flex items-center mt-3 border-2 border-solid"
          onClick={closeLoginModal}
          >Cancel
          </button>
          {!otpRequired ? (
            <button 
              className="py-2 px-4 rounded text-white flex items-center mt-3"
              style={{
                backgroundColor: colors.buttonBackground,
                color: colors.buttonText
              }}
              onClick={handleLogin}
              disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify"}
            </button>
          ) : (
            <button 
              className="py-2 px-4 rounded text-white flex items-center mt-3"
              style={{
                backgroundColor: colors.buttonBackground,
                color: colors.buttonText
              }}
              onClick={handleOTPVerify} 
              disabled={isLoading}
              >
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}



