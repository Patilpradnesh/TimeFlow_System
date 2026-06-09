import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/providers/SocketProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "TimeFlow",
  description: "Intelligent, adaptive execution system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <AuthProvider>
          <SocketProvider>
            {children}
            <Toaster position="top-center" richColors />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
