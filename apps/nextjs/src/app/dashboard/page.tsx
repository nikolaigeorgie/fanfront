import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { DashboardHeader } from "../_components/dashboard-header";
import { DashboardMap } from "../_components/dashboard-map";

export default async function DashboardPage() {
  const session = await getSession();

  // If user is not authenticated, redirect to home
  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader session={session} />
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-white shadow-sm">
              <div className="border-b p-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Your Location
                </h2>
                <p className="mt-1 text-gray-600">
                  Track your current position and nearby events
                </p>
              </div>
              <div className="p-6">
                <DashboardMap />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Reservations */}
            <div className="rounded-lg border bg-white shadow-sm">
              <div className="border-b p-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Active Reservations
                </h3>
              </div>
              <div className="p-6">
                <div className="py-8 text-center text-gray-500">
                  <div className="mb-2 text-4xl">🎫</div>
                  <p>No active reservations</p>
                  <p className="mt-1 text-sm">
                    Book your first spot to get started!
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-lg border bg-white shadow-sm">
              <div className="border-b p-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Quick Actions
                </h3>
              </div>
              <div className="space-y-3 p-6">
                <button className="w-full rounded-lg bg-purple-600 px-4 py-3 font-medium text-white transition-colors hover:bg-purple-700">
                  Find Events Nearby
                </button>
                <button className="w-full rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-200">
                  View History
                </button>
                <button className="w-full rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-200">
                  Settings
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-lg border bg-white shadow-sm">
              <div className="border-b p-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Your Stats
                </h3>
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Reservations</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Time Saved</span>
                  <span className="font-semibold">0 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Events Attended</span>
                  <span className="font-semibold">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
