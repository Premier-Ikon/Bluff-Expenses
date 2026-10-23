import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/AuthProvider";

export const metadata: Metadata = {
  title: "Bluff US Tour Expenses",
  description: "Photograph receipts and track Bluff 2026 US Tour expenses.",
  applicationName: "Bluff US Tour Expenses",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Tour Expenses", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
