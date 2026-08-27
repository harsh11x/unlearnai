import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "UNLEARN STUDIO — AI Model Unlearning Platform",
  description: "Selective unlearning, capability reduction, and model knowledge control. Forget what you need, keep what matters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="noise-overlay">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
