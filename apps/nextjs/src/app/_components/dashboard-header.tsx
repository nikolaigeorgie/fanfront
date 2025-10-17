import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { Session } from "@acme/auth";
import { Button } from "@acme/ui/button";

import { auth } from "~/auth/server";

interface DashboardHeaderProps {
  session: Session;
}

export function DashboardHeader({ session }: DashboardHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Fan<span className="text-purple-600">Front</span>
            </h1>
          </div>

          {/* Navigation */}
          <nav className="hidden items-center space-x-8 md:flex">
            <a
              href="/dashboard"
              className="font-medium text-gray-700 hover:text-purple-600"
            >
              Dashboard
            </a>
            <a href="/events" className="text-gray-500 hover:text-purple-600">
              Events
            </a>
            <a
              href="/reservations"
              className="text-gray-500 hover:text-purple-600"
            >
              Reservations
            </a>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden items-center space-x-3 md:flex">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session.user.name || session.user.email}
                </p>
                <p className="text-xs text-gray-500">Welcome back!</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600">
                <span className="text-sm font-medium text-white">
                  {(session.user.name || session.user.email || "U")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
            </div>

            <form>
              <Button
                variant="outline"
                size="sm"
                formAction={async () => {
                  "use server";
                  await auth.api.signOut({
                    headers: await headers(),
                  });
                  redirect("/");
                }}
              >
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
