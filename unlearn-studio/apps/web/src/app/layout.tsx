import "./globals.css";

export const metadata = {
  title: "NullMind AI | LLM Unlearning & Selective Retraining Platform",
  description: "Open-source LLM unlearning engine. Surgically erase copyrighted code, PII, and unsafe data without spending $100k+ to retrain full model weights from scratch.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
