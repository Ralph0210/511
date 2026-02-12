import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Billboard Charts Explorer",
  description: "Data visualization of Billboard Hot 100 chart history",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
