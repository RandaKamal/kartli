import { Metadata } from "next";
import { ImprintView } from "./ImprintView";

export const metadata: Metadata = {
  title: "Impressum / Legal Notice",
  description: "Information pursuant to § 5 DDG (formerly § 5 TMG) for kartli.",
};

export default function ImprintPage() {
  return <ImprintView />;
}
