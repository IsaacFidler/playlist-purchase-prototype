import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Music, Download, ShoppingCart, ArrowRight } from "lucide-react"

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-8 py-16">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-balance leading-tight">
            Turn your playlists into <span className="text-primary">purchasable music collections</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Transform your carefully curated Spotify playlists into organized, properly purchased music libraries.
            Perfect for DJs and music enthusiasts.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="text-lg px-8 bg-transparent">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">How it works</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Three simple steps to transform your streaming playlists into owned music collections
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Import Playlists</CardTitle>
              <CardDescription>
                Connect your Spotify account and import your carefully curated playlists
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Review Tracks</CardTitle>
              <CardDescription>
                See all tracks with purchase links from Apple iTunes, Bandcamp, and more
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Buy & Organize</CardTitle>
              <CardDescription>
                Purchase tracks from your preferred vendors and build your owned music library
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center space-y-6 py-16">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Ready to own your music?</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Join DJs and music lovers who are building proper music collections from their streaming playlists
          </p>
        </div>
        <Link href="/signup">
          <Button size="lg" className="text-lg px-8">
            Start Building Your Collection
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </section>
    </div>
  )
}
