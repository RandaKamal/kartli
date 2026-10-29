"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Cookie,
  UserCheck,
  Receipt,
  Trash2,
  Lock,
  Server,
  Info,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Card } from "@/components/ui/card";

export function PrivacyView() {
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
          <Shield className="w-3.5 h-3.5" />
          <span>DSGVO / GDPR & § 25 TDDDG</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {t.legal.privacyTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{t.legal.privacySubtitle}</p>
        <p className="text-xs text-muted-foreground/75 font-mono">{t.legal.lastUpdated}</p>
      </div>

      <div className="grid gap-6">
        {/* Verantwortlicher */}
        <Card className="p-6 sm:p-8 rounded-2xl border-border/80 bg-card/60 backdrop-blur space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base sm:text-lg">
            <Lock className="w-5 h-5 text-primary" />
            <h2>{t.legal.sections.controller}</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <p>
              {isDe
                ? "Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:"
                : "The controller responsible for data processing on this platform in accordance with the General Data Protection Regulation (GDPR) is:"}
            </p>
            <div className="bg-muted/40 p-4 rounded-xl border border-border/50 font-mono text-xs text-foreground/90 space-y-1">
              <p className="font-semibold text-foreground">Colin Ziegler</p>
              <p>Kieferngartenstr. 12</p>
              <p>80939 München</p>
              <p>Deutschland</p>
              <p>Email: colin.ziegler@tum.de</p>
            </div>
          </div>
        </Card>

        {/* Datensparsamkeit & Login ohne E-Mail */}
        <Card className="p-6 sm:p-8 rounded-2xl border-border/80 bg-card/60 backdrop-blur space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base sm:text-lg">
            <UserCheck className="w-5 h-5 text-primary" />
            <h2>{t.legal.sections.sessionAndAuth}</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
            <p>
              {isDe ? (
                <>
                  kartli folgt konsequent dem Prinzip der <strong>Datensparsamkeit und Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO)</strong>. Für die Registrierung und Nutzung von kartli ist <strong>keine Angabe einer E-Mail-Adresse</strong>, einer Telefonnummer oder eines Klarnamens erforderlich. Die Registrierung erfolgt ausschließlich über einen frei wählbaren Benutzernamen und ein kryptografisch gehashtes Passwort (bcrypt).
                </>
              ) : (
                <>
                  kartli strictly adheres to the principle of <strong>data minimization (Art. 5(1)(c) GDPR)</strong>. Registering and using kartli requires <strong>no email address</strong>, phone number, or real name. Accounts are established solely via a freely chosen handle/username and a cryptographically hashed password (bcrypt).
                </>
              )}
            </p>
            <p>
              {isDe
                ? "Rechtsgrundlage für diese Verarbeitung ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung bzw. Erbringung des angeforderten Dienstes)."
                : "The legal basis for this processing is Art. 6(1)(b) GDPR (performance of a contract or provision of the requested service)."}
            </p>
          </div>
        </Card>

        {/* Cookies & TDDDG */}
        <Card className="p-6 sm:p-8 rounded-2xl border-border/80 bg-card/60 backdrop-blur space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base sm:text-lg">
            <Cookie className="w-5 h-5 text-primary" />
            <h2>{t.legal.sections.cookies}</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 p-4 rounded-xl text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  {isDe
                    ? "Kein Cookie-Banner erforderlich gemäß § 25 Abs. 2 Nr. 2 TDDDG"
                    : "No consent banner required under § 25 (2) No. 2 TDDDG"}
                </span>
              </p>
              <p>
                {isDe
                  ? "Wir setzen keinerlei Third-Party-Tracking, Werbe-Cookies, Analyse-Pixel oder Cross-Site-Tracker ein."
                  : "We use zero third-party tracking, advertising cookies, analytics pixels, or cross-site fingerprinting."}
              </p>
            </div>

            <p>
              {isDe ? (
                <>
                  Gemäß <strong>§ 25 Abs. 2 Nr. 2 TDDDG</strong> (Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz) ist für das Speichern und Auslesen von Informationen auf dem Endgerät keine Einwilligung erforderlich, wenn dies <em>unbedingt erforderlich ist, damit der Anbieter einen vom Nutzer ausdrücklich gewünschten digitalen Dienst zur Verfügung stellen kann</em>.
                </>
              ) : (
                <>
                  Pursuant to <strong>§ 25 (2) No. 2 TDDDG</strong>, no user consent is required for storing or reading end-device information if it is <em>strictly necessary in order to provide a digital service explicitly requested by the user</em>.
                </>
              )}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-border/60 rounded-lg overflow-hidden">
                <thead className="bg-muted/60 text-foreground font-semibold">
                  <tr>
                    <th className="p-2.5 border-b border-border/60">{isDe ? "Schlüssel / Cookie" : "Key / Cookie"}</th>
                    <th className="p-2.5 border-b border-border/60">{isDe ? "Speicherort" : "Storage"}</th>
                    <th className="p-2.5 border-b border-border/60">{isDe ? "Zweck" : "Purpose"}</th>
                    <th className="p-2.5 border-b border-border/60">{isDe ? "Gültigkeit" : "Duration"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                  <tr>
                    <td className="p-2.5 text-foreground">authjs.session-token</td>
                    <td className="p-2.5">HTTP-Only Cookie</td>
                    <td className="p-2.5 font-sans">{isDe ? "Sitzungsauthentifizierung (Auth.js / NextAuth)" : "Session authentication token"}</td>
                    <td className="p-2.5 font-sans">{isDe ? "Sitzungsdauer / 30 Tage" : "Session / 30 days"}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-foreground">kartli_locale</td>
                    <td className="p-2.5">Cookie & LocalStorage</td>
                    <td className="p-2.5 font-sans">{isDe ? "Speicherung der Sprachauswahl (de / en)" : "Remembers selected locale (de / en)"}</td>
                    <td className="p-2.5 font-sans">{isDe ? "1 Jahr" : "1 year"}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-foreground">kartli-theme</td>
                    <td className="p-2.5">Cookie & LocalStorage</td>
                    <td className="p-2.5 font-sans">{isDe ? "Speicherung des UI-Farbschemas (z. B. Black Truffle)" : "Remembers culinary color theme"}</td>
                    <td className="p-2.5 font-sans">{isDe ? "Persistent" : "Persistent"}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-foreground">kartli_pending_invite</td>
                    <td className="p-2.5">HTTP Cookie</td>
                    <td className="p-2.5 font-sans">{isDe ? "Zwischenspeichern des WG-Einladungstokens während Login/Registrierung" : "Holds pending kitchen invite during sign-up"}</td>
                    <td className="p-2.5 font-sans">{isDe ? "1 Stunde" : "1 hour"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Ledger & Haushaltsintegrität */}
        <Card className="p-6 sm:p-8 rounded-2xl border-border/80 bg-card/60 backdrop-blur space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base sm:text-lg">
            <Receipt className="w-5 h-5 text-primary" />
            <h2>{t.legal.sections.expensesAndLedger}</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
            <p>
              {isDe ? (
                <>
                  kartli dient der gemeinsamen Organisation von Haushaltsausgaben und Speisekammern in Wohngemeinschaften und Familien. Wenn Sie Ausgaben oder Einkäufe erfassen, werden der Betrag, die gekauften Positionen und Ihr Anzeigename im gemeinsamen Haushalts-Kassenbuch (Ledger) gespeichert.
                </>
              ) : (
                <>
                  kartli coordinates shared grocery expenses and pantries for flatshares and households. When recording purchases or expenses, transaction totals, items, and your kitchen nickname are recorded in the shared kitchen ledger.
                </>
              )}
            </p>
            <p>
              {isDe ? (
                <>
                  <strong>Integrität der Haushaltsabrechnung:</strong> Um die rechnerische Korrektheit aller WG-Salden und gegenseitigen Ausgleichszahlungen (Settlements) dauerhaft zu gewährleisten, bleiben erfasste Ausgabenbuchungen und Belegsummen für die verbleibenden WG-Mitglieder erhalten, selbst wenn ein Nutzer die WG verlässt oder seinen Account löscht (berechtigtes Interesse gem. Art. 6 Abs. 1 lit. f DSGVO zur Gewährleistung der Rechnungs- und Saldenintegrität innerhalb der Gemeinschaft).
                </>
              ) : (
                <>
                  <strong>Accounting Integrity:</strong> To preserve mathematical balance integrity and settlement tracking across flatmates, historical ledger expense rows and totals remain available to kitchen members even after a roommate departs or deletes their account (legitimate interest pursuant to Art. 6(1)(f) GDPR).
                </>
              )}
            </p>
          </div>
        </Card>

        {/* Recht auf Löschung / Art. 17 DSGVO */}
        <Card className="p-6 sm:p-8 rounded-2xl border-border/80 bg-card/60 backdrop-blur space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base sm:text-lg">
            <Trash2 className="w-5 h-5 text-destructive" />
            <h2>{t.legal.sections.erasure}</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
            <p>
              {isDe ? (
                <>
                  Gemäß <strong>Art. 17 DSGVO (Recht auf Löschung / „Recht auf Vergessenwerden“)</strong> haben Sie jederzeit das Recht, die unverzügliche Löschung Ihrer personenbezogenen Daten zu verlangen.
                </>
              ) : (
                <>
                  Pursuant to <strong>Art. 17 GDPR (Right to Erasure / &quot;Right to be Forgotten&quot;)</strong>, you have the right to obtain the erasure of personal data concerning you without undue delay.
                </>
              )}
            </p>
            <div className="bg-muted/40 p-4 rounded-xl border border-border/50 text-xs space-y-2">
              <p className="font-semibold text-foreground">
                {isDe
                  ? "Selbstständige Account-Löschung per 1-Klick im Profil:"
                  : "Self-service account deletion directly in user settings:"}
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  {isDe
                    ? "Ihr Benutzername und Passwort-Hash werden dauerhaft und unwiderruflich überschrieben (z. B. deleted_user_UUID)."
                    : "Your username and password hash are permanently scrambled and deactivated (e.g. deleted_user_UUID)."}
                </li>
                <li>
                  {isDe
                    ? "Push-Abonnements und Login-Sitzungen werden vollständig entfernt."
                    : "Push notification tokens and active sessions are immediately erased."}
                </li>
                <li>
                  {isDe
                    ? "Historische WG-Kassenbucheinträge werden vollständig anonymisiert (user_id = NULL, Namenszusatz '(ehemals)'). Die Saldenintegrität der Mitbewohner bleibt erhalten, ohne dass Rückschlüsse auf Ihre Login-Identität möglich sind."
                    : "Historical expense rows are fully anonymized (user_id = NULL, suffix '(deleted)'). Financial balances remain accurate without preserving personal links to your credentials."}
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Betroffenenrechte & Hosting */}
        <Card className="p-6 sm:p-8 rounded-2xl border-border/80 bg-card/60 backdrop-blur space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base sm:text-lg">
            <Server className="w-5 h-5 text-primary" />
            <h2>{t.legal.sections.rights} & {t.legal.sections.hosting}</h2>
          </div>
          <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
            <p>
              {isDe ? (
                <>
                  Sie haben nach der DSGVO die Rechte auf <strong>Auskunft (Art. 15)</strong>, <strong>Berichtigung (Art. 16)</strong>, <strong>Löschung (Art. 17)</strong>, <strong>Einschränkung der Verarbeitung (Art. 18)</strong>, <strong>Datenübertragbarkeit (Art. 20)</strong> und <strong>Widerspruch (Art. 21)</strong> sowie das Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde (Art. 77 DSGVO).
                </>
              ) : (
                <>
                  Under the GDPR, you have the right of <strong>access (Art. 15)</strong>, <strong>rectification (Art. 16)</strong>, <strong>erasure (Art. 17)</strong>, <strong>restriction of processing (Art. 18)</strong>, <strong>data portability (Art. 20)</strong>, and <strong>objection (Art. 21)</strong>, as well as the right to lodge a complaint with a supervisory authority (Art. 77 GDPR).
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground/80">
              {isDe
                ? "Die technische Infrastruktur nutzt moderne Transportverschlüsselung (HTTPS/TLS) mit strikter Header-Absicherung (HSTS, CSP-Optionen, No-Sniff, SameOrigin). Beleg-Bilder für die KI-Erkennung werden zeitnah automatisiert nach Verarbeitung bereinigt."
                : "All communications are guarded with state-of-the-art TLS encryption and strict security headers (HSTS, No-Sniff, SameOrigin). Uploaded receipts are systematically deleted after automated AI item extraction."}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
