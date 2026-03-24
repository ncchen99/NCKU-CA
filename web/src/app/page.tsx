import { PublicLayout } from "@/components/layout/public-layout";
import { HeroSection } from "@/components/home/hero-section";
import { OrgBriefSection } from "@/components/home/org-brief-section";
import { NewsPreviewSection } from "@/components/home/news-preview-section";
import { ActivityPreviewSection } from "@/components/home/activity-preview-section";
import { CanvasGrid } from "@/components/ui/canvas-grid";

export default function Home() {
  return (
    <PublicLayout>
      <HeroSection />
      <CanvasGrid
        topFadeClassName="bg-gradient-to-b from-white to-transparent"
        bottomFadeClassName="bg-gradient-to-t from-neutral-50 to-transparent"
      />
      <OrgBriefSection />
      <CanvasGrid
        topFadeClassName="bg-gradient-to-b from-neutral-50 to-transparent"
        bottomFadeClassName="bg-gradient-to-t from-white to-transparent"
      />
      <NewsPreviewSection />
      <CanvasGrid
        topFadeClassName="bg-gradient-to-b from-white to-transparent"
        bottomFadeClassName="bg-gradient-to-t from-neutral-50 to-transparent"
      />
      <ActivityPreviewSection />
      <CanvasGrid
        topFadeClassName="bg-gradient-to-b from-neutral-50 to-transparent"
        bottomFadeClassName="bg-gradient-to-t from-white to-transparent"
      />
    </PublicLayout>
  );
}
