"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import nextDynamic from 'next/dynamic';
import { ApexOptions } from "apexcharts";
import Link from 'next/link';
import { useTheme } from "@/context/ThemeContext";
import { ACTION_NAME, PATH_URL } from '@/utils/constants';
import { BASE_URL } from '@/utils/constants';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchLastTradingDate, fetchInitializeLogin } from '@/redux/features/common/commonSlice';
import AsyncSearchDropdown from  '@/components/form/DropDown/AsyncSearchDropdown';
import apiService from '@/utils/apiService';
import { encryptData, getLocalStorage } from '@/utils/helper';

const ReactApexChart = nextDynamic(() => import("react-apexcharts"), { ssr: false });



function Card({ cardData, onRefresh, selectedClient, auth }: any) {
    const { colors } = useTheme();
   
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
        const formattedPath = navigateTo
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();

        // If query parameters are provided, encrypt all values and add them to the URL
        if (queryParams) {
            // Encrypt all parameter values
            const encryptedParams: Record<string, string> = {};

            Object.entries(queryParams).forEach(([key, value]) => {
                if (value && value.trim() !== '') {
                    encryptedParams[key] = encryptData(value);
                } else {
                    encryptedParams[key] = value || '';
                }
            });

            const queryString = new URLSearchParams(encryptedParams).toString();
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
                        {/* <div className="w-1/2">
                            <ReactApexChart
                                options={pieOptions}
                                series={series}
                                type="donut"
                                height={200}
                            />
                        </div> */}
                    {/* start */}
                    <div className="w-1/2">
                    {/* Accessible wrapper for NVDA */}
                    <div
                        role="img"
                        tabIndex={0}
                        aria-label={`${chart.name} donut chart showing distribution`}
                        aria-describedby={`chart-desc-${index}`}
                        style={{ outline: "none" }}
                    >
                        <ReactApexChart
                        options={pieOptions}
                        series={series}
                        type="donut"
                        height={200}
                        />
                    </div>

                    {/* NVDA-readable chart summary */}
                    <p id={`chart-desc-${index}`} className="sr-only">
                        This chart shows:
                        {pieItems.map((item: any) => `${item.label.text}: ${item.value.text}. `)}
                        {totalItem ? `Total: ${totalItem.value.text}.` : ""}
                    </p>

                    {/* Screen-reader-only data table */}
                    <table className="sr-only">
                        <caption>{chart.name} chart data</caption>
                        <thead>
                        <tr>
                            <th>Label</th>
                            <th>Value</th>
                        </tr>
                        </thead>
                        <tbody>
                        {pieItems.map((item: any, i: number) => (
                            <tr key={i}>
                            <td>{item.label.text}</td>
                            <td>{item.value.text}</td>
                            </tr>
                        ))}
                        {totalItem && (
                            <tr>
                            <td>Total</td>
                            <td>{totalItem.value.text}</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                    </div>

                        {/* end */}
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
    const auth = useAppSelector(state => state.auth);
    const [selectedClient, setSelectedClient] = useState<{ value: string; label: string } | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [dropdownChanged, setDropdownChanged] = useState(false);
   
  
          const asyncFetchClients = useCallback(async (searchQuery: string) => {
              const userId = getLocalStorage("userId");
              const userType = getLocalStorage("userType");

              const xmlData = `
                <dsXml>
                  <J_Ui>"ActionName":"Common","Option":"Search","RequestFrom":"W"</J_Ui>
                  <Sql/>
                  <X_Filter_Multiple>
                    <SearchQuery>${searchQuery || ""}</SearchQuery>
                  </X_Filter_Multiple>
                  <X_Filter></X_Filter>
                  <J_Api>
                    "UserId":"${userId}",
                    "UserType":"${userType}"
                  </J_Api>
                </dsXml>`;

              const res = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);

              return (res?.data?.data?.rs0 || []).map((item: any) => ({
                value: item.Value,
                label: item.DisplayName,
              }));
            }, []);

    // const getDashboardData = async () => {
    const getDashboardData = useCallback(async () => {

        // Check if we have cached data for this client in sessionStorage
        if (selectedClient && !dropdownChanged && !isInitialLoad) {
            const cachedDataKey = `dashboardData_${selectedClient.value}`;
            const cachedData = sessionStorage.getItem(cachedDataKey);

            if (cachedData) {

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
                <J_Api>"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"</J_Api>
            </dsXml>`;

            // const startTime = Date.now();
            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            // const endTime = Date.now();

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
    // };
    }, [selectedClient,dropdownChanged,isInitialLoad]);

    // Restore selected client from sessionStorage on component mount
    useEffect(() => {
        const savedClient = sessionStorage.getItem('selectedDashboardClient');
        if (savedClient) {
            try {
                const parsedClient = JSON.parse(savedClient);
                // Validate that the client data has the required structure
                if (parsedClient && parsedClient.value && parsedClient.label) {
                    setSelectedClient(parsedClient);

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

        if (auth.userType === 'branch' || auth.userType === 'user') {

        } else {

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
    // }, [dispatch, lastTradingDate, companyLogo]);
    },[auth.userType,dispatch,lastTradingDate,companyLogo,getDashboardData]);

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
    // }, [selectedClient]);
     }, [selectedClient,auth.userType,dropdownChanged,isInitialLoad,getDashboardData]);

        const handleClientChange = useCallback(
          (v: { value: string; label: string } | null) => {
            if (v?.value !== selectedClient?.value) {
              setDropdownChanged(true);
              setSelectedClient(v);
            }
          },
          [selectedClient]
        );


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
    }, [selectedClient,getDashboardData]);

    // Function to clear session data on logout
    const clearSessionData = useCallback(() => {

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
                               <AsyncSearchDropdown
                                  value={selectedClient}
                                  onChange={handleClientChange}
                                  loadOptions={asyncFetchClients}
                                  placeholder="Search client…"
                                  colors={colors}
                                />
                            </div>
                        </div>

                        {selectedClient && selectedClient.value && (
                            <Link
                                href={`/profile?userid=${encryptData(selectedClient.value)}`}
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