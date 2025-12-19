import { FileText, Dna, Mic, Gem, Moon, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TabName = "generator" | "archetype" | "voice" | "cases" | "calendar" | "trainer";

interface NavigationProps {
  activeTab: TabName | null;
  onTabChange: (tab: TabName) => void;
}

const navItems: { id: TabName; label: string; icon: typeof FileText }[] = [
  { id: "generator", label: "Генератор контента", icon: FileText },
  { id: "archetype", label: "Архетип стратегии", icon: Dna },
  { id: "voice", label: "Голос потока", icon: Mic },
  { id: "cases", label: "Кейсы", icon: Gem },
  { id: "calendar", label: "Лунный календарь", icon: Moon },
  { id: "trainer", label: "Денежный тренажёр", icon: DollarSign },
];

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <div className="flex flex-col items-center gap-3 mb-12 fade-in max-w-md mx-auto">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        
        return (
          <Button
            key={item.id}
            data-testid={`nav-${item.id}`}
            variant="ghost"
            className={`
              w-full px-5 py-3 rounded-xl font-medium transition-all duration-300
              ${isActive 
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-2 border-purple-400 shadow-lg" 
                : "bg-white border-2 border-purple-300 text-purple-700 hover:border-pink-400 hover:bg-purple-50"
              }
            `}
            onClick={() => onTabChange(item.id)}
          >
            <Icon className="h-4 w-4 mr-2" />
            <span className="text-sm sm:text-base">{item.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
