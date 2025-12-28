import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import PostImageEditor from "@/components/PostImageEditor";
import { getArchetypeIdByName } from "@/lib/archetypeFonts";
import type { ArchetypeResult } from "@shared/schema";

export default function ImageEditor() {
  const { data: archetypeResult } = useQuery<ArchetypeResult | null>({
    queryKey: ["/api/archetypes/latest"],
  });

  const primaryArchetypeName = archetypeResult?.archetypeName?.split("-")[0];
  const userArchetypeId = primaryArchetypeName 
    ? getArchetypeIdByName(primaryArchetypeName) 
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <PostImageEditor userArchetype={userArchetypeId} />
      </main>
    </div>
  );
}
