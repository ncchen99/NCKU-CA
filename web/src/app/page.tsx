import { PublicLayout } from "@/components/layout/public-layout";
import { HeroSection } from "@/components/home/hero-section";
import { OrgBriefSection } from "@/components/home/org-brief-section";
import { NewsPreviewSection } from "@/components/home/news-preview-section";
import { ActivityPreviewSection } from "@/components/home/activity-preview-section";
import { FormPreviewSection } from "@/components/home/form-preview-section";
import { CanvasGrid } from "@/components/ui/canvas-grid";
import { getOpenForms } from "@/lib/firestore/forms";
import type { Form } from "@/types";

export const revalidate = 300;

export default async function Home() {
  let hasForms = false;
  let forms: Form[] = [];
  try {
    forms = await getOpenForms();
    hasForms = forms.length > 0;
  } catch (error) {
    console.error("Home: Failed to fetch forms", error);
  }

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

      {hasForms ? (
        <>
          <CanvasGrid
            topFadeClassName="bg-gradient-to-b from-white to-transparent"
            bottomFadeClassName="bg-gradient-to-t from-neutral-50 to-transparent"
          />
          <FormPreviewSection preFetchedForms={forms} />
          <CanvasGrid
            topFadeClassName="bg-gradient-to-b from-neutral-50 to-transparent"
            bottomFadeClassName="bg-gradient-to-t from-neutral-50 to-transparent"
          />
        </>
      ) : (
        <CanvasGrid
          topFadeClassName="bg-gradient-to-b from-white to-transparent"
          bottomFadeClassName="bg-gradient-to-t from-neutral-50 to-transparent"
        />
      )}

      <ActivityPreviewSection />
      <CanvasGrid
        topFadeClassName="bg-gradient-to-b from-neutral-50 to-transparent"
        bottomFadeClassName="bg-gradient-to-t from-white to-transparent"
      />
    </PublicLayout>
  );
}
