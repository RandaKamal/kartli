import { Metadata } from "next";
import { PrivacyView } from "./PrivacyView";

export const metadata: Metadata = {
  title: "Datenschutzerklärung / Privacy Policy",
  description: "Information on data processing pursuant to GDPR (DSGVO) and § 25 TDDDG for kartli.",
};

export default function PrivacyPage() {
  return <PrivacyView />;
}
