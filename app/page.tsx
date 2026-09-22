import { auth } from "@/auth";
import { Hero } from "@/components/Hero";
import { FeatureDeck } from "@/components/FeatureDeck";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="w-full flex-1 min-h-[calc(100dvh-4rem)] md:h-[calc(100dvh-4rem)] md:max-h-[calc(100dvh-4rem)] md:overflow-hidden overflow-y-auto flex flex-col justify-between px-4 py-6 md:px-6 md:py-4">
      {/* Centered 2-Column Desktop Grid */}
      <div className="w-full max-w-7xl mx-auto my-auto flex-1 flex items-center py-4 md:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Column: Headline, Narrative & Primary CTAs */}
          <div className="lg:col-span-7 xl:col-span-7 w-full">
            <Hero sessionUser={session?.user} />
          </div>

          {/* Right Column: High-End Feature Deck */}
          <div className="lg:col-span-5 xl:col-span-5 w-full pt-4 lg:pt-0">
            <FeatureDeck />
          </div>
        </div>
      </div>

      {/* Minimalist 1-Line Footer */}
      <footer className="w-full max-w-7xl mx-auto pt-6 md:pt-2 pb-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground border-t border-white/[0.04]">
        <p>© {new Date().getFullYear()} kartli. Lean, email-free kitchen management.</p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/randakamal/kartli"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Open Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
