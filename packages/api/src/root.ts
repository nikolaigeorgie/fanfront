import { authRouter } from "./router/auth";
import { postRouter } from "./router/post";
import { stripeRouter } from "./router/stripe";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  stripe: stripeRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
