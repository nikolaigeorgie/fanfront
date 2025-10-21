import { auth } from "~/auth/server";

// Force this route to be dynamic and not pre-rendered at build time
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = auth.handler;
export const POST = auth.handler;
