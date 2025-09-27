import Auth from "@/components/Auth";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] animate-grid-move" />
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 mb-4 tracking-tight uppercase">
              Neural Gateway
            </h1>
            <p className="text-muted-foreground text-sm font-mono tracking-wide">
              AUTHENTICATE TO ACCESS THE SYSTEM
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl" />
            <div className="relative">
              <Auth />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}