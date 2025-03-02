"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Users } from "lucide-react";
import Link from "next/link";

export default function HomeMenu() {
    const [hostname, setHostname] = useState("");

    useEffect(() => {
        setHostname(window.location.hostname);
    }, []);

    return (
        <div className="grid md:grid-cols-2 gap-6 mt-12">
            {hostname === "localhost" && (
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Monitor className="h-6 w-6" />
                            Start Sharing
                        </CardTitle>
                        <CardDescription>Create a room and share your screen with others</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/host">
                            <Button className="w-full">Create Room</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        Join a Room
                    </CardTitle>
                    <CardDescription>Enter a room code to view someone's screen</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/join">
                        <Button variant="outline" className="w-full">
                            Join Room
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
