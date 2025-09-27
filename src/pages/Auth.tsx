import Auth from "@/components/Auth";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-100 mb-2">
              🔒 Neural Gateway
            </h1>
            <p className="text-gray-400 text-sm">
              Authenticate to unlock the neural pathways of innovation
            </p>
          </div>
          <Auth />
        </div>
      </div>
    </div>
  );
}