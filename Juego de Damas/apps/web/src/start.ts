import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => {
  return {
    requestMiddleware: process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY ? [clerkMiddleware()] : [],
  };
});
