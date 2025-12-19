import { useState } from "react";
import Header from "@/components/Header";
import Navigation, { type TabName } from "@/components/Navigation";
import WelcomeSection from "@/components/WelcomeSection";
import ContentGenerator from "@/components/ContentGenerator";
import ArchetypeQuiz from "@/components/ArchetypeQuiz";
import VoiceRecorder from "@/components/VoiceRecorder";
import CasesManager from "@/components/CasesManager";
import LunarCalendar from "@/components/LunarCalendar";
import MoneyTrainer from "@/components/MoneyTrainer";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabName | null>(null);
  const [archetypeActive, setArchetypeActive] = useState(false);

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
  };

  const handleArchetypeApply = () => {
    setArchetypeActive(true);
    console.log("Archetype activated");
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 flex flex-col items-center">
      <div className="max-w-6xl w-full">
        <Header />
        <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
        
        {!activeTab && <WelcomeSection />}
        
        {activeTab === "generator" && (
          <ContentGenerator 
            archetypeActive={archetypeActive}
            onGenerate={(data) => console.log("Generate:", data)} 
          />
        )}
        
        {activeTab === "archetype" && (
          <ArchetypeQuiz
            onComplete={(profile) => console.log("Quiz complete:", profile)}
            onApply={handleArchetypeApply}
          />
        )}
        
        {activeTab === "voice" && (
          <VoiceRecorder
            onTranscript={(text) => console.log("Transcript:", text)}
            onGeneratePost={(transcript) => console.log("Generate post:", transcript)}
          />
        )}
        
        {activeTab === "cases" && <CasesManager />}
        
        {activeTab === "calendar" && <LunarCalendar />}
        
        {activeTab === "trainer" && <MoneyTrainer />}
      </div>
    </div>
  );
}
