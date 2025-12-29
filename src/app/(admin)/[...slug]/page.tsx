"use client";
import React from "react";
import Dashboard from "@/apppages/Dashboard";
import LogoutPage from "../(auth)/logout/page";
import DynamicReportComponent from "@/components/DynamicReportComponent";
import ChangePassword from "@/apppages/ChangePassword";
import ThemePage from "@/apppages/ThemePage";
import Downloads from "@/apppages/Downloads";
import EmailServices from "@/apppages/EmailServices";
import { useAppSelector } from "@/redux/hooks";
import { selectAllMenuItems, selectMenuStatus } from "@/redux/features/menuSlice";
import KycPage from "@/apppages/KycPage";
import MarginPledgeOnline from "@/apppages/MarginPledgeOnline";
import Ipo from "@/apppages/Ipo";
import AccountClosure from "@/apppages/KycPage/account-closure";
import Family from "@/apppages/FamilyMapping";
import ApiConfiguration from "@/apppages/ApiChecker";
import BodProcess from "@/apppages/BodProcess";
import UserAccessMenu from "@/apppages/UserAccessMenu";
import UploadFile from "@/apppages/UploadFile";
import QueryFormPage from "@/apppages/QueryForm";
// Define static route components
const staticRoutes: Record<string, React.ReactNode> = {
  dashboard: <Dashboard />,
  logout: <LogoutPage />,
  changepassword: <ChangePassword />,
  theme: <ThemePage />,
  downloads: <Downloads />,
  rekyc: <KycPage />,
  clientclosure: <AccountClosure />,
  marginPledge: <MarginPledgeOnline />,
  ipo: <Ipo />,
  familymapping: <Family />,
  apisetting: <ApiConfiguration />,
  bodProcess: <BodProcess />,
  useraccess: <UserAccessMenu />,
  uploadFile: <UploadFile />,
  queryform: <QueryFormPage />
};

export default function DynamicPage({ params }: { params: any | Promise<any> }) {
  const menuItems = useAppSelector(selectAllMenuItems);
  const menuStatus = useAppSelector(selectMenuStatus);
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const route = unwrappedParams.slug[0];
  const subRoute = unwrappedParams.slug[1];
  const subSubRoute = unwrappedParams.slug[2];

  const componentName = subSubRoute || subRoute || route;

  // Handle static routes with simplified matching
  const checkStaticRoute = (routeToCheck: string): { component: React.ReactNode; matchedKey: string } | null => {
    if (!routeToCheck) return null;

    // Direct match
    if (routeToCheck in staticRoutes) {
      return { component: staticRoutes[routeToCheck], matchedKey: routeToCheck };
    }

    // Case-insensitive match
    const lowerRoute = routeToCheck.toLowerCase();
    for (const [key, component] of Object.entries(staticRoutes)) {
      if (key.toLowerCase() === lowerRoute) {
        return { component, matchedKey: key };
      }
    }

    // CamelCase to kebab-case conversion match
    const kebabCaseRoute = routeToCheck
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "");

    if (kebabCaseRoute in staticRoutes) {
      return { component: staticRoutes[kebabCaseRoute], matchedKey: kebabCaseRoute };
    }

    return null;
  };

  // Check static routes in order of priority
  const staticRouteMatch =
    checkStaticRoute(route) || checkStaticRoute(subRoute) || checkStaticRoute(subSubRoute);

  if (staticRouteMatch) {
    const staticComponent = staticRouteMatch.component;
    const matchedRouteKey = staticRouteMatch.matchedKey.toLowerCase();

    // Whitelist: Routes that are always accessible (Dashboard, Logout, ChangePassword)
    const alwaysAccessibleRoutes = ['dashboard', 'logout', 'changepassword'];
    const isAlwaysAccessible = alwaysAccessibleRoutes.includes(matchedRouteKey);

    if (isAlwaysAccessible) {
      return staticComponent;
    }

    // Wait for menu to load before checking permissions
    if (menuStatus === 'loading' || menuStatus === 'idle') {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      );
    }

    // For all other static routes, check if they exist in the menu API response
    const existsInMenu = menuItems.some(
      (item: any) => {
        // Check main menu items
        if (item.componentName?.toLowerCase() === matchedRouteKey) {
          return true;
        }

        // Check sub-menu items
        if (item.subItems && Array.isArray(item.subItems)) {
          return item.subItems.some((subItem: any) => {
            if (subItem.componentName?.toLowerCase() === matchedRouteKey) {
              return true;
            }

            // Check sub-sub-menu items
            if (subItem.subItems && Array.isArray(subItem.subItems)) {
              return subItem.subItems.some((subSubItem: any) =>
                subSubItem.componentName?.toLowerCase() === matchedRouteKey
              );
            }

            return false;
          });
        }

        return false;
      }
    );

    if (!existsInMenu) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You do not have permission to access this page.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return staticComponent;
  }

  // For dynamic routes, convert kebab-case to PascalCase if needed
  const formattedComponentName = componentName
    .split("-")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  // If route is present in the static route then skip the route for dynamic part
  const isStatic = Object.keys(staticRoutes).some(
    (key) => key.toLowerCase() === formattedComponentName.toLowerCase()
  );

  if (isStatic) {
    return null;
  }

  return <DynamicComponentRenderer componentName={formattedComponentName} />;
}

// Client component that determines whether to show report or entry view
function DynamicComponentRenderer({ componentName }: { componentName: string }) {
  const menuItems = useAppSelector(selectAllMenuItems);
  const menuStatus = useAppSelector(selectMenuStatus);

  // Wait for menu to load before checking permissions
  if (menuStatus === 'loading' || menuStatus === 'idle') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if the dynamic route exists in the menu API
  const existsInMenu = menuItems.some((item: any) => {
    // Check main menu items
    if (item.componentName?.toLowerCase() === componentName.toLowerCase()) {
      return true;
    }

    // Check sub-menu items
    if (item.subItems && Array.isArray(item.subItems)) {
      const foundInSubItems = item.subItems.some((subItem: any) => {
        if (subItem.componentName?.toLowerCase() === componentName.toLowerCase()) {
          return true;
        }

        // Check sub-sub-menu items
        if (subItem.subItems && Array.isArray(subItem.subItems)) {
          return subItem.subItems.some((subSubItem: any) =>
            subSubItem.componentName?.toLowerCase() === componentName.toLowerCase()
          );
        }

        return false;
      });

      if (foundInSubItems) return true;
    }

    return false;
  });

  if (!existsInMenu) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You do not have permission to access this page.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Check if this is actually a static component
  const staticComponentKeys = Object.keys(staticRoutes);
  const isStaticComponent = staticComponentKeys.some(
    (key) =>
      key.toLowerCase() === componentName.toLowerCase() ||
      key.toLowerCase() === componentName.toLowerCase().replace(/-/g, "") ||
      key
        .toLowerCase()
        .replace(/([A-Z])/g, "-$1")
        .toLowerCase()
        .replace(/^-/, "") === componentName.toLowerCase()
  );

  if (isStaticComponent) {
    for (const [key, component] of Object.entries(staticRoutes)) {
      if (
        key.toLowerCase() === componentName.toLowerCase() ||
        key.toLowerCase() === componentName.toLowerCase().replace(/-/g, "") ||
        key
          .toLowerCase()
          .replace(/([A-Z])/g, "-$1")
          .toLowerCase()
          .replace(/^-/, "") === componentName.toLowerCase()
      ) {
        return component;
      }
    }
  }

  // Find the component type from menu items
  const findComponentType = (items: any[]): string | undefined => {
    for (const item of items) {
      if (item.componentName?.toLowerCase() === componentName.toLowerCase()) {
        return item.componentType;
      }

      if (item.subItems) {
        for (const subItem of item.subItems) {
          if (subItem.componentName?.toLowerCase() === componentName.toLowerCase()) {
            return subItem.componentType;
          }

          if (subItem.subItems) {
            for (const subSubItem of subItem.subItems) {
              if (subSubItem.componentName?.toLowerCase() === componentName.toLowerCase()) {
                return subSubItem.componentType;
              }
            }
          }
        }
      }
    }
    return undefined;
  };

  const componentType = findComponentType(menuItems);

  const finalComponentType =
    componentType ||
    (componentName.toLowerCase().includes("import")
      ? "import"
      : componentName.toLowerCase().includes("multientry")
        ? "multientry"
        : componentName.toLowerCase().includes("entry")
          ? "entry"
          : componentName.toLowerCase().includes("report")
            ? "report"
            : componentType);

  if (finalComponentType?.toLowerCase() === "emailservices") {
    return <EmailServices />;
  }

  return (
    <DynamicReportComponent componentName={componentName} componentType={finalComponentType} />
  );
}
