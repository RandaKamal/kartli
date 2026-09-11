import Link from "next/link";
import { auth } from "@/auth";
import {
  Plus,
  ArrowRight,
  Sparkles,
  Receipt,
  ShoppingCart,  Zap,
  Palette,
  Home,
  Heart,
  Briefcase,
  Layers,
  CheckCircle2,
  Coins,
  QrCode,
  ScanLine,
  Check,
  Package,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { CardCarousel } from "@/components/CardCarousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="space-y-32 sm:space-y-32 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 sm:pt-12 pb-12 sm:pb-16 text-center max-w-4xl mx-auto space-y-6">
        {/* Editorial Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-secondary/50 backdrop-blur-sm text-xs font-medium text-muted-foreground mb-4">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">v1.0</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span>Artisanal Kitchen Workspace</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
          Kitchen management for spaces that love{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent font-extrabold">
            good food
          </span>{" "}
          and zero drama.
        </h1>



        {/* FLOATING PRODUCT PREVIEW MOCKUP */}
        <div className="relative pt-6 max-w-3xl mx-auto">
          {/* Subtle Glow Backdrop */}
          <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
            <div className="w-full h-full bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-cyan-500/10 rounded-3xl blur-2xl" />
          </div>

          <div className="relative border border-border/80 bg-card/90 backdrop-blur-xl rounded-3xl p-4 sm:p-6 shadow-2xl shadow-black/10 dark:shadow-black/40 space-y-4 text-left">
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

        </div>

        <CardCarousel>
          {/* Preset 1: Flatshare */}
          <Card className="bg-card border border-border/70 shadow-sm hover:shadow-md transition-shadow rounded-2xl p-6 flex flex-col justify-between h-full">
            <div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20 mb-4">
                <Home className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Flatshare (WG)</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                Roommates coordinating shared essentials like oat milk, oil, and detergent without messy group chats.
              </p>
            </div>
            <div className="text-xs font-mono text-muted-foreground/80 pt-4 border-t border-border/40 flex items-center justify-between mt-6">
              <span>&ldquo;Roommates&rdquo;</span>
              <span>Shared Cart</span>
            </div>
          </Card>

          {/* Preset 2: Family */}
          <Card className="bg-card border border-border/70 shadow-sm hover:shadow-md transition-shadow rounded-2xl p-6 flex flex-col justify-between h-full">
            <div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20 mb-4">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Family Home</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                A central grocery board for busy households. Keep track of what is running low before heading to the store.
              </p>
            </div>
            <div className="text-xs font-mono text-muted-foreground/80 pt-4 border-t border-border/40 flex items-center justify-between mt-6">
              <span>&ldquo;Family Members&rdquo;</span>
              <span>Household List</span>
            </div>
          </Card>

          {/* Preset 3: Studio / Office */}
          <Card className="bg-card border border-border/70 shadow-sm hover:shadow-md transition-shadow rounded-2xl p-6 flex flex-col justify-between h-full">
            <div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20 mb-4">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Studio &amp; Office</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                Team spaces managing shared coffee beans, fruit baskets, and meeting snacks with quick refund tracking.
              </p>
            </div>
            <div className="text-xs font-mono text-muted-foreground/80 pt-4 border-t border-border/40 flex items-center justify-between mt-6">
              <span>&ldquo;Team Members&rdquo;</span>
              <span>Shared Expenses</span>
            </div>
          </Card>

          {/* Preset 4: Neutral */}
          <Card className="bg-card border border-border/70 shadow-sm hover:shadow-md transition-shadow rounded-2xl p-6 flex flex-col justify-between h-full">
            <div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20 mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Neutral Space</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                Coliving, shared studios, or community hubs needing simple, unbranded communal inventory.
              </p>
            </div>
            <div className="text-xs font-mono text-muted-foreground/80 pt-4 border-t border-border/40 flex items-center justify-between mt-6">
              <span>&ldquo;Members&rdquo;</span>
              <span>Shared Pantry</span>
            </div>
          </Card>
        </CardCarousel>
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

        </div>

        <CardCarousel>
          {/* Bento Item 1: Instant Inventory */}
          <Card className="border border-border bg-card rounded-[28px] p-0 overflow-hidden shadow-xs flex flex-col">
            <div className="h-[130px] flex items-center justify-center bg-gradient-to-br from-amber-400/20 to-amber-400/5">
              <Zap className="w-11 h-11 text-amber-400" />
            </div>
            <div className="p-6 flex flex-col gap-2.5 flex-1">
              <h3 className="text-lg font-bold text-foreground">Instant Trigger Restocks</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Mark a staple like Coffee or Sourdough as empty with a single tap. It instantly queues into the active needed shopping list.
              </p>
            </div>
          </Card>

          {/* Bento Item 2: Real-time Staged Carts */}
          <Card className="border border-border bg-card rounded-[28px] p-0 overflow-hidden shadow-xs flex flex-col">
            <div className="h-[130px] flex items-center justify-center bg-gradient-to-br from-emerald-400/20 to-emerald-400/5">
              <ShoppingCart className="w-11 h-11 text-emerald-400" />
            </div>
            <div className="p-6 flex flex-col gap-2.5 flex-1">
              <h3 className="text-lg font-bold text-foreground">Member Staged Carts &amp; Guest Reservations</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Prevent duplicate shopping. When someone is physically at the supermarket putting items into their cart, roommates see real-time reserved badges so nobody buys the same milk twice.
              </p>
            </div>
          </Card>

          {/* Bento Item 3: Disposable Guest Links */}
          <Card className="border border-border bg-card rounded-[28px] p-0 overflow-hidden shadow-xs flex flex-col">
            <div className="h-[130px] flex items-center justify-center bg-gradient-to-br from-teal-400/20 to-teal-400/5">
              <QrCode className="w-11 h-11 text-teal-400" />
            </div>
            <div className="p-6 flex flex-col gap-2.5 flex-1">
              <h3 className="text-lg font-bold text-foreground">Disposable Supermarket Guest Links</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Send a friend, partner, or guest to the grocery store with a zero-auth read-only link. They see the live shopping list without needing an account or app install.
              </p>
            </div>
          </Card>

          {/* Bento Item 4: AI Receipt Ingestion */}
          <Card className="border border-border bg-card rounded-[28px] p-0 overflow-hidden shadow-xs flex flex-col">
            <div className="h-[130px] flex items-center justify-center bg-gradient-to-br from-purple-400/20 to-purple-400/5">
              <ScanLine className="w-11 h-11 text-purple-400" />
            </div>
            <div className="p-6 flex flex-col gap-2.5 flex-1">
              <h3 className="text-lg font-bold text-foreground">AI Receipt Ingestion</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gemini Vision OCR reads paper receipts, matches line items to staged cart entries, and extracts store names and currency automatically.
              </p>
            </div>
          </Card>

          {/* Bento Item 5: Multi-Currency Engine */}
          <Card className="border border-border bg-card rounded-[28px] p-0 overflow-hidden shadow-xs flex flex-col">
            <div className="h-[130px] flex items-center justify-center bg-gradient-to-br from-emerald-400/20 to-emerald-400/5">
              <Coins className="w-11 h-11 text-emerald-400" />
            </div>
            <div className="p-6 flex flex-col gap-2.5 flex-1">
              <h3 className="text-lg font-bold text-foreground">All European Currencies + USD</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Support for EUR, CHF, GBP, USD, SEK, NOK, DKK, PLN, CZK, HUF, RON, BGN, and ISK with automatic FX conversion in admin refund views.
              </p>
            </div>
          </Card>

          {/* Bento Item 6: Artisanal Culinary Palettes */}
          <Card className="border border-border bg-card rounded-[28px] p-0 overflow-hidden shadow-xs flex flex-col">
            <div className="h-[130px] flex items-center justify-center bg-gradient-to-br from-pink-400/20 to-pink-400/5">
              <Palette className="w-11 h-11 text-pink-400" />
            </div>
            <div className="p-6 flex flex-col gap-2.5 flex-1">
              <h3 className="text-lg font-bold text-foreground">Dark Artisanal Culinary Themes</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Personalize your workspace with Saffron Citrus (warm Mediterranean), Black Truffle (high-contrast luxury), Midnight Plum (neo-bistro), or Nordic Salt (slate &amp; teal).
              </p>
            </div>
          </Card>
        </CardCarousel>
      </section>

      {/* 4. AI SCANNER DEEP DIVE */}
      <section className="max-w-5xl mx-auto space-y-8">
        <div className="max-w-2xl space-y-2">
          <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wider bg-accent-primary/10 text-accent-primary border-accent-primary/20">
            Powered by Gemini Multimodal Vision
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            How mixed supermarket receipt splitting works.
          </h2>

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

      {/* 6. BOTTOM CALL TO ACTION BANNER */}
      <section className="text-center max-w-4xl mx-auto space-y-5">
        <div className="space-y-2 max-w-lg mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Ready to streamline your kitchen groceries?
          </h2>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />
            <span>Email-free onboarding</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {session?.user ? (
            <>
              <Button asChild size="lg" className="rounded-2xl font-bold shadow-md px-6 text-sm gap-2">
                <Link href="/dashboard">
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-2xl font-semibold px-5 text-sm gap-2 border-border/80 hover:bg-muted/50">
                <Link href="/kitchen/new">
                  <Plus className="w-4 h-4" />
                  <span>Create New Space</span>
                </Link>
              </Button>
            </>
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
      </section>    </div>
  );
}



