"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import nextDynamic from 'next/dynamic';
import { ApexOptions } from "apexcharts";
import Link from 'next/link';
import { useTheme } from "@/context/ThemeContext";
import { ACTION_NAME, PATH_URL } from '@/utils/constants';
import { BASE_URL } from '@/utils/constants';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchLastTradingDate, fetchInitializeLogin } from '@/redux/features/common/commonSlice';
import Select from 'react-select';
import CommonCustomDropdown from '@/components/form/DropDown/CommonDropDown';
import apiService from '@/utils/apiService';

const ReactApexChart = nextDynamic(() => import("react-apexcharts"), { ssr: false });



function Card({ cardData, onRefresh, selectedClient, auth }: any) {
    const { colors } = useTheme();
    const [showDropdown, setShowDropdown] = useState(false);

    if (!cardData.grids && !cardData.loading) {
        return (
            <div style={{ backgroundColor: colors.cardBackground }} className="p-6 rounded-lg shadow-md">
                <div className="text-center">
                    <p style={{ color: colors.text }} className="mb-4">Failed to load data</p>
                    <button
                        onClick={() => {
                            if (typeof onRefresh === 'function') {
                                onRefresh();
                            }
                        }}
                        style={{
                            backgroundColor: colors.buttonBackground,
                            color: colors.buttonText
                        }}
                        className="p-2 rounded-full hover:opacity-90"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    // Helper function to generate proper link path for navigateTo values
    const getLinkPath = (navigateTo: string, queryParams?: Record<string, string>) => {
        if (!navigateTo) return "";

        // Format the component name to match the dynamic routing pattern
        // Convert PascalCase or regular text to kebab-case
        const formattedPath = navigateTo
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();

        // If query parameters are provided, add them to the URL
        if (queryParams) {
            const queryString = new URLSearchParams(queryParams).toString();
            return `/${formattedPath}?${queryString}`;
        }

        return `/${formattedPath}`;
    };

    const renderPieChart = (pieData: any) => {
        if (!pieData) return null;

        return pieData.map((chart: any, index: number) => {
            const pieItems = chart.gridItems.filter((item: any) =>
                item.label.showPie !== false
            );

            if (pieItems.length === 0) return null;

            // Find the total item (if it exists)
            const totalItem = chart.gridItems.find((item: any) =>
                item.label.text.toLowerCase() === 'total'
            );

            const pieOptions: ApexOptions = {
                chart: {
                    type: 'donut',
                    background: colors.cardBackground,
                },
                labels: pieItems.map((item: any) => item.label.text),
                colors: pieItems.map((item: any) => item.label.pieColor),
                legend: {
                    show: false // Hide the built-in legend
                },
                plotOptions: {
                    pie: {
                        donut: {
                            size: '55%',
                        }
                    }
                },
                dataLabels: {
                    enabled: false
                },
                responsive: [{
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 200
                        }
                    }
                }]
            };

            const series = pieItems.map((item: any) => parseFloat(item.value.text) || 0);



            return (
                <div
                    key={index}
                    style={{ backgroundColor: colors.cardBackground }}
                    className="rounded-lg shadow-md mb-4"
                >
                    <div className="border-b p-4 flex justify-between items-center"
                        style={{ borderColor: colors.color3 }}>
                        <h3 className="text-lg font-bold" style={{ color: chart.color }}>
                            {chart.navigateTo ? (
                                <Link
                                    href={getLinkPath(chart.navigateTo, {
                                        clientCode: selectedClient?.value || '',
                                        userType: auth.userType || ''
                                    })}
                                    className="hover:underline flex items-center gap-2"
                                    style={{ color: colors.text }}
                                >
                                    {chart.name}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </Link>
                            ) : (
                                chart.name
                            )}
                        </h3>
                        {chart.navigateTo && (
                            <Link
                                href={getLinkPath(chart.navigateTo, {
                                    clientCode: selectedClient?.value || '',
                                    userType: auth.userType || ''
                                })}
                                style={{ color: colors.primary }}
                                className="text-sm hover:opacity-80"
                            >
                                View Details
                            </Link>
                        )}
                    </div>
                    <div className="p-4 flex">
                        <div className="w-1/2">
                            <ReactApexChart
                                options={pieOptions}
                                series={series}
                                type="donut"
                                height={200}
                            />
                        </div>
                        <div className="w-1/2 flex flex-col justify-center">
                            {/* Custom legend */}
                            <div className="space-y-2">
                                {pieItems.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div
                                                className="w-3 h-3 mr-2 rounded-full"
                                                style={{ backgroundColor: item.label.pieColor }}
                                            ></div>
                                            <span style={{ color: item.label.color || colors.text }}>
                                                {item.navigateTo ? (
                                                    <Link
                                                        href={getLinkPath(item.navigateTo, {
                                                            clientCode: selectedClient?.value || '',
                                                            userType: auth.userType || ''
                                                        })}
                                                        className="hover:underline"
                                                    >
                                                        {item.label.text}
                                                    </Link>
                                                ) : (
                                                    item.label.text
                                                )}
                                            </span>
                                        </div>
                                        <span style={{ color: item.value.color || colors.text }}>
                                            {item.navigateTo ? (
                                                <Link
                                                    href={getLinkPath(item.navigateTo, {
                                                        clientCode: selectedClient?.value || '',
                                                        userType: auth.userType || ''
                                                    })}
                                                    className="hover:underline"
                                                >
                                                    {item.value.text}
                                                </Link>
                                            ) : (
                                                item.value.text
                                            )}
                                        </span>
                                    </div>
                                ))}

                                {/* Show total if it exists */}
                                {totalItem && (
                                    <div className="flex items-center justify-between pt-2 mt-2 border-t" style={{ borderColor: colors.color3 }}>
                                        <span style={{ color: totalItem.label.color || colors.text, fontWeight: 'bold' }}>
                                            {totalItem.label.text}
                                        </span>
                                        <span style={{ color: totalItem.value.color || colors.text, fontWeight: 'bold' }}>
                                            {totalItem.value.text}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        });
    };

    return (
        <div
            style={{ backgroundColor: colors.cardBackground }}
            className="rounded-lg shadow-md mb-4 overflow-hidden"
        >
            {cardData.name && (
                <div
                    className="p-4 flex justify-between items-center"
                    style={{
                        backgroundColor: colors.primary,
                        color: colors.buttonText
                    }}
                >
                    <h2 className="font-bold">
                        {cardData.navigateTo ? (
                            <Link
                                href={getLinkPath(cardData.navigateTo, {
                                    clientCode: selectedClient?.value || '',
                                    userType: auth.userType || ''
                                })}
                                className="hover:underline flex items-center gap-2"
                            >
                                {cardData.name}
                                <span className="text-sm ml-2">{cardData.slogan}</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </Link>
                        ) : (
                            <>
                                {cardData.name}
                                <span className="text-sm ml-2">{cardData.slogan}</span>
                            </>
                        )}
                    </h2>
                </div>
            )}
            <div className="p-4">
                {renderPieChart(cardData.pieData)}

                {cardData.grids && (
                    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                        {cardData.grids.map((grid: any, index: number) => (
                            <div
                                key={index}
                                style={{ backgroundColor: colors.cardBackground }}
                                className="p-4 rounded-lg shadow"
                            >
                                <h3 className="font-bold mb-4" style={{ color: grid.color }}>
                                    {grid.navigateTo ? (
                                        <Link
                                            href={getLinkPath(grid.navigateTo, {
                                                clientCode: selectedClient?.value || '',
                                                userType: auth.userType || ''
                                            })}
                                            className="hover:underline flex items-center gap-2"
                                        >
                                            {grid.name}
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </Link>
                                    ) : (
                                        grid.name
                                    )}
                                </h3>
                                <div className="space-y-2">
                                    {grid.gridItems.map((item: any, itemIndex: number) => {
                                        // Determine if this grid item should have navigation
                                        // Either from the grid itself or from the individual item
                                        const navigateTo = item.navigateTo || grid.navigateTo;

                                        return (
                                            <div key={itemIndex} className="flex justify-between items-center">
                                                <span style={{ color: item.label.color }}>
                                                    {navigateTo && item.navigateTo ? (
                                                        <Link
                                                            href={getLinkPath(item.navigateTo, {
                                                                clientCode: selectedClient?.value || '',
                                                                userType: auth.userType || ''
                                                            })}
                                                            className="hover:underline flex items-center gap-2"
                                                        >
                                                            {item.label.text}
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                            </svg>
                                                        </Link>
                                                    ) : (
                                                        item.label.text
                                                    )}
                                                </span>
                                                <span style={{ color: item.value.color }}>
                                                    {navigateTo && item.navigateTo ? (
                                                        <Link
                                                            href={getLinkPath(item.navigateTo, {
                                                                clientCode: selectedClient?.value || '',
                                                                userType: auth.userType || ''
                                                            })}
                                                            className="hover:underline flex items-center gap-2"
                                                        >
                                                            {item.value.text}
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                            </svg>
                                                        </Link>
                                                    ) : (
                                                        item.value.text
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function Dashboard() {
    const { colors } = useTheme();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const dispatch = useAppDispatch();
    const lastTradingDate = useAppSelector(state => state.common.lastTradingDate);
    const companyLogo = useAppSelector(state => state.common.companyLogo);
    const [userDashData, setUserDashData] = useState([]);
    const auth = useAppSelector(state => state.auth);
    const [selectedClient, setSelectedClient] = useState<{ value: string; label: string } | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [dropdownChanged, setDropdownChanged] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    // Utility function to get session key for current user
    const getSessionKey = () => {
        const userId = localStorage.getItem('userId');
        return `dashboard_session_${userId}`;
    };

    // Utility function to check if session data is valid
    const isSessionDataValid = () => {
        const sessionKey = getSessionKey();
        const sessionData = sessionStorage.getItem(sessionKey);
        if (sessionData) {
            try {
                const parsed = JSON.parse(sessionData);
                // Check if session data is less than 24 hours old
                const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
                return isRecent && parsed.fetched;
            } catch (e) {
                return false;
            }
        }
        return false;
    };

    console.log(auth.userType, 'auth');
    console.log('🔧 Environment variables check:');
    console.log('BASE_URL:', BASE_URL);
    console.log('PATH_URL:', PATH_URL);
    console.log('Full URL would be:', `${BASE_URL}${PATH_URL}`);

    console.log("user data", userDashData);
    const getUserDashboardData = async () => {
        try {
            const userId = localStorage.getItem('userId');
            const userType = localStorage.getItem('userType') || '';

            console.log('🔍 getUserDashboardData called with:', { userId, userType });

            // Check if we already have data in sessionStorage for this session
            const sessionKey = getSessionKey();
            const cachedOptions = sessionStorage.getItem('userDashboardOptions');
            const sessionData = sessionStorage.getItem(sessionKey);

            console.log('🔍 Session check - cachedOptions exists:', !!cachedOptions);
            console.log('🔍 Session check - sessionData exists:', !!sessionData);
            console.log('🔍 Session check - isSessionDataValid:', isSessionDataValid());

            if (cachedOptions && isSessionDataValid()) {
                console.log('📦 Found cached dropdown options and session data, using cache for immediate display');
                console.log('📦 Cached data length:', cachedOptions.length);
                try {
                    const parsedOptions = JSON.parse(cachedOptions);
                    const parsedSessionData = JSON.parse(sessionData);
                    console.log('📦 Parsed options is array:', Array.isArray(parsedOptions));
                    console.log('📦 Parsed options length:', parsedOptions?.length);
                    if (Array.isArray(parsedOptions) && parsedOptions.length > 0) {
                        console.log('✅ Valid cached data found, showing cached data immediately');
                        setUserDashData(parsedOptions);

                        // Handle client selection with cached options
                        const savedClient = sessionStorage.getItem('selectedDashboardClient');
                        if (savedClient) {
                            try {
                                const parsedClient = JSON.parse(savedClient);
                                // Verify the saved client exists in the current options
                                const clientExists = parsedOptions.some(item => item.Value === parsedClient.value);
                                if (clientExists) {
                                    setSelectedClient(parsedClient);
                                } else {
                                    setSelectedClient({
                                        value: parsedOptions[0].Value,
                                        label: parsedOptions[0].DisplayName
                                    });
                                }
                            } catch (e) {
                                setSelectedClient({
                                    value: parsedOptions[0].Value,
                                    label: parsedOptions[0].DisplayName
                                });
                            }
                        } else {
                            setSelectedClient({
                                value: parsedOptions[0].Value,
                                label: parsedOptions[0].DisplayName
                            });
                        }

                        // Return early if we have valid session data - no need to fetch again
                        console.log('✅ Using cached session data, skipping API call');
                        return;
                    }
                } catch (e) {
                    console.error('Error parsing cached dropdown options:', e);
                    // Continue to fetch fresh data if parsing fails
                }
            }

            // Fetch fresh dropdown options only if not cached
            const xmlData1 = `
            <dsXml>
                <J_Ui>"ActionName":"Common","Option":"Search","RequestFrom":"W"</J_Ui>
                <Sql/>
                <X_Filter></X_Filter>
                <J_Api>"UserId":"${userId}","AccYear":24,"MyDbPrefix":"SVVS","MenuCode":7,"ModuleID":0,"MyDb":null,"DenyRights":null,"UserType":"${localStorage.getItem('userType')}"</J_Api>
            </dsXml>`;

            console.log('🌐 Making API call for fresh dropdown data...');
            console.log('📤 Request URL:', BASE_URL + PATH_URL);
            console.log('📤 Full URL:', `${BASE_URL}${PATH_URL}`);
            console.log('📤 Request payload:', xmlData1);

            // Set refreshing state for background update
            setIsRefreshingData(true);

            // Log curl equivalent for debugging
            console.log('🔧 CURL equivalent:');
            console.log(`curl -X POST "${BASE_URL}${PATH_URL}" \\`);
            console.log(`  -H "Content-Type: application/xml" \\`);
            console.log(`  -H "Authorization: Bearer ${localStorage.getItem('token')}" \\`);
            console.log(`  -d '${xmlData1.replace(/'/g, "'\\''")}'`);

            const startTime = Date.now();
            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData1);
            const endTime = Date.now();

            console.log('📥 API Response received in', endTime - startTime, 'ms');
            console.log('📥 Full response:', response);

            const result = response?.data?.data?.rs0;

            console.log('📊 Parsed result:', result);
            console.log('📊 Result type:', typeof result);
            console.log('📊 Is array:', Array.isArray(result));
            console.log('📊 Length:', result?.length);

            if (result && Array.isArray(result) && result.length > 0) {
                console.log('✅ Fresh dropdown data received, updating sessionStorage cache and state');
                setUserDashData(result);

                // Update the sessionStorage cache with fresh data
                sessionStorage.setItem('userDashboardOptions', JSON.stringify(result));
                sessionStorage.setItem(sessionKey, JSON.stringify({ fetched: true, timestamp: Date.now() }));

                // Only update selected client if we didn't have cached data or if the current selection is invalid
                if (!cachedOptions) {
                    // Check for saved client in sessionStorage
                    const savedClient = sessionStorage.getItem('selectedDashboardClient');
                    if (savedClient) {
                        try {
                            const parsedClient = JSON.parse(savedClient);
                            // Verify the saved client exists in the current options
                            const clientExists = result.some(item => item.Value === parsedClient.value);
                            if (clientExists) {
                                setSelectedClient(parsedClient);
                            } else {
                                // If saved client no longer exists, use the first one
                                setSelectedClient({
                                    value: result[0].Value,
                                    label: result[0].DisplayName
                                });
                            }
                        } catch (e) {
                            // If parsing fails, use the first client
                            setSelectedClient({
                                value: result[0].Value,
                                label: result[0].DisplayName
                            });
                        }
                    } else {
                        // If no saved client, use the first one
                        setSelectedClient({
                            value: result[0].Value,
                            label: result[0].DisplayName
                        });
                    }
                } else {
                    // If we had cached data, verify current selection is still valid
                    if (selectedClient) {
                        const clientExists = result.some(item => item.Value === selectedClient.value);
                        if (!clientExists) {
                            // Current selection is no longer valid, update to first available
                            setSelectedClient({
                                value: result[0].Value,
                                label: result[0].DisplayName
                            });
                        }
                    }
                }
            } else {
                console.warn('No fresh dashboard data received or data format incorrect');
                // Don't clear existing data if fresh data fails, keep using cached data
            }
        } catch (error) {
            console.error('Error fetching fresh dropdown data:', error);
            // Don't clear existing data if fresh data fails, keep using cached data
        } finally {
            // Clear refreshing state
            setIsRefreshingData(false);
        }
    };

    const getDashboardData = async () => {
        console.log('🔍 getDashboardData called with:', {
            selectedClient: selectedClient?.value,
            isInitialLoad,
            dropdownChanged
        });

        // Check if we have cached data for this client in sessionStorage
        if (selectedClient && !dropdownChanged && !isInitialLoad) {
            const cachedDataKey = `dashboardData_${selectedClient.value}`;
            const cachedData = sessionStorage.getItem(cachedDataKey);

            if (cachedData) {
                console.log('📦 Found cached dashboard data for client:', selectedClient.value);
                try {
                    const parsedData = JSON.parse(cachedData);
                    setDashboardData(parsedData);
                    setLoading(false);
                    setError(false);
                    return; // Use cached data, no need to fetch
                } catch (e) {
                    console.error('Error parsing cached dashboard data:', e);
                    // Continue to fetch fresh data if parsing fails
                }
            }
        }

        // Only show loader if data isn't already loaded or dropdown was changed
        if (isInitialLoad || dropdownChanged) {
            setLoading(true);
        }

        setError(false);
        try {
            const xmlData = `<dsXml>
                <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"DASHBOARD_F","Level":1, "RequestFrom":"W"</J_Ui>
                <Sql></Sql>
                <X_Filter>
                    ${selectedClient ? `<ClientCode>${selectedClient.value}</ClientCode>` : ''}
                </X_Filter>
                <X_GFilter></X_GFilter>
                <J_Api>"UserId":"${localStorage.getItem('userId')}", "UserType":"${localStorage.getItem('userType')}"</J_Api>
            </dsXml>`;

            console.log('🌐 Making API call for dashboard data...');
            console.log('📤 Request URL:', BASE_URL + PATH_URL);
            console.log('📤 Full URL:', `${BASE_URL}${PATH_URL}`);
            console.log('📤 Request payload:', xmlData);

            // Log curl equivalent for debugging
            console.log('🔧 CURL equivalent:');
            console.log(`curl -X POST "${BASE_URL}${PATH_URL}" \\`);
            console.log(`  -H "Content-Type: application/xml" \\`);
            console.log(`  -H "Authorization: Bearer ${localStorage.getItem('token')}" \\`);
            console.log(`  -d '${xmlData.replace(/'/g, "'\\''")}'`);

            const startTime = Date.now();
            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            const endTime = Date.now();

            console.log('📥 Dashboard API Response received in', endTime - startTime, 'ms');
            console.log('📥 Full dashboard response:', response);
            console.log('📊 Dashboard data:', response.data.data.rs0);

            const newData = response.data.data.rs0 || [];
            setDashboardData(newData);

            // Store the data in sessionStorage
            if (selectedClient) {
                sessionStorage.setItem(`dashboardData_${selectedClient.value}`, JSON.stringify(newData));
            }

            // Reset flags
            setIsInitialLoad(false);
            setDropdownChanged(false);
            setError(false);
        } catch (error) {
            console.error('❌ Error fetching dashboard data:', error);
            console.error('❌ Dashboard error details:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            setError(true);
            setDashboardData(null);
        } finally {
            setLoading(false);
        }
    };

    // Restore selected client from sessionStorage on component mount
    useEffect(() => {
        const savedClient = sessionStorage.getItem('selectedDashboardClient');
        if (savedClient) {
            try {
                const parsedClient = JSON.parse(savedClient);
                // Validate that the client data has the required structure
                if (parsedClient && parsedClient.value && parsedClient.label) {
                    setSelectedClient(parsedClient);
                    console.log('📦 Restored selected client from sessionStorage:', parsedClient);
                } else {
                    console.warn('Invalid client data structure in sessionStorage, clearing...');
                    sessionStorage.removeItem('selectedDashboardClient');
                }
            } catch (e) {
                console.error('Error parsing saved client from sessionStorage:', e);
                sessionStorage.removeItem('selectedDashboardClient');
            }
        }
    }, []);

    useEffect(() => {
        console.log('🔄 useEffect triggered with auth.userType:', auth.userType);
        console.log('🔍 Checking conditions:');
        console.log('- auth.userType === "branch":', auth.userType === 'branch');
        console.log('- auth.userType === "user":', auth.userType === 'user');
        console.log('- Combined condition:', auth.userType === 'branch' || auth.userType === 'user');

        if (auth.userType === 'branch' || auth.userType === 'user') {
            console.log('✅ Calling getUserDashboardData()');
            getUserDashboardData();
        } else {
            console.log('❌ getUserDashboardData() NOT called - userType condition not met');
            // For non-branch users, set initial load to true and get data
            setIsInitialLoad(true);
            getDashboardData();
        }

        if (!lastTradingDate) {
            dispatch(fetchLastTradingDate());
        }
        if (!companyLogo) {
            dispatch(fetchInitializeLogin());
        }
    }, [dispatch, lastTradingDate, companyLogo]);

    // Save selected client to sessionStorage whenever it changes
    useEffect(() => {
        if (selectedClient) {
            sessionStorage.setItem('selectedDashboardClient', JSON.stringify(selectedClient));
        }
    }, [selectedClient]);

    // Handle client selection changes and load data accordingly
    useEffect(() => {
        if (selectedClient && (auth.userType === 'branch' || auth.userType === 'user')) {
            // Check if we have persisted data for this client
            const persistedDataKey = `dashboardData_${selectedClient.value}`;
            const savedData = sessionStorage.getItem(persistedDataKey);

            if (savedData && !dropdownChanged && !isInitialLoad) {
                // Use persisted data if available and dropdown wasn't changed
                try {
                    const parsedData = JSON.parse(savedData);
                    setDashboardData(parsedData);
                    setLoading(false);
                } catch (e) {
                    console.error('Error parsing persisted data:', e);
                    // If parsing fails, fetch fresh data
                    getDashboardData();
                }
            } else {
                // Otherwise fetch fresh data
                getDashboardData();
            }
        }
    }, [selectedClient]);

    // Handler for dropdown change
    const handleClientChange = (value) => {
        if (value?.value !== selectedClient?.value) {
            setDropdownChanged(true);
            setSelectedClient(value);
        }
    };

    // Create a dedicated refresh function that can be passed to Card components
    const handleRefresh = useCallback(() => {
        // Clear persisted data for the current client
        if (selectedClient) {
            sessionStorage.removeItem(`dashboardData_${selectedClient.value}`);
        }

        // Force new data fetch with loader
        setIsInitialLoad(true);
        setDropdownChanged(true);
        setError(false);
        getDashboardData();
    }, [selectedClient]);

    // Debug function to clear cache and force fresh API call
    const clearCacheAndRefresh = useCallback(() => {
        console.log('🧹 Clearing sessionStorage cache and forcing fresh API call...');
        sessionStorage.removeItem('userDashboardOptions');
        sessionStorage.removeItem('selectedDashboardClient');
        // Clear all dashboard data cache
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
            if (key.startsWith('dashboardData_') || key.startsWith('dashboard_session_')) {
                sessionStorage.removeItem(key);
            }
        });
        setUserDashData([]);
        setSelectedClient(null);
        setIsInitialLoad(true);
        setDropdownChanged(true);
        setError(false);
        setIsRefreshingData(true);

        // Force fresh API call
        if (auth.userType === 'branch' || auth.userType === 'user') {
            console.log('🔄 Calling getUserDashboardData() after cache clear');
            getUserDashboardData();
        }
    }, [auth.userType]);

    // Function to clear session data on logout
    const clearSessionData = useCallback(() => {
        console.log('🧹 Clearing session data on logout...');
        sessionStorage.removeItem('userDashboardOptions');
        sessionStorage.removeItem('selectedDashboardClient');
        // Clear all dashboard data cache
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
            if (key.startsWith('dashboardData_') || key.startsWith('dashboard_session_')) {
                sessionStorage.removeItem(key);
            }
        });
    }, []);

    // Clear sessionStorage cache on mount and auth changes to ensure fresh data after login
    useEffect(() => {
        console.log('🔄 Clearing dashboard sessionStorage cache on mount/auth change...');
        clearSessionData();
        // Note: We don't clear the dashboard data cache here as it's handled in the data fetching logic
    }, [auth.userId, clearSessionData]); // Clear cache when user ID changes (login/logout)

    if (loading) {
        return (
            <div
                className="flex items-center justify-center min-h-screen"
                style={{ backgroundColor: colors?.background2 || '#f0f0f0' }}
            >
                <div className="text-center">
                    <div
                        className="animate-spin rounded-full h-12 w-12 border-b-2"
                        style={{ borderColor: colors.primary }}
                    ></div>
                    <p style={{ color: colors.text }} className="mt-4">
                        Loading dashboard...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div
                className="flex items-center justify-center min-h-screen"
                style={{ backgroundColor: colors?.background2 || '#f0f0f0' }}
            >
                <div className="text-center">
                    <p style={{ color: colors.text }} className="mb-4">
                        Failed to load dashboard data
                    </p>
                    <button
                        onClick={handleRefresh}
                        style={{
                            backgroundColor: colors.buttonBackground,
                            color: colors.buttonText
                        }}
                        className="p-2 rounded-full hover:opacity-90"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="container mx-auto p-4"
            style={{ backgroundColor: colors?.background2 || '#f0f0f0' }}
        >
            {(auth.userType === 'branch' || auth.userType === 'user') && (
                <div className="mb-4">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <CommonCustomDropdown
                                    options={userDashData.map(item => ({
                                        value: item.Value,
                                        label: item.DisplayName
                                    }))}
                                    value={selectedClient}
                                    onChange={handleClientChange}
                                    placeholder="Select client..."
                                    resetOnOpen={false}
                                    colors={{
                                        text: colors.text,
                                        primary: colors.primary,
                                        buttonText: colors.buttonText,
                                        color3: colors.color3,
                                        cardBackground: colors.cardBackground,
                                    }}
                                />
                                {isRefreshingData && (
                                    <div className="flex items-center gap-1 text-xs opacity-70">
                                        <div
                                            className="animate-spin rounded-full h-3 w-3 border-b-2"
                                            style={{ borderColor: colors.primary }}
                                        ></div>
                                        <span style={{ color: colors.text }}>Updating...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedClient && (
                            <Link
                                href={`/profile?userid=${selectedClient.value}`}
                                style={{
                                    backgroundColor: colors.primary,
                                    color: colors.buttonText
                                }}
                                className="px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                View Profile
                            </Link>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {dashboardData && dashboardData.map((cardData: any, index: number) => (
                    <Card
                        key={index}
                        cardData={{
                            ...cardData,
                            onRefresh: handleRefresh,
                            loading: loading
                        }}
                        onRefresh={handleRefresh}
                        selectedClient={selectedClient}
                        auth={auth}
                    />
                ))}
            </div>
        </div>
    );
}

export default Dashboard;