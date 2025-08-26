import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
      <main className="flex flex-col items-center justify-center flex-1 text-center">
        <h1 className="text-5xl font-bold tracking-tighter text-foreground sm:text-6xl md:text-7xl">
          Welcome to Your New App
        </h1>
        <p className="max-w-xl mt-4 text-lg text-muted-foreground">
          This is a fresh starting point. What will you create?
        </p>
        <div className="mt-8">
          <Button size="lg">Get Started</Button>
        </div>
      </main>
      <footer className="w-full py-6">
        <p className="text-sm text-center text-muted-foreground">
          &copy; {new Date().getFullYear()} Your Company. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
