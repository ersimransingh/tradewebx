"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import SidebarWidget from "./SidebarWidget";
import { useTheme } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchMenuItems, selectAllMenuItems, selectMenuStatus, selectMenuError } from "@/redux/features/menuSlice";

// Font Awesome icons from react-icons/fa
import {
  FaHome,
  FaCalendar,
  FaUser,
  FaList,
  FaTable,
  FaFileAlt,
  FaCubes,
  FaChevronDown,
  FaTh,
  FaEllipsisH,
  FaFile,
  FaChartPie,
  FaPlug,
  FaUserCircle
} from 'react-icons/fa';

import { PATH_URL } from "@/utils/constants";
import { BASE_URL } from "@/utils/constants";
import { fetchInitializeLogin } from "@/redux/features/common/commonSlice";
import { getLocalStorage } from "@/utils/helper";

const iconMap = {
  'home': <FaHome />,
  'area-graph': <FaTable />,
  'report': <FaList />,
  'password': <FaUser />,
  'download': <FaFileAlt />,
  'theme-light-dark': <FaTh />,
  'logout': <FaUser />,
  'default-icon': <FaList />,
  'box-cube': <FaCubes />,
  'calender': <FaCalendar />,
  'chevron-down': <FaChevronDown />,
  'grid': <FaTh />,
  'horizontal-dots': <FaEllipsisH />,
  'list': <FaList />,
  'page': <FaFile />,
  'pie-chart': <FaChartPie />,
  'plug-in': <FaPlug />,
  'table': <FaTable />,
  'user-circle': <FaUserCircle />,
};


type SubMenuItem = {
  name: string;
  path?: string;
  pro?: boolean;
  new?: boolean;
  componentName: string;
  componentType?: string;
  pageData?: any[];
  subItems?: SubMenuItem[];
};

type NavItem = {
  name: string;
  icon: string;
  path?: string;
  componentName: string;
  componentType?: string;
  pageData?: any[];
  subItems?: SubMenuItem[];
};


const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { colors, fonts } = useTheme();
  const dispatch = useAppDispatch();
  const menuItems = useAppSelector(selectAllMenuItems);
  const menuStatus = useAppSelector(selectMenuStatus);
  const menuError = useAppSelector(selectMenuError);
  const { companyLogo, companyName, companyInfo } = useAppSelector((state) => state.common);

  // State for managing open submenus
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Font styling class for consistent typography
  const fontStyles = {
    title: "text-xl font-bold",
    menuHeader: "text-xs uppercase leading-[20px]",
    menuItem: "text-sm font-medium",
    submenuItem: "text-xs font-bold",
    badge: "text-xs font-semibold",
  };

  useEffect(() => {
    if (!companyLogo) {
      dispatch(fetchInitializeLogin());
    }
  }, [dispatch, companyLogo]);

  useEffect(() => {
    if (menuStatus === 'idle') {
      // Check if auth_token is available before calling menu API
      let retryCount = 0;
      const maxRetries = 10; // Maximum 5 seconds of retrying
      let timeoutId: NodeJS.Timeout;

      const checkTokenAndFetchMenu = () => {
        const authToken = getLocalStorage('auth_token');
        const userId = getLocalStorage('userId');
        const userType = getLocalStorage('userType');

        if (authToken && userId && userType) {
          console.log('✅ Auth token found, fetching menu items');
          dispatch(fetchMenuItems());
        } else if (retryCount < maxRetries) {
          retryCount++;
          console.log(`⏳ Auth token not ready, retrying in 500ms... (attempt ${retryCount}/${maxRetries})`, {
            authToken: !!authToken,
            userId: !!userId,
            userType: !!userType
          });
          // Retry after a short delay to allow token setup to complete
          timeoutId = setTimeout(checkTokenAndFetchMenu, 500);
        } else {
          console.warn('❌ Failed to fetch menu items after maximum retries - token not available');
        }
      };

      checkTokenAndFetchMenu();

      // Cleanup function to clear timeout if component unmounts
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [menuStatus, dispatch]);

  function convertToNavItems(data: any) {
    return data.map(item => {
      // Map your component names to the routes you want to use
      const routeMapping: Record<string, string> = {
        'Dashboard': 'dashboard',
        'Reports': 'reports',
        // Add more mappings as needed
      };

      const basePath = `/${routeMapping[item.componentName] || item?.componentName?.toLowerCase().replace(/\s+/g, '-')}`;

      const navItem: NavItem = {
        icon: item.icon,
        name: item.title,
        path: basePath,
        componentName: item.componentName,
        componentType: item.componentType,
        pageData: item.pageData,
      };

      if (item.submenu && item.submenu.length > 0) {
        navItem.subItems = item.submenu.map((subItem: any) => ({
          name: subItem.title,
          path: `${basePath}/${subItem?.componentName?.toLowerCase().replace(/\s+/g, '-')}`,
          pro: false,
          componentName: subItem.componentName,
          componentType: subItem.componentType,
          pageData: subItem.pageData,
        }));
      }

      return navItem;
    });

  }

  // Calculate submenu height
  const getSubmenuHeight = (menuPath: string) => {
    const ref = subMenuRefs.current[menuPath];
    if (!ref) return 0;
    return ref.scrollHeight;
  };

  // Handle submenu toggle
  const handleSubmenuToggle = (menuPath: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [menuPath]: !prev[menuPath]
    }));
  };

  // Check if a path is active
  const isActive = (path: string) => {
    return pathname === path;
  };

  // Render nested menu items
  const renderNestedMenu = (items: any[], parentPath: string = '') => {
    return items.map((item, index) => {
      const currentPath = parentPath ? `${parentPath}-${index}` : `${index}`;
      const hasSubItems = item.subItems && item.subItems.length > 0;
      const isOpen = openSubmenus[currentPath];
      const uniqueKey = `${item.name}-${item.path || ''}-${currentPath}`;
      const isExternalUrl = item.componentType === 'URL';

      return (
        <li key={uniqueKey} className="relative">
          {hasSubItems ? (
            <div className="w-full">
              <button
                onClick={() => handleSubmenuToggle(currentPath)}
                className={`menu-dropdown-item font-bold ${fontStyles.submenuItem} w-full text-left`}
                style={{
                  backgroundColor: isActive(item.path || '') ? colors.primary : 'transparent',
                  color: isActive(item.path || '') ? colors.buttonText : colors.text
                }}
              >
                <span className="font-bold">{item.name}</span>
                <span
                  className={`ml-auto w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  style={{
                    color: isActive(item.path || '') ? colors.buttonText : colors.text,
                  }}
                >
                  {iconMap['chevron-down']}
                </span>
              </button>
              <div
                ref={(el) => {
                  if (el) {
                    subMenuRefs.current[currentPath] = el;
                  }
                }}
                className="overflow-hidden"
                style={{
                  display: isOpen ? 'block' : 'none',
                  paddingLeft: '1rem'
                }}
              >
                <ul className="mt-2 space-y-1 font-bold">
                  {renderNestedMenu(item.subItems, currentPath)}
                </ul>
              </div>
            </div>
          ) : isExternalUrl ? (
            <a
              href={item.path || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`menu-dropdown-item font-bold ${fontStyles.submenuItem}`}
              style={{
                backgroundColor: 'transparent',
                color: colors.text
              }}
            >
              {item.name}
            </a>
          ) : (
            <Link
              href={item.path || '#'}
              className={`menu-dropdown-item font-bold ${fontStyles.submenuItem}`}
              style={{
                backgroundColor: isActive(item.path || '') ? colors.primary : 'transparent',
                color: isActive(item.path || '') ? colors.buttonText : colors.text
              }}
            >
              {item.name}
            </Link>
          )}
        </li>
      );
    });
  };

  // Render main menu items
  const renderMenuItems = (navItemsFromApi: NavItem[]) => (
    <ul className="flex flex-col gap-4 font-bold">
      {navItemsFromApi.map((nav, index) => {
        const currentPath = `${index}`;
        const isOpen = openSubmenus[currentPath];
        const uniqueKey = `${nav.name}-${nav.path || ''}-${currentPath}`;
        const isExternalUrl = nav.componentType === 'URL';

        return (
          <li key={uniqueKey} className="relative">
            {nav.subItems ? (
              <div className="w-full">
                <button
                  onClick={() => handleSubmenuToggle(currentPath)}
                  className={`menu-item group cursor-pointer ${fontStyles.menuItem} ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                  style={{
                    backgroundColor: isOpen ? colors.primary : "transparent",
                    color: isOpen ? colors.buttonText : colors.text,
                  }}
                >
                  <span
                    style={{
                      color: isOpen ? colors.buttonText : colors.text,
                    }}
                  >
                    {iconMap[nav.icon as keyof typeof iconMap] || iconMap["default-icon"]}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="font-bold">{nav.name}</span>
                  )}
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span
                      className={`ml-auto w-5 h-5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      style={{
                        color: isOpen ? colors.buttonText : colors.text,
                      }}
                    >
                      {iconMap['chevron-down']}
                    </span>
                  )}
                </button>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <div
                    ref={(el) => {
                      if (el) {
                        subMenuRefs.current[currentPath] = el;
                      }
                    }}
                    className="overflow-hidden"
                    style={{
                      display: isOpen ? 'block' : 'none',
                      paddingLeft: '1rem'
                    }}
                  >
                    <ul className="mt-2 space-y-1 font-bold">
                      {renderNestedMenu(nav.subItems, currentPath)}
                    </ul>
                  </div>
                )}
              </div>
            ) : isExternalUrl && nav.path ? (
              <a
                href={nav.path}
                target="_blank"
                rel="noopener noreferrer"
                className={`menu-item group ${fontStyles.menuItem}`}
                style={{
                  backgroundColor: "transparent",
                  color: colors.text,
                }}
              >
                <span
                  style={{
                    color: colors.text,
                  }}
                >
                  {iconMap[nav.icon as keyof typeof iconMap] || iconMap["default-icon"]}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="font-bold">{nav.name}</span>
                )}
              </a>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`menu-item group ${fontStyles.menuItem}`}
                  style={{
                    backgroundColor: isActive(nav.path) ? colors.primary : "transparent",
                    color: isActive(nav.path) ? colors.buttonText : colors.text,
                  }}
                >
                  <span
                    style={{
                      color: isActive(nav.path) ? colors.buttonText : colors.text,
                    }}
                  >
                    {iconMap[nav.icon as keyof typeof iconMap] || iconMap["default-icon"]}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="font-bold">{nav.name}</span>
                  )}
                </Link>
              )
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 h-screen z-50
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      style={{
        backgroundColor: colors.background,
        borderRight: `1px solid ${colors.color3}`,
        color: colors.text,
        fontFamily: fonts.sidebar,
        fontWeight: 'bold'
      }}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >

      <div
        className={`py-8 flex flex-col ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <div>
          {companyInfo?.CompanyLogo && (
            <Image
              src={companyInfo.CompanyLogo.startsWith('data:')
                ? companyInfo.CompanyLogo
                : `data:image/png;base64,${companyInfo.CompanyLogo}`}
              alt="Company Logo"
              width={64}
              height={64}
              className="h-6 w-auto object-contain"
              priority
            />
          )}
        </div>
        <div>
          <Link href="/">
            {isExpanded || isHovered || isMobileOpen ? (
              <h1 className={fontStyles.title} style={{ color: colors.text }}>
                {companyName}
              </h1>
            ) : (
              <></>
            )}
          </Link>
        </div>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 ${fontStyles.menuHeader} flex ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
                style={{ color: colors.color3 }}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <span>{iconMap['horizontal-dots']}</span>
                )}
              </h2>
              {menuStatus === 'loading' && <div className={fontStyles.menuItem}>Loading...</div>}
              {menuStatus === 'failed' && (
                <div className={fontStyles.menuItem} style={{ color: '#ef4444' }}>
                  Error: {menuError}
                </div>
              )}
              {menuStatus === 'succeeded' && renderMenuItems(menuItems)}
            </div>


          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
