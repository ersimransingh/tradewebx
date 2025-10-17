"use client";
import React from "react";
import Dashboard from "@/apppages/Dashboard";
import LogoutPage from "../(auth)/logout/page";
import DynamicReportComponent from "@/components/DynamicReportComponent";
import ChangePassword from "@/apppages/ChangePassword";
import ThemePage from "@/apppages/ThemePage";
import Downloads from "@/apppages/Downloads";
import { useAppSelector } from "@/redux/hooks";
import { selectAllMenuItems } from "@/redux/features/menuSlice";
import KycPage from "@/apppages/KycPage";
import MarginPledgeOnline from "@/apppages/MarginPledgeOnline";
import Ipo from "@/apppages/Ipo";
import AccountClosure from "@/apppages/KycPage/account-closure";
import Family from "@/apppages/FamilyMapping";
import ApiConfiguration from "@/apppages/ApiChecker";
import BodProcess from "@/apppages/BodProcess";
import UserAccessMenu from "@/apppages/UserAccessMenu";

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
};

export default function DynamicPage({ params }: { params: any | Promise<any> }) {
  const menuItems = useAppSelector(selectAllMenuItems);
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const route = unwrappedParams.slug[0];
  const subRoute = unwrappedParams.slug[1];
  const subSubRoute = unwrappedParams.slug[2];

  const componentName = subSubRoute || subRoute || route;

  console.log("Route debugging:", { route, subRoute, subSubRoute, componentName });
  console.log("Available static routes:", Object.keys(staticRoutes));
  console.log("Static routes object:", staticRoutes);

  // Handle static routes with simplified matching (removed kebab → camel conversion)
  const checkStaticRoute = (routeToCheck: string) => {
    if (!routeToCheck) return null;

    // Direct match
    if (routeToCheck in staticRoutes) {
      console.log("Direct match found for:", routeToCheck);
      return staticRoutes[routeToCheck];
    }

    // Case-insensitive match
    const lowerRoute = routeToCheck.toLowerCase();
    for (const [key, component] of Object.entries(staticRoutes)) {
      if (key.toLowerCase() === lowerRoute) {
        console.log("Case-insensitive match found:", key, "for route:", routeToCheck);
        return component;
      }
    }

    // CamelCase to kebab-case conversion match
    const kebabCaseRoute = routeToCheck
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "");

    if (kebabCaseRoute in staticRoutes) {
      console.log("Camel-to-kebab match found:", kebabCaseRoute, "for route:", routeToCheck);
      return staticRoutes[kebabCaseRoute];
    }

    return null;
  };

  // Check static routes in order of priority
  const staticComponent =
    checkStaticRoute(route) || checkStaticRoute(subRoute) || checkStaticRoute(subSubRoute);

  console.log("check static route", staticComponent, menuItems, route);

  if (staticComponent) {
    // Allow only if item exists in menu
    const existsInMenu = menuItems.some(
      (item: any) => item.componentName?.toLowerCase() === route.toLowerCase()
    );

    if (!existsInMenu) {
      return null;
    }

    console.log("Returning static component for:", componentName);
    return staticComponent;
  }

  console.log("No static route found, using dynamic component for:", componentName);

  // For dynamic routes, convert kebab-case to PascalCase if needed
  const formattedComponentName = componentName
      .split("-")
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

  // if route is present in the static route then skip the route for dynamic part
  const isStatic = Object.keys(staticRoutes).some(
      (key) => key.toLowerCase() === formattedComponentName.toLowerCase()
    );

    if (isStatic) {
      return null;
    }


  console.log("checkkkkkk", formattedComponentName, componentName);
  return <DynamicComponentRenderer componentName={formattedComponentName} />;
}

// Client component that determines whether to show report or entry view
function DynamicComponentRenderer({ componentName }: { componentName: string }) {
  const menuItems = useAppSelector(selectAllMenuItems);

  console.log("DynamicComponentRenderer called with:", componentName);
  console.log("Menu items:", menuItems);

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
    console.log("Static component detected in dynamic renderer:", componentName);
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
        console.log("Returning static component from dynamic renderer:", key);
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

  console.log("Component type:", componentType);

  const finalComponentType =
    componentType ||
    (componentName.toLowerCase().includes("multientry")
      ? "multientry"
      : componentName.toLowerCase().includes("entry")
      ? "entry"
      : componentName.toLowerCase().includes("report")
      ? "report"
      : componentType);

  console.log("Using DynamicReportComponent for:", componentName, "with type:", finalComponentType);

  return (
    <DynamicReportComponent componentName={componentName} componentType={finalComponentType} />
  );
}
