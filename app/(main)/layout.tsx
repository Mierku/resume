import { ReactNode, Suspense } from "react";
import { Header } from "@/components/Header";
import { LegalConsentSync } from "@/components/legal/LegalConsentSync";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <LegalConsentSync />
      </Suspense>
      <main>{children}</main>
    </>
  );
}
