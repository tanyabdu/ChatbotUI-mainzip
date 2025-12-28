import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import Header from "@/components/Header";
import CarouselEditor from "@/components/CarouselEditor";
import { getArchetypeIdByName } from "@/lib/archetypeFonts";
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
        <CarouselEditor userArchetypes={userArchetypeIds} initialText={initialText} />
      </main>
    </div>
  );
}
