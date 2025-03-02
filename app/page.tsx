"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import HomeMenu from "@/app/components/HomeMenu";

function HomeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const deepLink = searchParams.get("deeplink");
        if (deepLink && deepLink !== "default") {
            router.push(`/join?room=${deepLink}`);
        }
    }, [searchParams, router]);

    return (
        <div className="py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-6xl">Let's play together</h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300">Join a room to play video games</p>
                </div>

                <HomeMenu />
            </div>
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <HomeContent />
        </Suspense>
    );
}
