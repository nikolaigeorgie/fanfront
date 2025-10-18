import type { inferRouterOutputs } from "@trpc/server";

import { authRouter } from "./router/auth";
import { postRouter } from "./router/post";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
}) as ReturnType<typeof createTRPCRouter>;

// export type definition of API
export type AppRouter = typeof appRouter;
