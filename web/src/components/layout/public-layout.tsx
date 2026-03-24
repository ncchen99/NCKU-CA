import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { AttendanceBannerGate } from "./attendance-banner-gate";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <Navbar />
      <AttendanceBannerGate />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
