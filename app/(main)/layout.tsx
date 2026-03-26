import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { LegalConsentSync } from "@/components/legal/LegalConsentSync";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <LegalConsentSync />
      <main>{children}</main>
    </>
  );
}
