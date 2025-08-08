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
// Define static route components
const staticRoutes: Record<string, React.ReactNode> = {
  dashboard: <Dashboard />,
  logout: <LogoutPage />,
  changepassword: <ChangePassword />,
  theme: <ThemePage />,
  downloads: <Downloads />,
  rekyc: <KycPage />,
  clientclosure:<AccountClosure/>,
  marginPledge: <MarginPledgeOnline />,
  ipo: <Ipo />,
  familymapping:<Family />,
  apiconfiguration:<ApiConfiguration/>
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
  const subSubRoute = unwrappedParams.slug[2];

  const componentName = subSubRoute || subRoute || route;


  // Handle static routes
  if (route in staticRoutes) {
    return staticRoutes[route];
  }
  if (subRoute in staticRoutes) {
    return staticRoutes[subRoute];
  }
  if (subSubRoute in staticRoutes) {
    return staticRoutes[subSubRoute];
  }

  // For dynamic routes, determine the actual componentName
  console.log('componentName_', componentName);
  console.log('route_', route);
  console.log('subRoute_', subRoute);
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
        console.log(item.componentType, 'componontType1');

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
  // console.log('componentName', componentName);
  // Show entry component if componentType is 'entry', otherwise show report component
  return (
    <DynamicReportComponent componentName={componentName} componentType={componentType} />
  );
}