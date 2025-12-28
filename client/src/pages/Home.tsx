import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Navigation, { type TabName } from "@/components/Navigation";
import WelcomeSection from "@/components/WelcomeSection";
import ContentGenerator from "@/components/ContentGenerator";
import ArchetypeQuiz, { type ArchetypeProfile } from "@/components/ArchetypeQuiz";
import VoiceRecorder from "@/components/VoiceRecorder";
import CasesManager from "@/components/CasesManager";
import LunarCalendar from "@/components/LunarCalendar";
import MoneyTrainer from "@/components/MoneyTrainer";
import CarouselEditor from "@/components/CarouselEditor";
import { getArchetypeIdByName } from "@/lib/archetypeFonts";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ArchetypeResult } from "@shared/schema";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabName | null>(null);
  const [localArchetypeActive, setLocalArchetypeActive] = useState(false);
  const [localArchetypeData, setLocalArchetypeData] = useState<ArchetypeProfile | null>(null);
  const { toast } = useToast();

  const { data: archetypeResult } = useQuery<ArchetypeResult | null>({
    queryKey: ["/api/archetypes/latest"],
  });

  const archetypeActive = !!archetypeResult || localArchetypeActive;

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    setTimeout(() => {
      const element = document.getElementById('content-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleArchetypeApply = (profile: ArchetypeProfile) => {
    setLocalArchetypeActive(true);
    setLocalArchetypeData(profile);
    queryClient.invalidateQueries({ queryKey: ["/api/archetypes/latest"] });
    toast({
      title: "Архетип активирован!",
      description: `Стиль "${profile.topArchetypes.join('-')}" применён к генератору контента`,
    });
    console.log("Archetype applied:", profile);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 flex flex-col items-center">
      <div className="max-w-6xl w-full">
        <Header />
        <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
        
        <div id="content-section">
        {!activeTab && <WelcomeSection />}
        
        {activeTab === "generator" && (
          <ContentGenerator 
            archetypeActive={archetypeActive}
            archetypeData={archetypeResult || undefined}
            localArchetypeProfile={localArchetypeData || undefined}
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
        
        {activeTab === "carousel" && (
          <CarouselEditor 
            userArchetype={archetypeResult?.archetypeName 
              ? getArchetypeIdByName(archetypeResult.archetypeName.split("-")[0]) 
              : null} 
          />
        )}
        
        {activeTab === "calendar" && <LunarCalendar />}
        
        {activeTab === "trainer" && <MoneyTrainer />}
        </div>
      </div>
    </div>
  );
}
