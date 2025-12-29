import { useQuery } from "@tanstack/react-query";
import { useSearch, Link } from "wouter";
import Header from "@/components/Header";
import CarouselEditor from "@/components/CarouselEditor";
import { getArchetypeIdByName } from "@/lib/archetypeFonts";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import type { ArchetypeResult } from "@shared/schema";

export default function ImageEditor() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const rawText = searchParams.get("text") || "";
  // Decode the text properly (may be double-encoded)
  let initialText = rawText;
  try {
    initialText = decodeURIComponent(rawText);
  } catch {
    initialText = rawText;
  }
  

  const { data: archetypeResult } = useQuery<ArchetypeResult | null>({
    queryKey: ["/api/archetypes/latest"],
  });

  const userArchetypeIds = archetypeResult?.archetypeName
    ? archetypeResult.archetypeName.split("-").map(name => getArchetypeIdByName(name)).filter((id): id is NonNullable<typeof id> => id !== null)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              На главную
            </Link>
          </Button>
        </div>
        <CarouselEditor userArchetypes={userArchetypeIds} initialText={initialText} />
      </main>
    </div>
  );
}
