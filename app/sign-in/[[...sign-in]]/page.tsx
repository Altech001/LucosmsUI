import type React from "react"
import Link from "next/link"
import { SignIn } from "@clerk/nextjs"
import { MessageSquare } from "lucide-react"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md flex items-center justify-center flex-col">
        {/* Logo */}
        <Link href="/" className="mb-5 flex items-center justify-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <span className="text-base font-semibold">Lucosms</span>
        </Link>

        {/* Heading */}
        <div className="mb-2 text-center">
          <p className="text-sm text-muted-foreground">Sign in to continue to your account</p>
        </div>

        {/* Clerk Sign In Component */}
        <SignIn 
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-transparent shadow-none w-full",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "h-10 text-base bg-transparent border-border hover:bg-accent",
              socialButtonsBlockButtonText: "text-base font-medium",
              formButtonPrimary: "h-10 text-base bg-primary hover:bg-primary/90",
              formFieldInput: "h-10 text-base",
              footerActionLink: "text-primary hover:text-primary/90",
              identityPreviewText: "text-sm",
              formFieldLabel: "text-sm font-medium",
              dividerLine: "bg-border",
              dividerText: "text-xs text-muted-foreground uppercase",
              footer: "hidden",
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
        />

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link href="/help" className="hover:text-foreground transition-colors">
            Help
          </Link>
        </div>
      </div>
    </div>
  )
}