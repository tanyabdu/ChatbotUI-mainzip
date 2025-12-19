import { useState } from "react";
import Navigation, { type TabName } from "../Navigation";

export default function NavigationExample() {
  const [activeTab, setActiveTab] = useState<TabName | null>("generator");
  
  return (
    <Navigation 
      activeTab={activeTab} 
      onTabChange={(tab) => {
        setActiveTab(tab);
        console.log("Tab changed to:", tab);
      }} 
    />
  );
}
