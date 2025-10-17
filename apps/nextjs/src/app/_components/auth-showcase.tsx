import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@acme/ui/button";

import { auth, getSession } from "~/auth/server";

export async function AuthShowcase() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex gap-2">
          <button className="flex-1 border-b-2 border-purple-400 px-4 py-2 font-medium text-white">
            Sign In
          </button>
          <button className="flex-1 border-b-2 border-transparent px-4 py-2 font-medium text-gray-400">
            Sign Up
          </button>
        </div>

        <form className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-400 focus:outline-none"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-400 focus:outline-none"
            required
          />
          <Button
            size="lg"
            className="w-full rounded-lg bg-purple-600 py-3 font-medium text-white transition-colors hover:bg-purple-700"
            formAction={async (formData: FormData) => {
              "use server";
              const email = formData.get("email") as string;
              const password = formData.get("password") as string;

              const res = await auth.api.signInEmail({
                body: {
                  email,
                  password,
                },
              });

              if (res.error) {
                // Handle error - in a real app you'd want proper error handling
                console.error("Sign in error:", res.error);
                return;
              }

              redirect("/dashboard");
            }}
          >
            Sign In
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Don't have an account?{" "}
            <button className="font-medium text-purple-400 hover:text-purple-300">
              Sign up here
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl">
        <span>Logged in as {session.user.name}</span>
      </p>

      <form>
        <Button
          size="lg"
          formAction={async () => {
            "use server";
            await auth.api.signOut({
              headers: await headers(),
            });
            redirect("/");
          }}
        >
          Sign out
        </Button>
      </form>
    </div>
  );
}
