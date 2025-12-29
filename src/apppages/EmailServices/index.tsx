
"use client";

import { useEffect, useRef, useState } from "react";
import moment from "moment";
import { useTheme } from "@/context/ThemeContext";
import Loader from "@/components/Loader";
import emailServiceApi from "@/utils/emailServiceApi";

type ViewState = "loading" | "setup" | "dashboard";

interface DashboardData {
  database: {
    connected: boolean;
    server: string;
    database: string;
    last_checked: string;
    response_time: number;
    message?: string;
  };
  schedule: {
    start_time: string;
    end_time: string;
    interval: number;
    interval_unit: string;
    is_active: boolean;
    within_schedule: boolean;
    next_run: string | null;
  };
  service: {
    status: string;
    started_at: string;
    last_activity: string;
    next_run: string;
    is_processing: boolean;
    email_stats: {
      total_processed: number;
      total_sent: number;
      total_failed: number;
      pending_count: number;
    };
  };
}

interface CertificateStatus {
  success: boolean;
  available: boolean;
  token_present: boolean;
  certificate_found: boolean;
  token_label: string | null;
  slot_id: number | null;
  certificate_id: string | null;
  certificate_subject: string | null;
  certificate_not_valid_before: string | null;
  certificate_not_valid_after: string | null;
  library_path: string;
  error?: string;
}

interface Certificate {
  subject: string;
  issuer: string;
  serial_number: string;
  not_valid_before: string;
  not_valid_after: string;
  thumbprint: string;
  has_private_key: boolean;
  store_name: string | null;
  store_location: string | null;
  source: string;
  token_label: string | null;
  slot_id: number | null;
}

interface CertificatesResponse {
  success: boolean;
  total_certificates: number;
  system_certificates: Certificate[];
  hardware_certificates: Certificate[];
  error: string | null;
}

interface CertificatePinStatus {
  token_present: boolean;
  token_label: string;
  slot_id: number;
  certificate_id: string;
  subject: string;
  issuer: string;
  serial_number: string;
  not_valid_before: string;
  not_valid_after: string;
  pin_configured: boolean;
  pin_valid: boolean;
  pin_last_verified_at: string | null;
  pin_last_error: string | null;
}

interface CertificatePinStatusResponse {
  success: boolean;
  total_certificates: number;
  certificates: CertificatePinStatus[];
  error: string | null;
}

type Message = { type: "success" | "error"; text: string };

const EmailServices = () => {
  const { colors, fonts } = useTheme();
  const serviceUser = "admin";

  const [view, setView] = useState<ViewState>("loading");

  const [server, setServer] = useState("");
  const [port, setPort] = useState<number>(1433);
  const [dbUser, setDbUser] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [database, setDatabase] = useState("");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("22:00");
  const [interval, setInterval] = useState<number>(5);
  const [intervalUnit, setIntervalUnit] = useState("minutes");
  const [dbRequestTimeout, setDbRequestTimeout] = useState<number>(30000);
  const [dbConnectionTimeout, setDbConnectionTimeout] = useState<number>(30000);
  const [connectionTested, setConnectionTested] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [dbSaveLoading, setDbSaveLoading] = useState(false);
  const [emailSaveLoading, setEmailSaveLoading] = useState(false);
  const [databaseMessage, setDatabaseMessage] = useState<Message | null>(null);
  const [emailMessage, setEmailMessage] = useState<Message | null>(null);
  const [emailProgress, setEmailProgress] = useState(0);
  const [emailProgressLabel, setEmailProgressLabel] = useState("");

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [certificateStatus, setCertificateStatus] = useState<CertificateStatus | null>(null);
  const [certificates, setCertificates] = useState<CertificatesResponse | null>(null);
  const [certificatePinStatus, setCertificatePinStatus] =
    useState<CertificatePinStatusResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [dashboardMessage, setDashboardMessage] = useState<Message | null>(null);
  const [pingLoading, setPingLoading] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinModalError, setPinModalError] = useState<string | null>(null);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    const initializeView = async () => {
      try {
        const configResponse = await emailServiceApi.checkEmailConfig();
        if (!isActive) return;
        setView(configResponse?.exists ? "dashboard" : "setup");
      } catch (error) {
        if (isActive) {
          setView("setup");
        }
      }
    };

    initializeView();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (view === "dashboard" && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDashboardData();
    }
    if (view !== "dashboard") {
      hasFetchedRef.current = false;
    }
  }, [view]);

  const handleTestConnection = async () => {
    if (!server.trim() || !dbUser.trim() || !dbPassword.trim() || !database.trim() || !port) {
      setDatabaseMessage({ type: "error", text: "All database fields are required." });
      return;
    }

    setTestLoading(true);
    setDatabaseMessage(null);

    try {
      const response = await emailServiceApi.testConnection({
        server,
        port,
        user: dbUser,
        password: dbPassword,
        database
      });

      if (response?.success) {
        setConnectionTested(true);
        setDatabaseMessage({ type: "success", text: "Connection successful." });
      } else {
        setConnectionTested(false);
        setDatabaseMessage({
          type: "error",
          text: response?.message || "Connection failed."
        });
      }
    } catch (error: any) {
      setConnectionTested(false);
      setDatabaseMessage({
        type: "error",
        text: error.response?.data?.message || "Connection test failed."
      });
    } finally {
      setTestLoading(false);
    }
  };

  const normalizeTimeValue = (value: string) => {
    if (!value) return "";
    if (value.includes(":")) return value;
    const paddedValue = value.padStart(4, "0");
    if (paddedValue.length === 4) {
      return `${paddedValue.slice(0, 2)}:${paddedValue.slice(2, 4)}`;
    }
    return value;
  };

  const sleep = (milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

  const handleSaveDatabaseConfig = async () => {
    if (!connectionTested) {
      setDatabaseMessage({ type: "error", text: "Please test the connection first." });
      return;
    }

    setDbSaveLoading(true);
    setDatabaseMessage(null);

    try {
      await emailServiceApi.saveDatabaseConfig({
        server,
        port,
        user: dbUser,
        password: dbPassword,
        database
      });
      setDatabaseMessage({ type: "success", text: "Database configuration saved." });
    } catch (error: any) {
      setDatabaseMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to save database configuration."
      });
    } finally {
      setDbSaveLoading(false);
    }
  };

  const handleSaveEmailConfig = async () => {
    if (
      !startTime ||
      !endTime ||
      !intervalUnit ||
      !Number.isFinite(interval) ||
      interval <= 0 ||
      !Number.isFinite(dbRequestTimeout) ||
      dbRequestTimeout <= 0 ||
      !Number.isFinite(dbConnectionTimeout) ||
      dbConnectionTimeout <= 0
    ) {
      setEmailMessage({ type: "error", text: "All email configuration fields are required." });
      return;
    }

    if (intervalUnit === "hours" && interval >= 24) {
      setEmailMessage({ type: "error", text: "Interval must be less than 24 hours." });
      return;
    }

    if (intervalUnit === "minutes" && interval >= 60) {
      setEmailMessage({ type: "error", text: "Interval must be less than 60 minutes." });
      return;
    }

    setEmailSaveLoading(true);
    setEmailMessage(null);
    setEmailProgress(10);
    setEmailProgressLabel("Saving email configuration...");

    try {
      const formatTime = (time: string) => time.replace(":", "");

      await emailServiceApi.saveEmailConfig({
        start_time: formatTime(startTime),
        end_time: formatTime(endTime),
        interval,
        interval_unit: intervalUnit,
        db_request_timeout: dbRequestTimeout,
        db_connection_timeout: dbConnectionTimeout,
        username: serviceUser,
        password: "admin"
      });

      setEmailProgress(25);
      setEmailProgressLabel("Email configuration saved. Waiting 5 seconds...");
      await sleep(5000);

      setEmailProgress(45);
      setEmailProgressLabel("Stopping service...");
      await emailServiceApi.serviceControl("stop", serviceUser);

      setEmailProgress(60);
      setEmailProgressLabel("Service stopped. Waiting 10 seconds...");
      await sleep(10000);

      setEmailProgress(80);
      setEmailProgressLabel("Starting service...");
      await emailServiceApi.serviceControl("start", serviceUser);

      setEmailProgress(90);
      setEmailProgressLabel("Service started. Waiting 5 seconds...");
      await sleep(5000);

      setEmailProgress(100);
      setEmailProgressLabel("Completed.");
      setEmailMessage({ type: "success", text: "Email configuration saved and service restarted." });
    } catch (error: any) {
      setEmailProgress(0);
      setEmailProgressLabel("");
      setEmailMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to save email configuration."
      });
    } finally {
      setEmailSaveLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    setDashboardMessage(null);

    try {
      const [dashboard, certificate, certs, pinStatus] = await Promise.all([
        emailServiceApi.getDashboard(),
        emailServiceApi.getCertificateStatus(),
        emailServiceApi.getCertificates(),
        emailServiceApi.getCertificatePinStatus(false)
      ]);

      setDashboardData(dashboard);
      setCertificateStatus(certificate);
      setCertificates(certs);
      setCertificatePinStatus(pinStatus);
    } catch (error: any) {
      setDashboardMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to fetch dashboard data."
      });
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleServiceControl = async (action: "start" | "stop") => {
    setActionLoading(true);
    setDashboardMessage(null);

    try {
      const response = await emailServiceApi.serviceControl(action, serviceUser);
      if (response?.success) {
        const actionLabel = action === "start" ? "started" : "stopped";
        setDashboardMessage({
          type: "success",
          text: response?.message || `Service ${actionLabel} successfully.`
        });
        await fetchDashboardData();
      } else {
        setDashboardMessage({
          type: "error",
          text: response?.message || `Failed to ${action} service.`
        });
      }
    } catch (error: any) {
      setDashboardMessage({
        type: "error",
        text: error.response?.data?.message || `Failed to ${action} service.`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditConfig = async () => {
    try {
      const config = await emailServiceApi.getCurrentConfig();
      const dbConfig = config?.config?.database?.config;
      const emailConfig = config?.config?.email?.config;

      if (dbConfig) {
        if (dbConfig.server !== undefined) setServer(String(dbConfig.server));
        if (dbConfig.port !== undefined) {
          const parsedPort = Number(dbConfig.port);
          setPort(Number.isFinite(parsedPort) ? parsedPort : 1433);
        }
        if (dbConfig.user !== undefined) setDbUser(String(dbConfig.user));
        if (dbConfig.password !== undefined) setDbPassword(String(dbConfig.password));
        if (dbConfig.database !== undefined) setDatabase(String(dbConfig.database));
      }

      if (emailConfig) {
        if (emailConfig.start_time !== undefined) {
          setStartTime(normalizeTimeValue(String(emailConfig.start_time)));
        }
        if (emailConfig.end_time !== undefined) {
          setEndTime(normalizeTimeValue(String(emailConfig.end_time)));
        }
        if (emailConfig.interval !== undefined) {
          const parsedInterval = Number(emailConfig.interval);
          if (Number.isFinite(parsedInterval)) {
            setInterval(parsedInterval);
          }
        }
        if (emailConfig.interval_unit !== undefined) {
          setIntervalUnit(String(emailConfig.interval_unit).toLowerCase());
        }
        if (emailConfig.db_request_timeout !== undefined) {
          const parsedTimeout = Number(emailConfig.db_request_timeout);
          if (Number.isFinite(parsedTimeout)) {
            setDbRequestTimeout(parsedTimeout);
          }
        }
        if (emailConfig.db_connection_timeout !== undefined) {
          const parsedTimeout = Number(emailConfig.db_connection_timeout);
          if (Number.isFinite(parsedTimeout)) {
            setDbConnectionTimeout(parsedTimeout);
          }
        }
      }

      setConnectionTested(false);
      setDatabaseMessage(null);
      setEmailMessage(null);
      setEmailProgress(0);
      setEmailProgressLabel("");
      setView("setup");
    } catch (error: any) {
      setDashboardMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to fetch config."
      });
    }
  };

  const handleCheckPings = async () => {
    if (pingLoading) return;
    setPingLoading(true);
    try {
      await fetchDashboardData();
    } finally {
      setPingLoading(false);
    }
  };

  const handleRefreshPinStatus = async () => {
    setPinLoading(true);
    try {
      const pinStatus = await emailServiceApi.getCertificatePinStatus(true);
      setCertificatePinStatus(pinStatus);
      setDashboardMessage({ type: "success", text: "PIN status refreshed successfully." });
    } catch (error: any) {
      setDashboardMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to refresh PIN status."
      });
    } finally {
      setPinLoading(false);
    }
  };

  const handleOpenPinModal = (cert: Certificate) => {
    setSelectedCertificate(cert);
    setPinInput("");
    setPinModalError(null);
    setShowPinModal(true);
  };

  const handleSavePin = async () => {
    if (!selectedCertificate || !pinInput) {
      setPinModalError("Please enter a PIN.");
      return;
    }

    setPinLoading(true);
    setPinModalError(null);
    setDashboardMessage(null);

    try {
      const entries = [
        {
          token_label: selectedCertificate.token_label || "",
          certificate_id: selectedCertificate.thumbprint,
          slot_id: selectedCertificate.slot_id || 0,
          pin: pinInput,
          certificate_subject: selectedCertificate.subject,
          certificate_serial: selectedCertificate.serial_number
        }
      ];

      const response = await emailServiceApi.storeCertificatePin(entries);

      if (Array.isArray(response)) {
        const result = response[0];
        if (result && !result.success) {
          setPinModalError(result.error || result.message || "Failed to save PIN.");
        } else if (result && result.success) {
          setDashboardMessage({ type: "success", text: "PIN saved successfully." });
          setShowPinModal(false);
          setPinInput("");
          setSelectedCertificate(null);
          setPinModalError(null);
          const pinStatus = await emailServiceApi.getCertificatePinStatus(true);
          setCertificatePinStatus(pinStatus);
        }
      } else if (response?.success) {
        setDashboardMessage({ type: "success", text: "PIN saved successfully." });
        setShowPinModal(false);
        setPinInput("");
        setSelectedCertificate(null);
        setPinModalError(null);
        const pinStatus = await emailServiceApi.getCertificatePinStatus(true);
        setCertificatePinStatus(pinStatus);
      } else {
        setPinModalError(response?.message || "Failed to save PIN.");
      }
    } catch (error: any) {
      setPinModalError(
        error.response?.data?.message || error.response?.data?.error || "Failed to save PIN."
      );
    } finally {
      setPinLoading(false);
    }
  };

  const getPinStatusForCertificate = (thumbprint: string) => {
    if (!certificatePinStatus || !certificatePinStatus.certificates) {
      return null;
    }
    return certificatePinStatus.certificates.find(
      (cert) => cert.certificate_id === thumbprint
    );
  };

  const inputStyle = {
    backgroundColor: colors.textInputBackground,
    borderColor: colors.textInputBorder,
    color: colors.textInputText
  };

  const cardStyle = {
    backgroundColor: colors.cardBackground,
    border: `1px solid ${colors.color3}`
  };

  if (view === "loading") {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh]"
        style={{ color: colors.text, fontFamily: fonts.content }}
      >
        <Loader />
      </div>
    );
  }

  if (view === "setup") {
    return (
      <div className="w-full" style={{ color: colors.text, fontFamily: fonts.content }}>
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 p-4 rounded-lg"
          style={cardStyle}
        >
          <h1 className="text-xl font-bold">Email Services Settings</h1>
          <button
            type="button"
            onClick={() => setView("dashboard")}
            className="px-4 py-2 rounded-lg text-white transition-colors"
            style={{
              backgroundColor: colors.buttonBackground,
              color: colors.buttonText
            }}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="max-w-5xl mx-auto">

          <div className="rounded-lg shadow-md p-6 mb-6" style={cardStyle}>
            <h2 className="text-lg font-semibold mb-4">Database Configuration</h2>
            {databaseMessage && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  databaseMessage.type === "success"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {databaseMessage.text}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">Server</label>
                <input
                  type="text"
                  value={server}
                  onChange={(event) => {
                    setServer(event.target.value);
                    setConnectionTested(false);
                    setDatabaseMessage(null);
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="block mb-2">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(event) => {
                    const nextPort = Number(event.target.value);
                    setPort(Number.isNaN(nextPort) ? 0 : nextPort);
                    setConnectionTested(false);
                    setDatabaseMessage(null);
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="block mb-2">DB User</label>
                <input
                  type="text"
                  value={dbUser}
                  onChange={(event) => {
                    setDbUser(event.target.value);
                    setConnectionTested(false);
                    setDatabaseMessage(null);
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="block mb-2">DB User Password</label>
                <input
                  type="password"
                  value={dbPassword}
                  onChange={(event) => {
                    setDbPassword(event.target.value);
                    setConnectionTested(false);
                    setDatabaseMessage(null);
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={inputStyle}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block mb-2">Database</label>
                <input
                  type="text"
                  value={database}
                  onChange={(event) => {
                    setDatabase(event.target.value);
                    setConnectionTested(false);
                    setDatabaseMessage(null);
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={inputStyle}
                  required
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col md:flex-row gap-4">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testLoading}
                className="flex-1 py-3 px-6 rounded-lg text-white font-semibold transition-colors"
                style={{ backgroundColor: "#d97706", opacity: testLoading ? 0.7 : 1 }}
              >
                {testLoading ? "Testing..." : "Test Connection"}
              </button>
              <button
                type="button"
                onClick={handleSaveDatabaseConfig}
                disabled={!connectionTested || dbSaveLoading}
                className="flex-1 py-3 px-6 rounded-lg text-white font-semibold transition-colors"
                style={{
                  backgroundColor: connectionTested ? "#16a34a" : "#9ca3af",
                  opacity: dbSaveLoading ? 0.7 : 1
                }}
              >
                {dbSaveLoading ? "Saving..." : "Save Database Config"}
              </button>
            </div>
          </div>

          <div className="rounded-lg shadow-md p-6 mb-6" style={cardStyle}>
            <h2 className="text-lg font-semibold mb-4">Email Configuration</h2>
            {emailMessage && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  emailMessage.type === "success"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {emailMessage.text}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => {
                    setStartTime(event.target.value);
                    setEmailMessage(null);
                    setEmailProgress(0);
                    setEmailProgressLabel("");
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="block mb-2">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => {
                    setEndTime(event.target.value);
                    setEmailMessage(null);
                    setEmailProgress(0);
                    setEmailProgressLabel("");
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="block mb-2">Interval</label>
                <input
                  type="number"
                  value={interval}
                  onChange={(event) => {
                    setInterval(Number(event.target.value));
                    setEmailMessage(null);
                    setEmailProgress(0);
                    setEmailProgressLabel("");
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="block mb-2">Interval Unit</label>
                <select
                  value={intervalUnit}
                  onChange={(event) => {
                    setIntervalUnit(event.target.value);
                    setEmailMessage(null);
                    setEmailProgress(0);
                    setEmailProgressLabel("");
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={inputStyle}
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
              <div>
                <label className="block mb-2">DB Request Timeout</label>
                <input
                  type="number"
                  value={dbRequestTimeout}
                  onChange={(event) => {
                    setDbRequestTimeout(Number(event.target.value));
                    setEmailMessage(null);
                    setEmailProgress(0);
                    setEmailProgressLabel("");
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label className="block mb-2">DB Connection Timeout</label>
                <input
                  type="number"
                  value={dbConnectionTimeout}
                  onChange={(event) => {
                    setDbConnectionTimeout(Number(event.target.value));
                    setEmailMessage(null);
                    setEmailProgress(0);
                    setEmailProgressLabel("");
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={inputStyle}
                  required
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col md:flex-row gap-4">
              <button
                type="button"
                onClick={handleSaveEmailConfig}
                disabled={emailSaveLoading}
                className="flex-1 py-3 px-6 rounded-lg text-white font-semibold transition-colors"
                style={{
                  backgroundColor: colors.buttonBackground,
                  color: colors.buttonText,
                  opacity: emailSaveLoading ? 0.7 : 1
                }}
              >
                {emailSaveLoading ? "Saving..." : "Save Email Config"}
              </button>
            </div>
            {(emailSaveLoading || emailProgress > 0) && (
              <div className="mt-4">
                <div className="h-2 rounded" style={{ backgroundColor: colors.background2 }}>
                  <div
                    className="h-2 rounded"
                    style={{
                      width: `${emailProgress}%`,
                      backgroundColor: "#16a34a"
                    }}
                  />
                </div>
                {emailProgressLabel && (
                  <p className="mt-2 text-sm text-gray-500">{emailProgressLabel}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ color: colors.text, fontFamily: fonts.content }}>
      <div
        className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-4 p-4 rounded-lg"
        style={cardStyle}
      >
        <h1 className="text-2xl font-bold">Email Services Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleEditConfig}
            className="px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
          >
            Edit Settings
          </button>
          <button
            type="button"
            onClick={handleCheckPings}
            disabled={pingLoading}
            className="px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: "#059669", opacity: pingLoading ? 0.7 : 1 }}
          >
            {pingLoading ? "Checking..." : "Check Pings"}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {dashboardMessage && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              dashboardMessage.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {dashboardMessage.text}
          </div>
        )}

        {dashboardLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader />
          </div>
        ) : (
          <>
            <div className="rounded-lg shadow-md p-6 mb-6" style={cardStyle}>
              <h2 className="text-xl font-semibold mb-4">Service Control</h2>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p>
                    Status:{" "}
                    <span
                      className={`font-semibold ${
                        dashboardData?.service.status === "running"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {dashboardData?.service.status || "unknown"}
                    </span>
                  </p>
                  {dashboardData?.service.started_at && (
                    <p className="text-sm text-gray-500">
                      Started: {moment(dashboardData.service.started_at).format("LLL")}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleServiceControl("start")}
                    disabled={dashboardData?.service.status === "running" || actionLoading}
                    className="px-6 py-2 rounded-lg text-white transition-colors"
                    style={{
                      backgroundColor:
                        dashboardData?.service.status === "running"
                          ? "#9ca3af"
                          : "#16a34a"
                    }}
                  >
                    Start
                  </button>
                  <button
                    type="button"
                    onClick={() => handleServiceControl("stop")}
                    disabled={dashboardData?.service.status !== "running" || actionLoading}
                    className="px-6 py-2 rounded-lg text-white transition-colors"
                    style={{
                      backgroundColor:
                        dashboardData?.service.status !== "running"
                          ? "#9ca3af"
                          : "#dc2626"
                    }}
                  >
                    Stop
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="rounded-lg shadow-md p-6" style={cardStyle}>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Total Processed</h3>
                <p className="text-3xl font-bold">
                  {dashboardData?.service.email_stats.total_processed || 0}
                </p>
              </div>
              <div className="rounded-lg shadow-md p-6" style={cardStyle}>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Total Sent</h3>
                <p className="text-3xl font-bold text-green-600">
                  {dashboardData?.service.email_stats.total_sent || 0}
                </p>
              </div>
              <div className="rounded-lg shadow-md p-6" style={cardStyle}>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Total Failed</h3>
                <p className="text-3xl font-bold text-red-600">
                  {dashboardData?.service.email_stats.total_failed || 0}
                </p>
              </div>
              <div className="rounded-lg shadow-md p-6" style={cardStyle}>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Pending</h3>
                <p className="text-3xl font-bold text-yellow-600">
                  {dashboardData?.service.email_stats.pending_count || 0}
                </p>
              </div>
            </div>

            <div className="rounded-lg shadow-md p-6 mb-6" style={cardStyle}>
              <h2 className="text-xl font-semibold mb-4">Database Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p>
                    Connection:{" "}
                    <span
                      className={`font-semibold ${
                        dashboardData?.database.connected
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {dashboardData?.database.connected ? "Connected" : "Disconnected"}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Server: {dashboardData?.database.server || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Database: {dashboardData?.database.database || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Last Checked:{" "}
                    {dashboardData?.database.last_checked
                      ? moment(dashboardData.database.last_checked).format("LLL")
                      : "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Response Time: {dashboardData?.database.response_time ?? 0}ms
                  </p>
                </div>
              </div>
              {dashboardData?.database.message && !dashboardData?.database.connected && (
                <div className="mt-4 p-3 rounded text-sm bg-red-100 text-red-700">
                  {dashboardData.database.message}
                </div>
              )}
            </div>

            <div className="rounded-lg shadow-md p-6 mb-6" style={cardStyle}>
              <h2 className="text-xl font-semibold mb-4">Schedule Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p>
                    Active Time: {dashboardData?.schedule.start_time || "N/A"} -{" "}
                    {dashboardData?.schedule.end_time || "N/A"}
                  </p>
                  <p>
                    Interval: {dashboardData?.schedule.interval ?? 0}{" "}
                    {dashboardData?.schedule.interval_unit || ""}
                  </p>
                </div>
                <div>
                  <p>
                    Within Schedule:{" "}
                    <span
                      className={`font-semibold ${
                        dashboardData?.schedule.within_schedule
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {dashboardData?.schedule.within_schedule ? "Yes" : "No"}
                    </span>
                  </p>
                  {dashboardData?.service.next_run && (
                    <p className="text-sm text-gray-500">
                      Next Run: {moment(dashboardData.service.next_run).format("LLL")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg shadow-md p-6 break-words mb-6" style={cardStyle}>
              <h2 className="text-xl font-semibold mb-4">USB Certificate Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p>
                    Available:{" "}
                    <span
                      className={`font-semibold ${
                        certificateStatus?.available ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {certificateStatus?.available ? "Yes" : "No"}
                    </span>
                  </p>
                  <p>
                    Token Present:{" "}
                    <span
                      className={`font-semibold ${
                        certificateStatus?.token_present
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {certificateStatus?.token_present ? "Yes" : "No"}
                    </span>
                  </p>
                  <p>
                    Certificate Found:{" "}
                    <span
                      className={`font-semibold ${
                        certificateStatus?.certificate_found
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {certificateStatus?.certificate_found ? "Yes" : "No"}
                    </span>
                  </p>
                </div>
                <div>
                  {certificateStatus?.token_label && (
                    <p className="text-sm text-gray-500">Token Label: {certificateStatus.token_label}</p>
                  )}
                  {certificateStatus?.certificate_subject && (
                    <p className="text-sm text-gray-500">
                      Subject: {certificateStatus.certificate_subject}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Library: {certificateStatus?.library_path || "N/A"}
                  </p>
                </div>
              </div>
              {certificateStatus?.error && (
                <div className="mt-4 p-3 rounded text-sm bg-red-100 text-red-700">
                  {certificateStatus.error}
                </div>
              )}
            </div>

            <div className="rounded-lg shadow-md p-6" style={cardStyle}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-xl font-semibold">Linked Certificates</h2>
                <button
                  type="button"
                  onClick={handleRefreshPinStatus}
                  disabled={pinLoading}
                  className="px-4 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: "#2563eb", opacity: pinLoading ? 0.7 : 1 }}
                >
                  {pinLoading ? "Refreshing..." : "Refresh PIN Status"}
                </button>
              </div>

              {certificates?.error && (
                <div className="mb-4 p-3 rounded text-sm bg-red-100 text-red-700">
                  {certificates.error}
                </div>
              )}

              <div className="mb-4 text-gray-500">
                Total Certificates: {certificates?.total_certificates || 0} (System:{" "}
                {certificates?.system_certificates.length || 0}, Hardware:{" "}
                {certificates?.hardware_certificates.length || 0})
              </div>

              {certificates && certificates.hardware_certificates.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Hardware Certificates</h3>
                  <div className="space-y-4">
                    {certificates.hardware_certificates.map((cert, index) => {
                      const pinStatus = getPinStatusForCertificate(cert.thumbprint);
                      return (
                        <div
                          key={`${cert.thumbprint}-${index}`}
                          className="border rounded-lg p-4 break-all"
                          style={{ borderColor: colors.color3 }}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-semibold text-gray-600">
                                Source: <span className="font-normal">{cert.source}</span>
                              </p>
                              <p className="text-sm font-semibold text-gray-600">
                                Token Label: <span className="font-normal">{cert.token_label}</span>
                              </p>
                              <p className="text-sm font-semibold text-gray-600">
                                Slot ID: <span className="font-normal">{cert.slot_id}</span>
                              </p>
                              <p className="text-sm text-gray-500 mt-2">Subject: {cert.subject}</p>
                              <p className="text-sm text-gray-500">Issuer: {cert.issuer}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Serial: {cert.serial_number}</p>
                              <p className="text-sm text-gray-500">
                                Valid From: {moment(cert.not_valid_before).format("LL")}
                              </p>
                              <p className="text-sm text-gray-500">
                                Valid Until: {moment(cert.not_valid_after).format("LL")}
                              </p>
                              <p className="text-sm text-gray-500">Thumbprint: {cert.thumbprint}</p>
                            </div>
                          </div>
                          {pinStatus && (
                            <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.color3 }}>
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="text-sm text-gray-600">
                                    PIN Configured:{" "}
                                    <span
                                      className={`font-semibold ${
                                        pinStatus.pin_configured ? "text-green-600" : "text-red-600"
                                      }`}
                                    >
                                      {pinStatus.pin_configured ? "Yes" : "No"}
                                    </span>
                                  </p>
                                  {pinStatus.pin_configured && (
                                    <>
                                      <p className="text-sm text-gray-600">
                                        PIN Valid:{" "}
                                        <span
                                          className={`font-semibold ${
                                            pinStatus.pin_valid ? "text-green-600" : "text-red-600"
                                          }`}
                                        >
                                          {pinStatus.pin_valid ? "Yes" : "No"}
                                        </span>
                                      </p>
                                      {pinStatus.pin_last_verified_at && (
                                        <p className="text-xs text-gray-500">
                                          Last Verified:{" "}
                                          {moment(pinStatus.pin_last_verified_at).format("LLL")}
                                        </p>
                                      )}
                                      {pinStatus.pin_last_error && (
                                        <p className="text-xs text-red-600">
                                          Error: {pinStatus.pin_last_error}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenPinModal(cert)}
                                  className="px-4 py-2 rounded-lg text-white transition-colors"
                                  style={{ backgroundColor: "#d97706" }}
                                >
                                  {pinStatus.pin_configured ? "Change PIN" : "Set PIN"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {certificates && certificates.system_certificates.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">System Certificates</h3>
                  <div className="space-y-4">
                    {certificates.system_certificates.map((cert, index) => (
                      <div
                        key={`${cert.thumbprint}-${index}`}
                        className="border rounded-lg p-4 break-all"
                        style={{ borderColor: colors.color3 }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-600">
                              Source: <span className="font-normal">{cert.source}</span>
                            </p>
                            <p className="text-sm font-semibold text-gray-600">
                              Store:{" "}
                              <span className="font-normal">
                                {cert.store_name} ({cert.store_location})
                              </span>
                            </p>
                            <p className="text-sm text-gray-500 mt-2">Subject: {cert.subject}</p>
                            <p className="text-sm text-gray-500">Issuer: {cert.issuer}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Serial: {cert.serial_number}</p>
                            <p className="text-sm text-gray-500">
                              Valid From: {moment(cert.not_valid_before).format("LL")}
                            </p>
                            <p className="text-sm text-gray-500">
                              Valid Until: {moment(cert.not_valid_after).format("LL")}
                            </p>
                            <p className="text-sm text-gray-500">Thumbprint: {cert.thumbprint}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!certificates ||
                (certificates.hardware_certificates.length === 0 &&
                  certificates.system_certificates.length === 0)) && (
                <div className="text-center py-8 text-gray-500">No certificates found.</div>
              )}
            </div>
          </>
        )}
      </div>

      {showPinModal && selectedCertificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-lg shadow-xl max-w-md w-full m-4" style={cardStyle}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {getPinStatusForCertificate(selectedCertificate.thumbprint)?.pin_configured
                    ? "Change"
                    : "Set"}{" "}
                  Certificate PIN
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput("");
                    setSelectedCertificate(null);
                    setPinModalError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close"
                >
                  X
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">
                  Token: {selectedCertificate.token_label || "N/A"}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Certificate: {selectedCertificate.subject.split(",")[0]}
                </p>
                <label className="block mb-2">Enter PIN</label>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(event) => setPinInput(event.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={inputStyle}
                  placeholder="Enter certificate PIN"
                  autoFocus
                />
                {pinModalError && (
                  <div className="mt-3 p-3 rounded text-sm bg-red-100 text-red-700">
                    {pinModalError}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleSavePin}
                  disabled={pinLoading || !pinInput}
                  className="flex-1 py-2 px-4 rounded-lg text-white font-semibold transition-colors"
                  style={{
                    backgroundColor: pinLoading || !pinInput ? "#9ca3af" : "#16a34a"
                  }}
                >
                  {pinLoading ? "Saving..." : "Save PIN"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput("");
                    setSelectedCertificate(null);
                    setPinModalError(null);
                  }}
                  className="flex-1 py-2 px-4 rounded-lg text-white font-semibold transition-colors"
                  style={{ backgroundColor: "#6b7280" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmailServices;
