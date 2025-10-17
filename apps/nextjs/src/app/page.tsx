import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { AuthShowcase } from "./_components/auth-showcase";

export default async function HomePage() {
  const session = await getSession();

  // If user is authenticated, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
          <div className="mb-8">
            <h1 className="mb-6 text-6xl font-bold text-white md:text-8xl">
              Fan<span className="text-purple-400">Front</span>
            </h1>
            <p className="mb-4 max-w-2xl text-xl text-gray-300 md:text-2xl">
              Reserve Your Spot, Skip the Wait
            </p>
            <p className="max-w-3xl text-lg leading-relaxed text-gray-400">
              Join the revolution in fan experiences. Secure your place in line
              digitally, arrive when it's your turn, and spend more time
              enjoying what you love.
            </p>
          </div>

          {/* Features Grid */}
          <div className="mb-12 grid max-w-4xl gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 text-3xl">⚡</div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Instant Reservations
              </h3>
              <p className="text-gray-300">
                Book your spot in seconds, no more physical queues
              </p>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 text-3xl">📍</div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Live Location
              </h3>
              <p className="text-gray-300">
                Track your position and get notified when it's your turn
              </p>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 text-3xl">🎯</div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Smart Timing
              </h3>
              <p className="text-gray-300">
                Arrive exactly when you need to, maximize your time
              </p>
            </div>
          </div>

          {/* Auth Section */}
          <div className="w-full max-w-md rounded-xl border border-white/20 bg-white/10 p-8 backdrop-blur-sm">
            <h2 className="mb-6 text-center text-2xl font-bold text-white">
              Get Started
            </h2>
            <AuthShowcase />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-400">
          <p>
            &copy; 2024 FanFront. Revolutionizing the way fans experience
            events.
          </p>
        </div>
      </div>
    </main>
  );
}
