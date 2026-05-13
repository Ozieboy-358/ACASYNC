import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AcaSync | Academic Organizer",
  description: "Your premium school material and coursework organizer with Google Calendar sync.",
};

import { AcademicProvider } from "@/lib/context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AcademicProvider>
          <div className="app-container">
            {children}
          </div>
        </AcademicProvider>
      </body>
    </html>
  );
}
