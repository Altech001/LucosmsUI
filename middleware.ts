import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/favicon.ico"]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, redirectToSignIn } = await auth();

  // If the user is not authenticated and the route is not public, redirect to sign-in
  if (!userId && !isPublicRoute(request)) {
    return redirectToSignIn({ returnBackUrl: request.url });
  }

  // Allow authenticated users to proceed to any route
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};