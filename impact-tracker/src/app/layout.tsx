import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Impact Tracker",
  description: "Track programme impact as it happens.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
