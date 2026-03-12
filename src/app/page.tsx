import Link from "next/link";
import { Brain, Globe, Search, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Brain className="h-7 w-7 text-accent" />
          <span className="text-xl font-bold tracking-tight">YourMind</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-sm text-muted-foreground mb-8">
          <Globe className="h-4 w-4" />
          <span>Works in 100+ languages</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          A second brain that
          <br />
          <span className="text-accent">thinks in your language</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
          Save anything — articles, images, notes, PDFs — in any language.
          Search in yours. Your knowledge, your language, always.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="px-8 py-3.5 text-base font-semibold bg-accent text-accent-foreground rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            Start saving for free
          </Link>
          <Link
            href="#features"
            className="px-8 py-3.5 text-base font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            See how it works
          </Link>
        </div>
      </main>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-32">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-card border border-border">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-5">
              <Globe className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Save in any language</h3>
            <p className="text-muted-foreground leading-relaxed">
              English article, Hindi notes, Japanese recipe — save it all.
              YourMind understands every language natively.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-5">
              <Search className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Search across languages</h3>
            <p className="text-muted-foreground leading-relaxed">
              Search in Hindi, find English articles. Concepts have no language
              barrier in your second brain.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-5">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Read in your language</h3>
            <p className="text-muted-foreground leading-relaxed">
              Every summary, tag, and collection adapts to your preferred
              language. Your mind, your way.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" />
            <span>YourMind</span>
          </div>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
