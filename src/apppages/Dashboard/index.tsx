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

const ReactApexChart = nextDynamic(() => import("react-apexcharts"), { ssr: false });



function Card({ cardData, onRefresh }: any) {
    const { colors } = useTheme();
    const [showDropdown, setShowDropdown] = useState(false);

    if (!cardData.grids && !cardData.loading) {
        return (
            <div style={{ backgroundColor: colors.cardBackground }} className="p-6 rounded-lg shadow-md">
                <div className="text-center">
                    <p style={{ color: colors.text }} className="mb-4">Failed to load data</p>
                    <button
                        onClick={onRefresh}
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
    const getLinkPath = (navigateTo: string) => {
        if (!navigateTo) return "";

        // Format the component name to match the dynamic routing pattern
        // Convert PascalCase or regular text to kebab-case
        const formattedPath = navigateTo
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();

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
                                    href={getLinkPath(chart.navigateTo)}
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
                                href={getLinkPath(chart.navigateTo)}
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
                                                        href={getLinkPath(item.navigateTo)}
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
                                                    href={getLinkPath(item.navigateTo)}
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
                                href={getLinkPath(cardData.navigateTo)}
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
                                            href={getLinkPath(grid.navigateTo)}
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
                                                            href={getLinkPath(item.navigateTo)}
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
                                                            href={getLinkPath(item.navigateTo)}
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const dispatch = useAppDispatch();
    const lastTradingDate = useAppSelector(state => state.common.lastTradingDate);
    const companyLogo = useAppSelector(state => state.common.companyLogo);

    const getDashboardData = async () => {
        setLoading(true);
        setError(false);
        try {
            const xmlData = `<dsXml>
                <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"DASHBOARD_F","Level":1, "RequestFrom":"W"</J_Ui>
                <Sql></Sql>
                <X_Filter>
                </X_Filter>
                <X_GFilter></X_GFilter>
                <J_Api>"UserId":"${localStorage.getItem('userId')}", "UserType":"${localStorage.getItem('userType')}"</J_Api>
            </dsXml>`;

            const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
                },
                timeout: 300000
            });
            console.log(response.data.data.rs0, 'response.data.data.rs0');
            setDashboardData(response.data.data.rs0 || []);
            setError(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError(true);
            setDashboardData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fetch dashboard data
        getDashboardData();

        // Fetch last trading date and company logo if not already in Redux store
        if (!lastTradingDate) {
            dispatch(fetchLastTradingDate());
        }

        if (!companyLogo) {
            dispatch(fetchInitializeLogin());
        }
    }, [dispatch, lastTradingDate, companyLogo]);

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
                        onClick={getDashboardData}
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
            className="container mx-auto"
            style={{ backgroundColor: colors?.background2 || '#f0f0f0' }}
        >
            <div className="space-y-4">
                {dashboardData && dashboardData.map((cardData: any, index: number) => (
                    <Card
                        key={index}
                        cardData={{
                            ...cardData,
                            onRefresh: getDashboardData,
                            loading: loading
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

export default Dashboard;