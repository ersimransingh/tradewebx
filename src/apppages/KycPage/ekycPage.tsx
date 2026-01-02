"use client";
import React, { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAppSelector } from "@/redux/hooks";
import { selectAllMenuItems } from "@/redux/features/menuSlice";
import { ACTION_NAME, BASE_URL, PATH_URL } from "@/utils/constants";
import { findPageData, getLocalStorage, storeLocalStorage } from "@/utils/helper";
import Loader from "@/components/Loader";
import { buildTabs } from "./KycTabs";
import { FiRefreshCcw } from "react-icons/fi";
import { useSaveLoading } from "@/context/SaveLoadingContext";
import apiService from "@/utils/apiService";

// IndexedDB setup
const DB_NAME = 'ekycDB';
const DB_VERSION = 1;
const STORE_NAME = 'ekycData';

const Kyc = () => {
    const { colors, fonts } = useTheme();
    const { isSaving } = useSaveLoading();
    const menuItems = useAppSelector(selectAllMenuItems);
    const pageData: any = findPageData(menuItems, "rekyc");

    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("personal");
    const [dynamicData, setDynamicData] = useState({
        personalTabData: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
        bankTabData: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
        dematTabData: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
        nomineeTabData: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
        segmentTabData: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
        attachments: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
        _lastUpdated: null
    });
    const [db, setDb] = useState<IDBDatabase | null>(null);

    // Initialize IndexedDB
    useEffect(() => {
        const initDB = async () => {
            return new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };

                request.onsuccess = () => {
                    const db = request.result;
                    setDb(db);
                    resolve(db);
                };

                request.onerror = () => {
                    console.error("IndexedDB error:", request.error);
                    reject(request.error);
                };
            });
        };

        const loadInitialData = async () => {
            try {
                const db = await initDB();

                // Load active tab
                const tab = await new Promise<string>((resolve) => {
                    const transaction = db.transaction(STORE_NAME, 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.get('activeTab');

                    request.onsuccess = () => {
                        resolve(request.result || "personal");
                    };

                    request.onerror = () => resolve("personal");
                });
                setActiveTab(tab);

                // Load dynamic data
                const data = await new Promise<any>((resolve) => {
                    const transaction = db.transaction(STORE_NAME, 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.get('dynamicData');

                    request.onsuccess = () => {
                        const result = request.result || {
                            personalTabData: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
                            bankTabData: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
                            dematTabData: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
                            nomineeTabData: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
                            segmentTabData: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
                            attachments: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
                            _lastUpdated: null
                        };
                        setLastUpdated(result._lastUpdated || null);
                        resolve(result);
                    };

                    request.onerror = () => resolve({
                        personalTabData: { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} },
                        // ... other initial tabs
                    });
                });
                setDynamicData(data);
            } catch (error) {
                console.error("Failed to initialize IndexedDB:", error);
            }
        };

        loadInitialData();
    }, []);

    // Save data to IndexedDB when it changes
    useEffect(() => {
        if (!db) return;

        const saveData = async () => {
            try {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);

                store.put(activeTab, 'activeTab');
                store.put(dynamicData, 'dynamicData');
            } catch (error) {
                console.error("Failed to save to IndexedDB:", error);
            }
        };

        saveData();
    }, [dynamicData, activeTab, db]);

    const fetchFormData = async (viewMode: boolean = false) => {
        setIsLoading(true);
        try {
            const { MasterEntry = {} } = pageData && pageData[0]?.Entry || {};
            console.log("Check data", MasterEntry, pageData);
            const userData = getLocalStorage("rekycRowData_viewMode");
            const parsedUserData = userData ? JSON.parse(userData) : null;
            const isKeysPresent = Object.keys(MasterEntry || {}).length > 0;
            const payload = isKeysPresent ? MasterEntry?.X_Filter : {
                EntryName: parsedUserData?.EntryName || "Rekyc",
                ClientCode: parsedUserData?.ClientCode || getLocalStorage("clientCode"),
                FormNo: parsedUserData?.FormNo || ""
            };

            const xFilter = Object.entries(payload || {}).map(([k, v]) => {
                if (k === "FormNo") {
                    return `<${k}>${v === "##FormNo##" ? "" : v}</${k}>`;
                } else {
                    return `<${k}>${v}</${k}>`;
                }
            }).join("");

            const xmlData = `<dsXml>
                <J_Ui>"ActionName":"${ACTION_NAME}","Option":"Master_Edit"</J_Ui>
                <Sql></Sql>
                <X_Filter>${xFilter}</X_Filter>
                <J_Api>"UserId":"${getLocalStorage('userId') || 'ADMIN'}","AccYear":"${getLocalStorage('accYear') || '24'}","MyDbPrefix":"${getLocalStorage('myDbPrefix') || 'undefined'}","MemberCode":"${getLocalStorage('memberCode') || ''}","SecretKey":"${getLocalStorage('secretKey') || ''}","MenuCode":"${getLocalStorage('menuCode') || 27}","ModuleID":"${getLocalStorage('moduleID') || '27'}","MyDb":"${getLocalStorage('myDb') || 'undefined'}","DenyRights":"${getLocalStorage('denyRights') || ''}"</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

            const formData = response?.data?.data?.rs0 || [];
            const updatedData: any = { ...dynamicData, _lastUpdated: new Date().toISOString() };

            formData.forEach((tab: any) => {
                const keyMap: Record<string, keyof typeof updatedData> = {
                    PersonalDetails: "personalTabData",
                    BankDetails: "bankTabData",
                    DematDetails: "dematTabData",
                    NomineeDetails: "nomineeTabData",
                    SegmentDetails: "segmentTabData",
                    Attachments: "attachments"
                };
                const key = keyMap[tab.TabName as keyof typeof keyMap];
                if (key) {
                    updatedData[key] = {
                        formFields: tab.Data,
                        tableData: tab.tableData,
                        fieldsErrors: {},
                        Settings: tab.Settings || {}
                    };
                    if (key === "attachments") {
                        const isViewMode = tab?.Settings?.viewMode === "true";
                        if (isViewMode) {
                            storeLocalStorage("ekyc_viewMode", "true");
                            storeLocalStorage("ekyc_checker", "true");
                            storeLocalStorage("ekyc_submit", "true")
                        } else {
                            storeLocalStorage("ekyc_viewMode", "false");
                        }
                    }
                }
            });

            setDynamicData(updatedData);
            setLastUpdated(updatedData._lastUpdated);
        } catch (err) {
            console.error("Failed to fetch form data", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const viewMode = getLocalStorage("ekyc_viewMode_for_checker") === "true";
        fetchFormData(viewMode);
    }, []);

    const tabs = buildTabs(dynamicData, setDynamicData, setActiveTab, fetchFormData);

    return (
        <div className="p-4 pt-0" style={{ fontFamily: fonts.content }}>
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-bold" style={{ color: colors.text }}>KYC Verification</h1>
                <div className="flex items-center">
                    {lastUpdated && <span className="text-sm mr-4" style={{ color: colors.secondary }}>Last updated: {new Date(lastUpdated).toLocaleString()}</span>}
                    <button
                        onClick={() => fetchFormData(getLocalStorage("ekyc_viewMode_for_checker") === "true")}
                        className="px-3 py-1 text-sm rounded flex items-center"
                        style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}
                    >
                        <FiRefreshCcw />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="flex border-b relative" style={{ borderColor: colors.color3 }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        // onClick={()=>setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors duration-200 flex items-center gap-2 relative ${activeTab === tab.id
                            ? `text-${colors.primary} border-b-2`
                            : `text-${colors.tabText} hover:text-${colors.primary}`}`}
                        style={{
                            borderBottomColor: activeTab === tab.id ? colors.primary : 'transparent',
                            backgroundColor: activeTab === tab.id ? colors.buttonBackground : 'transparent'
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute -bottom-[7px] left-1/2 transform -translate-x-1/2 w-0 h-0" style={{
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: `6px solid ${colors.primary}`
                            }} />
                        )}
                    </button>
                ))}
            </div>

            {(isLoading || isSaving) ? (
                <div className="flex inset-0 flex items-center justify-center z-[200] h-[100vh]">
                    <Loader />
                </div>
            ) : (
                <div>{tabs.find(tab => tab.id === activeTab)?.content}</div>
            )}
        </div>
    );
};

export default Kyc;