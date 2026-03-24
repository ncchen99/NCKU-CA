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
      <CanvasGrid />
      <OrgBriefSection />
      <CanvasGrid />
      <NewsPreviewSection />
      <CanvasGrid />
      <ActivityPreviewSection />
      <CanvasGrid />
    </PublicLayout>
  );
}
