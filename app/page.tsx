import Link from "next/link";
import { auth } from "@/auth";
import {
  Plus,
  ArrowRight,
  UtensilsCrossed,
  Sparkles,
  Receipt,
  ShoppingCart,
  Shield,
  Zap,
  Palette,
  Home,
  Heart,
  Briefcase,
  Layers,
  CheckCircle2,
  Mail,
  Coins,
  QrCode,
  ScanLine,
  Check,
  Package,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="space-y-20 sm:space-y-28 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 sm:pt-12 text-center max-w-4xl mx-auto space-y-6">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/80 bg-card/80 backdrop-blur-md shadow-xs text-xs font-medium text-muted-foreground animate-in fade-in slide-in-from-top-3 duration-500">
          <span className="flex h-2 w-2 rounded-full bg-accent-primary animate-pulse" />
          <span className="text-foreground font-semibold">Introducing kartli 1.0</span>
          <span>&middot;</span>
          <span className="hidden sm:inline">Intelligent Household &amp; Kitchen OS</span>
          <span className="sm:hidden">Kitchen OS</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
          Kitchen management for spaces that love{" "}
          <span className="bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            good food
          </span>{" "}
          and zero drama.
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Track pantry staples, resolve ad-hoc grocery runs, split mixed supermarket receipts with Gemini Vision AI, and settle refunds transparently. Designed for flatshares, families, and studios.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          {session?.user ? (
            <>
              <Button asChild size="lg" className="rounded-2xl font-bold shadow-md h-12 px-6 text-sm gap-2">
                <Link href="/dashboard">
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-2xl font-semibold h-12 px-5 text-sm gap-2 border-border/80 hover:bg-muted/50">
                <Link href="/kitchen/new">
                  <Plus className="w-4 h-4" />
                  <span>Create New Space</span>
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="lg" className="rounded-2xl font-bold shadow-md h-12 px-6 text-sm gap-2">
                <Link href="/register">
                  <span>Start Your Kitchen</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-2xl font-semibold h-12 px-5 text-sm gap-2 border-border/80 hover:bg-muted/50">
                <Link href="/login">
                  <span>Sign In</span>
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Trust / Privacy micro-copy */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />
            <span>Email-free onboarding</span>
          </span>
          <span>&middot;</span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-accent-primary" />
            <span>Self-hostable &amp; Open Source</span>
          </span>
        </div>

        {/* FLOATING PRODUCT PREVIEW MOCKUP */}
        <div className="relative pt-6 max-w-3xl mx-auto">
          {/* Subtle Glow Backdrop */}
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-cyan-500/10 rounded-3xl blur-2xl pointer-events-none" />

          <div className="relative border border-border/80 bg-card/90 backdrop-blur-xl rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 text-left">
            {/* Mock Window Top Bar */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500/60" />
                <span className="text-xs font-mono text-muted-foreground ml-2">kartli // baker-street-flatshare</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono uppercase bg-accent-sage/15 text-accent-success border-accent-sage/30">
                Live Space
              </Badge>
            </div>

            {/* Mock Content Grid: 3 Interactive Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Pantry Status */}
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pantry Stock</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Oat Milk Barista</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Full</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Olive Oil (Kalamata)</span>
                    <span className="text-[10px] text-amber-400 font-mono">Needed</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Espresso Beans</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Full</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Real-time Cart */}
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Active Cart</span>
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">2 items</Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">Sourdough Loaf</span>
                    <span className="text-muted-foreground font-mono">@colin</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">Greek Feta Cheese</span>
                    <span className="text-muted-foreground font-mono">@randa</span>
                  </div>
                  <div className="pt-1 text-[11px] text-accent-success font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Guest checkout ready</span>
                  </div>
                </div>
              </div>

              {/* Card 3: AI Receipt Refund */}
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>Gemini OCR</span>
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">EUR / CHF</span>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-foreground">Rewe Supermarkt</p>
                  <p className="text-muted-foreground text-[11px]">7 items scanned · €18.40 claimed</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent-sage/15 text-accent-success border border-accent-sage/30 text-[10px] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Settled with 1 click</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DYNAMIC SPACES SHOWCASE (THE 4 PRESETS) */}
      <section className="space-y-8 max-w-5xl mx-auto">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wider">
            Contextual Space Intelligence
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            One engine. Tailored for how you live together.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            kartli dynamically adapts its labels and terminology to fit your living situation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Preset 1: Flatshare */}
          <Card className="border border-border bg-card rounded-2xl p-5 space-y-3 shadow-xs hover:border-border transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Flatshare (WG)</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Roommates coordinating shared essentials like oat milk, oil, and detergent without messy group chats.
              </p>
            </div>
            <div className="pt-2 border-t border-border/60 text-[11px] font-mono text-muted-foreground">
              &ldquo;Roommates&rdquo; &bull; Shared Cart
            </div>
          </Card>

          {/* Preset 2: Family */}
          <Card className="border border-border bg-card rounded-2xl p-5 space-y-3 shadow-xs hover:border-border transition-all">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Family Home</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                A central grocery board for busy households. Keep track of what is running low before heading to the store.
              </p>
            </div>
            <div className="pt-2 border-t border-border/60 text-[11px] font-mono text-muted-foreground">
              &ldquo;Family Members&rdquo; &bull; Household List
            </div>
          </Card>

          {/* Preset 3: Studio / Office */}
          <Card className="border border-border bg-card rounded-2xl p-5 space-y-3 shadow-xs hover:border-border transition-all">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Studio &amp; Office</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Team spaces managing shared coffee beans, fruit baskets, and meeting snacks with quick refund tracking.
              </p>
            </div>
            <div className="pt-2 border-t border-border/60 text-[11px] font-mono text-muted-foreground">
              &ldquo;Team Members&rdquo; &bull; Shared Expenses
            </div>
          </Card>

          {/* Preset 4: Neutral */}
          <Card className="border border-border bg-card rounded-2xl p-5 space-y-3 shadow-xs hover:border-border transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Neutral Space</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Coliving, shared studios, or community hubs needing simple, unbranded communal inventory.
              </p>
            </div>
            <div className="pt-2 border-t border-border/60 text-[11px] font-mono text-muted-foreground">
              &ldquo;Members&rdquo; &bull; Shared Pantry
            </div>
          </Card>
        </div>
      </section>

      {/* 3. CORE CAPABILITIES BENTO GRID */}
      <section className="space-y-8 max-w-5xl mx-auto">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wider">
            Architecture &amp; Features
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Crafted for speed, clarity, and daily utility.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Everything you need to keep a kitchen stocked without endless messaging back and forth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bento Item 1: Instant Inventory */}
          <Card className="border border-border bg-card rounded-3xl p-6 space-y-3 shadow-xs md:col-span-1">
            <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Instant Trigger Restocks</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mark a staple like Coffee or Sourdough as empty with a single tap. It instantly queues into the active needed shopping list.
            </p>
          </Card>

          {/* Bento Item 2: Real-time Staged Carts */}
          <Card className="border border-border bg-card rounded-3xl p-6 space-y-3 shadow-xs md:col-span-2">
            <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Member Staged Carts &amp; Guest Reservations</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Prevent duplicate shopping. When someone is physically at the supermarket putting items into their cart, roommates see real-time reserved badges so nobody buys the same milk twice.
            </p>
          </Card>

          {/* Bento Item 3: Disposable Guest Links */}
          <Card className="border border-border bg-card rounded-3xl p-6 space-y-3 shadow-xs md:col-span-2">
            <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground">
              <QrCode className="w-5 h-5 text-teal-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Disposable Supermarket Guest Links</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Send a friend, partner, or guest to the grocery store with a zero-auth read-only link. They see the live shopping list without needing an account or app install.
            </p>
          </Card>

          {/* Bento Item 4: AI Receipt Ingestion */}
          <Card className="border border-border bg-card rounded-3xl p-6 space-y-3 shadow-xs md:col-span-1">
            <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground">
              <ScanLine className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground">AI Receipt Ingestion</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gemini Vision OCR reads paper receipts, matches line items to staged cart entries, and extracts store names and currency automatically.
            </p>
          </Card>

          {/* Bento Item 5: Multi-Currency Engine */}
          <Card className="border border-border bg-card rounded-3xl p-6 space-y-3 shadow-xs md:col-span-1">
            <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground">
              <Coins className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground">All European Currencies + USD</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Support for EUR, CHF, GBP, USD, SEK, NOK, DKK, PLN, CZK, HUF, RON, BGN, and ISK with automatic FX conversion in admin refund views.
            </p>
          </Card>

          {/* Bento Item 6: Artisanal Culinary Palettes */}
          <Card className="border border-border bg-card rounded-3xl p-6 space-y-3 shadow-xs md:col-span-2">
            <div className="w-10 h-10 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground">
              <Palette className="w-5 h-5 text-pink-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Dark Artisanal Culinary Themes</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Personalize your workspace with Saffron Citrus (warm Mediterranean), Black Truffle (high-contrast luxury), Midnight Plum (neo-bistro), or Nordic Salt (slate &amp; teal).
            </p>
          </Card>
        </div>
      </section>

      {/* 4. AI SCANNER DEEP DIVE */}
      <section className="border border-border/80 bg-gradient-to-b from-card to-muted/20 rounded-3xl p-6 sm:p-10 max-w-5xl mx-auto space-y-8">
        <div className="max-w-2xl space-y-2">
          <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wider bg-accent-primary/10 text-accent-primary border-accent-primary/20">
            Powered by Gemini Multimodal Vision
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            How mixed supermarket receipt splitting works.
          </h2>
          <p className="text-sm text-muted-foreground">
            Never waste time calculating who bought what or dividing communal groceries from personal treats.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono text-foreground">1</span>
            <h4 className="text-sm font-bold text-foreground">Snap Paper Receipt</h4>
            <p className="text-xs text-muted-foreground">
              Upload a photo from your phone or desktop immediately after returning from the supermarket.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono text-foreground">2</span>
            <h4 className="text-sm font-bold text-foreground">Automated Fuzzy Matching</h4>
            <p className="text-xs text-muted-foreground">
              OCR identifies each item and auto-checks off matched items in your staged cart with exact prices.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono text-foreground">3</span>
            <h4 className="text-sm font-bold text-foreground">One-Click Settle &amp; Auto-Purge</h4>
            <p className="text-xs text-muted-foreground">
              Admin marks the refund settled with one tap. Receipt images are deleted to preserve disk storage.
            </p>
          </div>
        </div>
      </section>

      {/* 5. SETUP HELP & DIRECT CONTACT SECTION */}
      <section className="space-y-6 max-w-4xl mx-auto text-center">
        <div className="space-y-2">
          <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wider">
            Setup &amp; Feedback
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Setting up kartli for your space?
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            kartli is currently in active development. If you are setting up a dorm, shared flat, or community space and want a walkthrough, run into a snag, or have feedback, reach out to us directly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto pt-2">
          {/* Dev Card 1: Randa */}
          <Card className="border border-border bg-card rounded-2xl p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-bold text-foreground">
                R
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Randa</h4>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Happy to help you configure your space, brainstorm workflows, or walk you through onboarding.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs gap-1.5 border-border hover:bg-secondary">
              <a href="mailto:contact-randa@example.com">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Email Randa</span>
              </a>
            </Button>
          </Card>

          {/* Dev Card 2: Colin */}
          <Card className="border border-border bg-card rounded-2xl p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-bold text-foreground">
                C
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Colin</h4>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Reach out for help getting your household set up, troubleshooting, or sharing feature ideas.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs gap-1.5 border-border hover:bg-secondary">
              <a href="mailto:contact-colin@example.com">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Email Colin</span>
              </a>
            </Button>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground pt-1">
          Direct support from the creators &mdash; free and friendly.
        </p>
      </section>

      {/* 6. BOTTOM CALL TO ACTION BANNER */}
      <section className="relative overflow-hidden border border-border/80 bg-gradient-to-r from-card via-card to-muted/40 rounded-3xl p-8 sm:p-12 text-center max-w-4xl mx-auto space-y-5 shadow-xl">
        <div className="space-y-2 max-w-lg mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Ready to streamline your kitchen groceries?
          </h2>
          <p className="text-sm text-muted-foreground">
            Create a space in under 30 seconds. No passwords to remember, no ads, and zero clutter.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {session?.user ? (
            <Button asChild size="lg" className="rounded-2xl font-bold shadow-md px-6 text-sm gap-2">
              <Link href="/dashboard">
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="rounded-2xl font-bold shadow-md px-6 text-sm gap-2">
                <Link href="/register">
                  <span>Start Your Kitchen Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-2xl font-semibold px-5 text-sm border-border/80 hover:bg-muted/50">
                <Link href="/login">
                  <span>Sign In</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}



