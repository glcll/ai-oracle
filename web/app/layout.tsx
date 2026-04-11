import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Oracle — Decentralized AI Inference with Consensus",
  description:
    "Send a prompt to the Chainlink oracle network. 3 AI models respond, 3 judges score, DON nodes reach consensus. Verified AI inference via a simple API.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
