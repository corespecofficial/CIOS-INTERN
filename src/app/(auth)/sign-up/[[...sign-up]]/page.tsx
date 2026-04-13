/* eslint-disable @next/next/no-img-element */
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#E8EDF5" }}>
          Create Account
        </h1>
        <p style={{ fontSize: 14, color: "#8892A4" }}>Join the CIOS Internship Program</p>
      </div>
      <SignUp
        fallbackRedirectUrl="/post-auth"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-transparent shadow-none border-none w-full",
            formButtonPrimary: "bg-[#1E88E5] hover:bg-[#1565C0] text-white font-semibold rounded-xl h-11 text-sm",
            headerTitle: "text-white text-lg",
            headerSubtitle: "text-gray-400 text-sm",
            socialButtonsBlockButton: "border border-white/10 text-white hover:bg-white/5 rounded-xl h-11",
            socialButtonsBlockButtonText: "text-white text-sm",
            formFieldLabel: "text-gray-400 text-xs uppercase tracking-wider",
            formFieldInput: "bg-[#0A0E1A] border border-white/10 text-white rounded-xl h-11 text-sm focus:border-[#1E88E5] focus:ring-1 focus:ring-[#1E88E5]/30",
            footerActionLink: "text-[#1E88E5] hover:text-[#42A5F5] font-semibold",
            identityPreviewEditButton: "text-[#1E88E5]",
            formFieldAction: "text-[#1E88E5] text-xs",
            dividerLine: "bg-white/10",
            dividerText: "text-gray-500 text-xs",
            footer: "hidden",
          },
        }}
      />
      <p style={{ fontSize: 12, color: "#5A6478", textAlign: "center" }}>
        Already have an account?{" "}
        <a href="/sign-in" style={{ color: "#1E88E5", fontWeight: 600, textDecoration: "none" }}>Sign In</a>
      </p>
    </div>
  );
}
