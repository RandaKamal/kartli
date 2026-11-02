"use client";

import Link from "next/link";
import { ArrowLeft, Scale, Mail, MapPin, User, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Card } from "@/components/ui/card";

export function ImprintView() {
  const { t, locale } = useTranslation();
  const isDe = locale === "de";

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 flex-1">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.legal.backHome}</span>
        </Link>
      </div>

      <div className="space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
          <Scale className="w-3.5 h-3.5" />
          <span>§ 5 DDG</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {t.legal.imprintTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{t.legal.imprintSubtitle}</p>
        <p className="text-xs text-muted-foreground/75 font-mono">{t.legal.lastUpdated}</p>
      </div>

      <div className="grid gap-6">
        {/* Angaben zum Betreiber */}
        <Card className="p-6 sm:p-8 rounded-2xl border-border/80 bg-card/60 backdrop-blur space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base sm:text-lg">
            <User className="w-5 h-5 text-primary" />
            <h2>{t.legal.sections.provider}</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <p>
              {isDe
                ? "Diensteanbieter im Sinne des § 5 Digitale-Dienste-Gesetz (DDG):"
                : "Service provider pursuant to § 5 of the Digital Services Act (DDG):"}
            </p>
            <div className="bg-muted/40 p-4 rounded-xl border border-border/50 font-mono text-xs text-foreground/90 space-y-1">
              <p className="font-semibold text-foreground">Colin Ziegler</p>
              <p>Kieferngartenstr. 12</p>
              <p>80939 München</p>
              <p>Deutschland</p>
              <p>Email: colin.ziegler@tum.de</p>
            </div>
            <p className="text-xs text-muted-foreground/80">
              {isDe
                ? "kartli ist ein Open-Source-Projekt für WG-Küchen- und Haushaltsverwaltung."
                : "kartli is an open-source platform for flatshare kitchen and household management."}
            </p>
          </div>
        </Card>

        {/* Kontakt */}
        <Card className="p-6 sm:p-8 rounded-2xl border-border/80 bg-card/60 backdrop-blur space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base sm:text-lg">
            <Mail className="w-5 h-5 text-primary" />
            <h2>{t.legal.sections.contact}</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <div className="bg-muted/40 p-4 rounded-xl border border-border/50 font-mono text-xs text-foreground/90 space-y-1">
              <p>
                <span className="text-muted-foreground">E-Mail: </span>
                <span className="text-foreground font-semibold">[contact@example.com / support@kartli.org]</span>
              </p>
              <p>
                <span className="text-muted-foreground">Webseite: </span>
                <a
                  href="https://github.com/randakamal/kartli"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://github.com/randakamal/kartli
                </a>
              </p>
            </div>
          </div>
        </Card>

        {/* Streitbeilegung */}
        <Card className="p-6 sm:p-8 rounded-2xl border-border/80 bg-card/60 backdrop-blur space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base sm:text-lg">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2>{t.legal.sections.dispute}</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
            <p>
              {isDe ? (
                <>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
                  <a
                    href="https://ec.europa.eu/consumers/odr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline underline-offset-4"
                  >
                    https://ec.europa.eu/consumers/odr
                  </a>
                  . Unsere E-Mail-Adresse finden Sie oben im Impressum.
                </>
              ) : (
                <>
                  The European Commission provides a platform for online dispute resolution (ODR):{" "}
                  <a
                    href="https://ec.europa.eu/consumers/odr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline underline-offset-4"
                  >
                    https://ec.europa.eu/consumers/odr
                  </a>
                  . You can find our contact email address above.
                </>
              )}
            </p>
            <p>
              {isDe
                ? "Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."
                : "We are neither willing nor obligated to participate in dispute resolution proceedings before a consumer arbitration board."}
            </p>
          </div>
        </Card>

        {/* Quellcode & Haftung */}
        <Card className="p-6 sm:p-8 rounded-2xl border-border/80 bg-card/60 backdrop-blur space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            {isDe ? "Haftung für Inhalte und Links" : "Liability for Content & Links"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {isDe
              ? "Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen. Für die Richtigkeit der von Nutzern im Ledger oder der Speisekammer hinterlegten Daten übernehmen wir keine Gewähr."
              : "As a service provider, we are responsible for our own content on these pages under general law pursuant to § 7 (1) DDG. However, under §§ 8 to 10 DDG, we are not obligated to monitor transmitted or stored external information. We do not assume liability for user-entered ledger figures or pantry records."}
          </p>
        </Card>
      </div>
    </div>
  );
}
