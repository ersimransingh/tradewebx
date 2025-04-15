"use client";
import React from "react";
import Dashboard from "@/apppages/Dashboard";
import LogoutPage from "../(auth)/logout/page";
import DynamicReportComponent from "@/components/DynamicReportComponent";
import DynamicEntryComponent from "@/components/DynamicEntryComponent";
import ChangePassword from "@/apppages/ChangePassword";
import ThemePage from "@/apppages/ThemePage";
import Downloads from "@/apppages/Downloads";
import { useAppSelector } from "@/redux/hooks";
import { selectAllMenuItems } from "@/redux/features/menuSlice";

// Define static route components
const staticRoutes: Record<string, React.ReactNode> = {
  dashboard: <Dashboard />,
  logout: <LogoutPage />,
  changepassword: <ChangePassword />,
  theme: <ThemePage />,
  downloads: <Downloads />,
};

// Define the type for params explicitly
interface PageParams {
  slug: string[];
}

export default function DynamicPage({ params }: { params: any | Promise<any> }) {
  // Unwrap params using React.use() if it's a Promise
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const route = unwrappedParams.slug[0];
  const subRoute = unwrappedParams.slug[1];

  // Handle static routes
  if (staticRoutes[route]) {
    return staticRoutes[route];
  }

  // For dynamic routes, determine the actual componentName
  const componentName = subRoute || route;

  // Convert kebab-case to PascalCase if needed
  const formattedComponentName = componentName
    .split("-")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return <DynamicComponentRenderer componentName={formattedComponentName} />;
}

// Client component that determines whether to show report or entry view
function DynamicComponentRenderer({ componentName }: { componentName: string }) {
  const menuItems = useAppSelector(selectAllMenuItems);

  // Find the component in menu items and check its type
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
        }
      }
    }
    return undefined;
  };

  const componentType = findComponentType(menuItems);
  console.log('componentType', componentType);
  // Show entry component if componentType is 'entry', otherwise show report component
  return componentType === 'entry'
    ? <DynamicEntryComponent componentName={componentName} />
    : <DynamicReportComponent componentName={componentName} />;
}