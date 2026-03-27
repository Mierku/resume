import { ReactNode, Suspense } from "react";
import Script from "next/script";
import { Header } from "@/components/Header";
import { LegalConsentSync } from "@/components/legal/LegalConsentSync";
import { buildSoftwareApplicationJsonLd, buildWebSiteJsonLd } from "@/lib/seo";
import { AuthProvider } from "@/lib/auth/context";

export default function MainLayout({ children }: { children: ReactNode }) {
  const webSite = buildWebSiteJsonLd();
  const software = buildSoftwareApplicationJsonLd();
  const jsonLd = JSON.stringify([webSite, software]).replace(/</g, "\\u003c");

  return (
    <>
      <Script
        id="main-json-ld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <AuthProvider>
        <Header />
        <Suspense fallback={null}>
          <LegalConsentSync />
        </Suspense>
        <main>{children}</main>
      </AuthProvider>
    </>
  );
}
