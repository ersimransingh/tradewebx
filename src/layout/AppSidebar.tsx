"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import axios from 'axios';
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";
import { useTheme } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchMenuItems, selectAllMenuItems, selectMenuStatus, selectMenuError } from "@/redux/features/menuSlice";


type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

import { FaHome, FaCalendar, FaUser, FaList, FaTable, FaFileAlt } from 'react-icons/fa';
import { PATH_URL } from "@/utils/constants";
import { BASE_URL } from "@/utils/constants";
import { fetchInitializeLogin } from "@/redux/features/common/commonSlice";
const iconMap = {
  'home': <FaHome />,
  'area-graph': <FaTable />,
  'report': <FaList />,
  'password': <FaUser />,
  'download': <FaFileAlt />,
  'theme-light-dark': <FaTable />, // Adjust as needed
  'logout': <FaUser />,
  'default-icon': <FaList />,           // Adjust as needed
  // Add more mappings based on your icons
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

  // Font styling class for consistent typography
  const fontStyles = {
    title: "text-xl font-bold",
    menuHeader: "text-xs uppercase leading-[20px]",
    menuItem: "text-sm font-medium",
    submenuItem: "text-xs font-normal",
    badge: "text-xs font-semibold",
  };

  useEffect(() => {
    if (!companyLogo) {
      dispatch(fetchInitializeLogin());
    }
  }, [dispatch, companyLogo]);

  useEffect(() => {
    if (menuStatus === 'idle') {
      dispatch(fetchMenuItems());
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

      const basePath = `/${routeMapping[item.componentName] || item.componentName.toLowerCase().replace(/\s+/g, '-')}`;

      const navItem: NavItem = {
        icon: item.icon,
        name: item.title,
        path: basePath
      };

      if (item.submenu && item.submenu.length > 0) {
        navItem.subItems = item.submenu.map((subItem: any) => ({
          name: subItem.title,
          path: `${basePath}/${subItem.componentName.toLowerCase().replace(/\s+/g, '-')}`,
          pro: false
        }));
      }

      return navItem;
    });
  }

  const renderMenuItems = (
    navItemsFromApi: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4 font-bold">
      {navItemsFromApi.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group cursor-pointer ${fontStyles.menuItem} ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                }`}
              style={{
                backgroundColor: openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? colors.primary
                  : 'transparent',
                color: openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? colors.buttonText
                  : colors.text
              }}
            >
              <span
                className="flex items-center justify-center w-6 h-6"
                style={{
                  color: openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? colors.buttonText
                    : colors.text
                }}
              >
                {iconMap[nav.icon as keyof typeof iconMap] || iconMap['default-icon']}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="font-bold">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "rotate-180"
                    : ""
                    }`}
                  style={{
                    color: openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? colors.buttonText
                      : colors.text
                  }}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${fontStyles.menuItem}`}
                style={{
                  backgroundColor: isActive(nav.path) ? colors.primary : 'transparent',
                  color: isActive(nav.path) ? colors.buttonText : colors.text
                }}
              >
                <span
                  className="flex items-center justify-center w-6 h-6"
                  style={{
                    color: isActive(nav.path) ? colors.buttonText : colors.text
                  }}
                >
                  {iconMap[nav.icon as keyof typeof iconMap] || iconMap['default-icon']}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="font-bold">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9 font-bold">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      style={{
                        backgroundColor: isActive(subItem.path) ? colors.primary : 'transparent',
                        color: isActive(subItem.path) ? colors.buttonText : colors.text
                      }}
                      className={`menu-dropdown-item font-bold ${fontStyles.submenuItem}`}
                    >
                      <span className="font-bold">{subItem.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => path === pathname;
  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive, menuItems]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 h-screen transition-all duration-300 ease-in-out z-50
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
              className="h-16 w-auto object-contain"
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
                  <HorizontaLDots />
                )}
              </h2>
              {menuStatus === 'loading' && <div className={fontStyles.menuItem}>Loading...</div>}
              {menuStatus === 'failed' && <div className={fontStyles.menuItem}>Error: {menuError}</div>}
              {menuStatus === 'succeeded' && (
                renderMenuItems(menuItems, "main")
              )}
            </div>


          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
