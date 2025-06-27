"use client";
import React, { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAppSelector } from "@/redux/hooks";
import { selectAllMenuItems } from "@/redux/features/menuSlice";
import { BASE_URL, PATH_URL } from "@/utils/constants";
import { findPageData } from "@/utils/helper";
import axios from "axios";
import Loader from "@/components/Loader";
import { buildTabs, TabData } from "./KycTabs";
import { FiRefreshCcw } from "react-icons/fi";
import { useSaveLoading } from "@/context/SaveLoadingContext";


const Kyc = () => {
    const { colors, fonts } = useTheme();
    const { isSaving } = useSaveLoading();
    const menuItems = useAppSelector(selectAllMenuItems);
    const pageData: any = findPageData(menuItems, "rekyc");

    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("ekyc_activeTab") || "personal";
        }
        return "personal";
    });

    const [dynamicData, setDynamicData] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("ekyc_dynamicData");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setLastUpdated(parsed._lastUpdated || null);
                    return parsed;
                } catch { }
            }
        }
        const emptyTab = { formFields: [], tableData: [], fieldsErrors: {}, Settings: {} };
        return {
            personalTabData: emptyTab,
            bankTabData: emptyTab,
            dematTabData: emptyTab,
            nomineeTabData: emptyTab,
            segmentTabData: emptyTab,
            attachments: emptyTab,
            _lastUpdated: null
        };
    });

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("ekyc_dynamicData", JSON.stringify(dynamicData));
            localStorage.setItem("ekyc_activeTab", activeTab);
        }
    }, [dynamicData, activeTab]);

    const fetchFormData = async () => {
        if (!pageData?.[0]?.Entry) return;
        setIsLoading(true);
        try {
            const { MasterEntry } = pageData[0].Entry;
            const jUi = Object.entries(MasterEntry.J_Ui || {}).map(([k, v]) => `"${k}":"${k === 'Option' ? 'Master_Edit' : v}"`).join(",");
            const jApi = Object.entries(MasterEntry.J_Api || {}).map(([k, v]) => `"${k}":"${v}"`).join(",");
            const xFilter = Object.entries(MasterEntry.X_Filter || {}).map(([k, v]) => `<${k}>${v}</${k}>`).join("");

            const xmlData = `<dsXml><J_Ui>${jUi}</J_Ui><Sql>${MasterEntry.sql || ""}</Sql><X_Filter>${xFilter}</X_Filter><J_Api>${jApi}</J_Api></dsXml>`;

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    Authorization: `Bearer ${document.cookie.split('auth_token=')[1]}`
                }
            });

            const formData = response?.data?.data?.rs0 || [];
            const updatedData = { ...dynamicData, _lastUpdated: new Date().toISOString() };

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
        fetchFormData();
    }, []);

    const tabs = buildTabs(dynamicData, setDynamicData, setActiveTab);

    return (
        <div className="p-4 pt-0" style={{ fontFamily: fonts.content }}>
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-bold" style={{ color: colors.text }}>KYC Verification</h1>
                <div className="flex items-center">
                    {lastUpdated && <span className="text-sm mr-4" style={{ color: colors.secondary }}>Last updated: {new Date(lastUpdated).toLocaleString()}</span>}
                    <button onClick={fetchFormData} className="px-3 py-1 text-sm rounded flex items-center" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>
                        <FiRefreshCcw />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="flex border-b relative" style={{ borderColor: colors.color3 }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
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
                <div className="mt-3">{tabs.find(tab => tab.id === activeTab)?.content}</div>
            )}
        </div>
    );
};

export default Kyc;
