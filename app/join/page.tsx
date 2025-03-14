"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import Peer, { DataConnection, MediaConnection } from "peerjs";
import { useEffect, useRef, useState } from "react";
import "@/styles/fullscreen.css";

// Variable global para acumular las estadísticas similares al host
let joinStats = {
    start: 0,
    bytesReceived: 0
};

function formatTime(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600)
        .toString()
        .padStart(2, "0");
    const minutes = Math.floor((totalSeconds % 3600) / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
}

export default function JoinPage() {
    const [mounted, setMounted] = useState(false);
    const [roomId, setRoomId] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);
    const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
    const [showVideoControls, setShowVideoControls] = useState(false);
    const [videoPlaying, setVideoPlaying] = useState(true);
    const [videoMuted, setVideoMuted] = useState(true);
    const [showStats, setShowStats] = useState(false);
    const [statsData, setStatsData] = useState({
        fps: 0,
        packetLoss: 0,
        ms: 0,
        jitter: 0,
        width: 0,
        height: 0,
        videoEncoder: "",
        consumptionMB: 0,
        timer: "00:00:00",
        audioCodec: "",
        audioSampleRate: 0
    });
    const [joinCall, setJoinCall] = useState<MediaConnection | null>(null);
    const [isPWA, setIsPWA] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<Peer | null>(null);
    const dataConnRef = useRef<DataConnection | null>(null);
    const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
            setIsPWA(isStandalone);
        }
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const roomFromUrl = params.get("room");
        if (roomFromUrl) {
            setRoomId(roomFromUrl);
        }
        return () => {
            if (peerRef.current) {
                peerRef.current.destroy();
                peerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (videoRef.current && activeStream) {
            videoRef.current.srcObject = activeStream;
            videoRef.current.play().catch(console.error);
            setVideoPlaying(true);
            setVideoMuted(true);
        }
    }, [activeStream]);

    function joinRoom(roomIdToJoin: string = roomId) {
        if (!roomIdToJoin.trim()) {
            toast({
                title: "Room code required",
                description: "Please enter a valid room code.",
                variant: "destructive"
            });
            return;
        }

        setIsConnecting(true);

        const peer = new Peer({ debug: 2 });
        peerRef.current = peer;

        peer.on("open", () => {
            const connection = peer.connect(roomIdToJoin);
            dataConnRef.current = connection;

            connection.on("open", () => {
                toast({
                    title: "Connected!",
                    description: "Waiting for host to share their screen..."
                });
            });

            peer.on("call", (call) => {
                setJoinCall(call);
                // Al recibir la llamada, iniciamos el contador si aún no existe
                if (!joinStats.start) {
                    joinStats.start = Date.now();
                }
                call.answer();
                call.on("stream", (remoteStream) => {
                    setActiveStream(remoteStream);
                });
            });

            connection.on("close", () => {
                setIsConnecting(false);
                setRoomId("");
                setActiveStream(null);
                toast({
                    title: "Disconnected",
                    description: "The session has been ended.",
                    variant: "destructive"
                });
            });
        });

        peer.on("error", (err) => {
            console.error("Peer error:", err);
            setIsConnecting(false);
            toast({
                title: "Connection failed",
                description: "Could not connect to the room. Please check the room code and try again.",
                variant: "destructive"
            });
        });
    }

    useEffect(() => {
        const lastStates = new Map<number, string>();

        const intervalId = window.setInterval(() => {
            const gamepads = navigator.getGamepads();
            for (let i = 0; i < gamepads.length; i++) {
                const gp = gamepads[i];
                if (gp && dataConnRef.current && dataConnRef.current.open) {
                    const currentState = JSON.stringify({
                        axes: gp.axes,
                        buttons: gp.buttons.map((button) => button.value)
                    });
                    const lastState = lastStates.get(gp.index);
                    if (currentState !== lastState) {
                        lastStates.set(gp.index, currentState);

                        const data = {
                            type: "joystick",
                            id: `${dataConnRef.current.provider.id}-${gp.index}`,
                            axes: gp.axes,
                            buttons: gp.buttons.map((button) => button.value)
                        };
                        dataConnRef.current.send(data);
                    }
                }
            }
        }, 5);

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    function handleVideoClick() {
        setShowVideoControls(true);
        if (controlsTimeout.current) {
            clearTimeout(controlsTimeout.current);
        }
        controlsTimeout.current = setTimeout(() => {
            setShowVideoControls(false);
        }, 2000);
    }

    function togglePlayPause() {
        if (videoRef.current) {
            if (videoPlaying) {
                videoRef.current.pause();
                setVideoPlaying(false);
            } else {
                videoRef.current.play();
                setVideoPlaying(true);
            }
        }
    }

    function toggleMute() {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setVideoMuted(videoRef.current.muted);
        }
    }

    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval>;
        if (joinCall && joinCall.peerConnection) {
            intervalId = setInterval(async () => {
                try {
                    const statsReport = await joinCall.peerConnection.getStats();
                    let framesPerSecond = 0;
                    let packetsLost = 0;
                    let jitter = 0;
                    let width = 0;
                    let height = 0;
                    let rtt = 0;
                    let totalInboundBytes = 0;
                    let codec = "";
                    let audioCodec = "";
                    let audioSampleRate = 0;

                    // Recorremos el reporte de estadísticas
                    statsReport.forEach((report) => {
                        console.log(JSON.stringify(report, null, 2));
                        if (report.type === "inbound-rtp") {
                            // Sumamos bytesReceived de todos los reportes inbound-rtp
                            totalInboundBytes += report.bytesReceived || 0;
                            if (report.kind === "video") {
                                framesPerSecond = (report as any).framesPerSecond || framesPerSecond;
                                packetsLost = report.packetsLost || packetsLost;
                                jitter = report.jitter || jitter;
                                width = (report as any).frameWidth || width;
                                height = (report as any).frameHeight || height;
                            }
                        }
                        if (report.type === "candidate-pair") {
                            rtt = report.roundTripTime ? Math.round(report.currentRoundTripTime * 1000) : rtt;
                        }

                        if (report.type === "codec") {
                            codec = report.mimeType || codec;
                        }

                        // Extraemos la info de audio del reporte de codec
                        if (report.type === "codec" && report.mimeType && report.mimeType.startsWith("audio/")) {
                            audioCodec = report.mimeType;
                            audioSampleRate = report.clockRate;
                        }
                    });

                    // Actualizamos la variable global joinStats con los bytes recibidos
                    joinStats.bytesReceived += totalInboundBytes;
                    const elapsedSec = joinStats.start ? Math.floor((Date.now() - joinStats.start) / 1000) : 0;

                    setStatsData({
                        fps: framesPerSecond,
                        packetLoss: packetsLost,
                        ms: rtt,
                        jitter: jitter,
                        width: width,
                        height: height,
                        videoEncoder: codec,
                        consumptionMB: joinStats.bytesReceived / (1024 * 1024),
                        timer: formatTime(elapsedSec),
                        audioCodec: audioCodec,
                        audioSampleRate: audioSampleRate
                    });
                } catch (err) {
                    console.error("Error updating stats", err);
                }
            }, 1000);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [joinCall]);

    return (
        <div className="py-8 px-4">
            {mounted ? (
                <div className="max-w-2xl mx-auto space-y-8">
                    <Button variant="outline" asChild>
                        <Link href="/" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-6 w-6" />
                                Join a Room
                            </CardTitle>
                            <CardDescription>Enter the room code to join and view the shared screen</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {!activeStream ? (
                                <div className="space-y-4">
                                    <Input placeholder="Enter room code" value={roomId.toUpperCase()} onChange={(e) => setRoomId(e.target.value.toUpperCase())} disabled={isConnecting} />
                                    <Button className="w-full" onClick={() => joinRoom()} disabled={isConnecting || !roomId.trim()}>
                                        {isConnecting ? "Connecting..." : "Join Room"}
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className={`fullscreen-simulated relative ${!isPWA ? "fullscreen-simulated-align-top" : ""}`} onClick={handleVideoClick}>
                                        <video ref={videoRef} playsInline webkit-playsinline="true" autoPlay muted controls={false} preload="metadata" disablePictureInPicture disableRemotePlayback onContextMenu={(e) => e.preventDefault()} className="fullscreen-video"></video>
                                        {showVideoControls && (
                                            <div className="absolute top-2 right-2 flex flex-wrap gap-2">
                                                <Button variant="outline">
                                                    <Link href="/" className="flex items-center gap-2">
                                                        Back to Home
                                                    </Link>
                                                </Button>
                                                <Button onClick={togglePlayPause}>{videoPlaying ? "Pause" : "Play"}</Button>
                                                <Button onClick={toggleMute}>{videoMuted ? "Unmute" : "Mute"}</Button>
                                                <Button onClick={() => setShowStats((prev) => !prev)}>{showStats ? "Hide Stats" : "Show Stats"}</Button>
                                            </div>
                                        )}
                                        {showStats && (
                                            <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-75 text-white p-4 rounded shadow-lg z-10">
                                                <h4 className="mb-2 text-sm font-bold">Streaming Stats</h4>
                                                <p className="text-xs">FPS: {statsData.fps}</p>
                                                <p className="text-xs">Packet Loss: {statsData.packetLoss}</p>
                                                <p className="text-xs">RTT: {statsData.ms} ms</p>
                                                <p className="text-xs">Jitter: {statsData.jitter}</p>
                                                <p className="text-xs">
                                                    Resolution: {statsData.width}x{statsData.height}
                                                </p>
                                                <p className="text-xs">Consumption: {statsData.consumptionMB.toFixed(2)} MB</p>
                                                <p className="text-xs">Codec: {statsData.videoEncoder}</p>
                                                <p className="text-xs">Streaming Time: {statsData.timer}</p>
                                                <p className="text-xs">Audio Codec: {statsData.audioCodec}</p>
                                                <p className="text-xs">Sample Rate: {statsData.audioSampleRate} Hz</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div>Loading...</div>
            )}
        </div>
    );
}
