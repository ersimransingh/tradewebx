"use client";
import React, { useEffect, useRef, useState, useId } from "react";
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
  FaUserCircle,
  FaSearch
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
  const navigationId = useId();
  const menuHeadingId = useId();
  const shouldShowLabels = isExpanded || isHovered || isMobileOpen;
  const navigationLabel = companyName ? `${companyName} primary navigation` : "Primary navigation";

  // State for managing open submenus
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filteredMenuItems = React.useMemo(() => {
    if (!searchQuery) return menuItems;

    const filterRecursive = (items: any[]): any[] => {
      return items.reduce((acc, item) => {
        const matchesName = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const hasSubItems = item.subItems && item.subItems.length > 0;
        
        let newSubItems: any[] = [];
        if (hasSubItems) {
          // If parent matches, show all children. Otherwise, filter children.
          if (matchesName) {
            newSubItems = item.subItems;
          } else {
            newSubItems = filterRecursive(item.subItems);
          }
        }

        if (matchesName || newSubItems.length > 0) {
          acc.push({
            ...item,
            subItems: newSubItems.length > 0 ? newSubItems : (hasSubItems ? [] : undefined)
          });
        }
        return acc;
      }, []);
    };

    return filterRecursive(menuItems);
  }, [menuItems, searchQuery]);

  useEffect(() => {
    if (searchQuery) {
      const newOpenSubmenus: Record<string, boolean> = {};
      
      const expandAll = (items: any[], parentPath: string = '') => {
        items.forEach((item, index) => {
          const currentPath = parentPath ? `${parentPath}-${index}` : `${index}`;
          if (item.subItems && item.subItems.length > 0) {
            newOpenSubmenus[currentPath] = true;
            expandAll(item.subItems, currentPath);
          }
        });
      };
      
      expandAll(filteredMenuItems);
      setOpenSubmenus(newOpenSubmenus);
    } else {
      setOpenSubmenus({});
    }
  }, [searchQuery, filteredMenuItems]);

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
    return items?.map((item, index) => {
      const currentPath = parentPath ? `${parentPath}-${index}` : `${index}`;
      const hasSubItems = item.subItems && item.subItems.length > 0;
      const isOpen = openSubmenus[currentPath];
      const uniqueKey = `${item.name}-${item.path || ''}-${currentPath}`;
      const isExternalUrl = item.componentType === 'URL';
      const submenuId = `submenu-${currentPath}`;

      return (
        <li key={uniqueKey} className="relative">
          {hasSubItems ? (
            <div className="w-full">
              <button
                type="button"
                onClick={() => handleSubmenuToggle(currentPath)}
                className={`menu-dropdown-item font-bold ${fontStyles.submenuItem} w-full text-left`}
                style={{
                  backgroundColor: isActive(item.path || '') ? colors.primary : 'transparent',
                  color: isActive(item.path || '') ? colors.buttonText : colors.text
                }}
                aria-expanded={!!isOpen}
                aria-controls={submenuId}
              >
                <span className={`font-bold ${shouldShowLabels ? "" : "sr-only"}`}>{item.name}</span>
                {shouldShowLabels && (
                  <span
                    className={`ml-auto w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    style={{
                      color: isActive(item.path || '') ? colors.buttonText : colors.text,
                    }}
                    aria-hidden="true"
                  >
                    {iconMap['chevron-down']}
                  </span>
                )}
              </button>
              <div
                id={submenuId}
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
                aria-hidden={!isOpen}
              >
                <ul className="mt-2 space-y-1 font-bold" role="list">
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
              <span>{item.name}</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <Link
              href={item.path || '#'}
              className={`menu-dropdown-item font-bold ${fontStyles.submenuItem}`}
              style={{
                backgroundColor: isActive(item.path || '') ? colors.primary : 'transparent',
                color: isActive(item.path || '') ? colors.buttonText : colors.text
              }}
              aria-current={isActive(item.path || '') ? 'page' : undefined}
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
    <ul className="flex flex-col gap-4 font-bold" role="list">
      {navItemsFromApi.map((nav, index) => {
        const currentPath = `${index}`;
        const isOpen = openSubmenus[currentPath];
        const uniqueKey = `${nav.name}-${nav.path || ''}-${currentPath}`;
        const isExternalUrl = nav.componentType === 'URL';
        // const submenuId = `submenu-${currentPath}`;
        const submenuId = `submenu-item-${currentPath}`;
        const sanitizedId = uniqueKey.replace(/[^a-zA-Z0-9_-]/g, '');
        const accessibleId = sanitizedId || `nav-link-${currentPath}`;

        return (
          <li key={uniqueKey} className="relative">
            {nav.subItems ? (
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => handleSubmenuToggle(currentPath)}
                  className={`menu-item group cursor-pointer ${fontStyles.menuItem} ${!isExpanded && !isHovered ? "lg:justify-start" : "lg:justify-start"}`}
                  style={{
                    backgroundColor: isOpen ? colors.primary : "transparent",
                    color: isOpen ? colors.buttonText : colors.text,
                  }}
                  aria-expanded={!!isOpen}
                  // aria-controls={submenuId}
                  aria-controls={shouldShowLabels ? submenuId : undefined} 
                >
                  <span
                    aria-hidden="true"
                    style={{
                      color: isOpen ? colors.buttonText : colors.text,
                    }}
                  >
                    {iconMap[nav.icon as keyof typeof iconMap] || iconMap["default-icon"]}
                  </span>
                  <span className={`font-bold ${shouldShowLabels ? "" : "sr-only"}`}>{nav.name}</span>
                  {shouldShowLabels && (
                    <span
                      className={`ml-auto w-5 h-5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      style={{
                        color: isOpen ? colors.buttonText : colors.text,
                      }}
                      aria-hidden="true"
                    >
                      {iconMap['chevron-down']}
                    </span>
                  )}
                </button>
                {shouldShowLabels && (
                  <div
                    id={submenuId}
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
                    aria-hidden={!isOpen}
                  >
                    <ul className="mt-2 space-y-1 font-bold" role="list">
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
                aria-describedby={`${accessibleId}-new-tab`}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: colors.text,
                  }}
                >
                  {iconMap[nav.icon as keyof typeof iconMap] || iconMap["default-icon"]}
                </span>
                <span className={`font-bold ${shouldShowLabels ? "" : "sr-only"}`}>{nav.name}</span>
                <span id={`${accessibleId}-new-tab`} className="sr-only"> (opens in a new tab)</span>
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
                  aria-current={isActive(nav.path) ? 'page' : undefined}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      color: isActive(nav.path) ? colors.buttonText : colors.text,
                    }}
                  >
                    {iconMap[nav.icon as keyof typeof iconMap] || iconMap["default-icon"]}
                  </span>
                  <span className={`font-bold ${shouldShowLabels ? "" : "sr-only"}`}>{nav.name}</span>
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
      id="app-sidebar"
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
          <Link href="/" aria-label={companyName ? `${companyName} home` : "Go to dashboard"}>
            <h1
              className={`${fontStyles.title} ${shouldShowLabels ? "" : "sr-only"}`}
              style={{ color: colors.text }}
            >
              {companyName || "Home"}
            </h1>
          </Link>
        </div>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav
          className="mb-6"
          aria-label={navigationLabel}
          aria-labelledby={menuHeadingId}
          aria-busy={menuStatus === 'loading'}
          id={navigationId}
        >
          <div className="flex flex-col gap-4">
            <div>
              <div className={`mb-2 px-2 ${(isExpanded || isHovered || isMobileOpen) ? "block" : "hidden"}`}>
                {(isExpanded || isHovered || isMobileOpen) && (
                   <div className="relative flex items-center bg-opacity-20 bg-white rounded-md px-2 py-1">
                    <input
                      type="text"
                      placeholder="Search Menu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-sm focus:outline-none placeholder-gray-400"
                      style={{ color: colors.text }}
                    />
                    <FaSearch className="ml-2" size={12} style={{ color: colors.text }} />
                  </div>
                )}
              </div>
              {menuStatus === 'loading' && <div className={fontStyles.menuItem}>Loading...</div>}
              {menuStatus === 'failed' && (
                <div className={fontStyles.menuItem} style={{ color: '#ef4444' }} role="alert">
                  Error: {menuError}
                </div>
              )}
              {menuStatus === 'succeeded' && renderMenuItems(filteredMenuItems)}
            </div>


          </div>
        </nav>
        {shouldShowLabels ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
