import { Clarity } from "@/components/Clarity";
import { Toaster } from "@/components/ui/toaster";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Head from "./head";
import ClientHeightUpdater from "./components/ClientHeightUpdater";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Let's play together",
    description: "Share your screen instantly with anyone using a simple room code. No downloads or sign-ups required.",
    keywords: "screen sharing, webrtc, online screen share, browser screen sharing, free screen sharing"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <Head />
            <body className={inter.className}>
                <ClientHeightUpdater />
                <main className="flex flex-col justify-between min-h-dvh bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">{children}</main>
                <Clarity />
                <Toaster />
            </body>
        </html>
    );
}
