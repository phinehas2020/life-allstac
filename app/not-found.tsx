import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Camera, Ghost, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center overflow-hidden">
      <div className="relative mb-8">
        {/* Decorative background icons */}
        <div className="absolute -top-16 -left-16 text-primary/5 animate-pulse">
            <Camera size={140} />
        </div>
        <div className="absolute -bottom-12 -right-12 text-primary/5 rotate-12">
            <Ghost size={120} />
        </div>

        <h1 className="text-[8rem] md:text-[12rem] font-bold leading-none tracking-tighter gradient-brand-text font-heading select-none">
          404
        </h1>
      </div>

      <h2 className="text-2xl md:text-4xl font-bold mb-4 font-heading text-primary">
        Out of focus?
      </h2>

      <p className="text-muted-foreground max-w-md mb-8 text-lg font-body">
        The page you&apos;re looking for seems to have wandered off the film roll.
        It might have been deleted or the link is broken.
      </p>

      <Button asChild variant="gradient" size="lg" className="rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <Link href="/">
          <Home className="mr-2 h-5 w-5" />
          Back to Feed
        </Link>
      </Button>

      {/* Decorative "Polaroids" at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-8 opacity-20 pointer-events-none translate-y-1/2 overflow-visible">
        <div className="h-48 w-36 bg-muted rotate-[-12deg] rounded-sm border-8 border-white shadow-lg shrink-0"></div>
        <div className="h-48 w-36 bg-muted rotate-[6deg] rounded-sm border-8 border-white shadow-lg shrink-0 -translate-y-8"></div>
        <div className="h-48 w-36 bg-muted rotate-[-3deg] rounded-sm border-8 border-white shadow-lg shrink-0"></div>
        <div className="h-48 w-36 bg-muted rotate-[15deg] rounded-sm border-8 border-white shadow-lg shrink-0 hidden md:block"></div>
      </div>
    </div>
  )
}
