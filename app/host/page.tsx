"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Monitor, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Peer, { DataConnection, MediaConnection } from "peerjs";
import { useEffect, useRef, useState } from "react";
import { ShareOptions } from "./_components/ShareOptions";
import { customAlphabet } from "nanoid";

// Constantes
const INITIAL_BITRATE = 3000000;
const MONITOR_INTERVAL = 1000;
const MAX_RESOLUTION = { width: 1920, height: 1080 };
const LOW_RESOLUTION = { width: 1366, height: 768 };
const simpleNanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 4);

// Variable global para acumular métricas
let contador = {
    bytes: 0,
    candidatePairBytes: 0,
    outboundRtpBytes: 0,
    transportSentBytes: 0,
    transportReceivedBytes: 0,
    report: 0,
    packages: 0,
    start: 0,
    finish: 0
};

function adjustBitrate(sender: RTCRtpSender, targetBitrate: number) {
    const params = sender.getParameters();
    if (!params.encodings) {
        params.encodings = [{}];
    }
    params.encodings[0].maxBitrate = targetBitrate;
    params.encodings[0].maxFramerate = 60;
    params.encodings[0].networkPriority = "high";
    params.encodings[0].priority = "high";
    params.degradationPreference = "maintain-framerate";
    sender.setParameters(params).catch((err) => console.error("Error adjusting bitrate", err));
}

async function adjustResolution(track: MediaStreamTrack, resolution: "low" | "high") {
    try {
        if (resolution === "low") {
            await track.applyConstraints({
                frameRate: { ideal: 60, max: 60 },
                width: { ideal: LOW_RESOLUTION.width, max: LOW_RESOLUTION.width },
                height: { ideal: LOW_RESOLUTION.height, max: LOW_RESOLUTION.height }
            });
        } else {
            await track.applyConstraints({
                frameRate: { ideal: 60, max: 60 },
                width: { ideal: MAX_RESOLUTION.width, max: MAX_RESOLUTION.width },
                height: { ideal: MAX_RESOLUTION.height, max: MAX_RESOLUTION.height }
            });
        }
    } catch (err) {
        console.error("Error adjusting resolution:", err);
    }
}

/* 
  monitorAndAdjustBitrate actualiza todas las métricas de streaming con un único callback.
  El callback updateMetrics recibe un objeto con candidatePair, outboundRtp, transportSent,
  transportReceived y bitrate.
*/
async function monitorAndAdjustBitrate(call: MediaConnection, sender: RTCRtpSender, updateMetrics: (metrics: { candidatePair: number; outboundRtp: number; transportSent: number; transportReceived: number; bitrate: number }) => void) {
    try {
        if (!call || !call.peerConnection) {
            console.warn("peerConnection not available");
            return;
        }
        const stats = await call.peerConnection.getStats();
        let packetLoss = 0;
        let currentRtt = 0;

        stats.forEach((report) => {
            if (report.type === "candidate-pair" && report.transportId === "T01") {
                contador.candidatePairBytes += report.bytesSent;
                contador.bytes += report.bytesSent;
                contador.report += 1;
                contador.packages += report.packetsSent;
            }
            if (report.type === "outbound-rtp") {
                contador.outboundRtpBytes += report.bytesSent;
            }
            if (report.type === "transport" && report.transportId === "T01") {
                if (report.bytesSent) {
                    contador.transportSentBytes += report.bytesSent;
                }
                if (report.bytesReceived) {
                    contador.transportReceivedBytes += report.bytesReceived;
                }
            }
            if (report.type === "remote-inbound-rtp" && report.kind === "video") {
                packetLoss = report.packetsLost || 0;
                currentRtt = report.roundTripTime || 0;
            }
        });

        // Actualiza todas las métricas en MB y bitrate en bps
        const candidatePair = contador.candidatePairBytes / (1024 * 1024);
        const outboundRtp = contador.outboundRtpBytes / (1024 * 1024);
        const transportSent = contador.transportSentBytes / (1024 * 1024);
        const transportReceived = contador.transportReceivedBytes / (1024 * 1024);

        // Lógica de ajuste de bitrate
        if (packetLoss >= 10 || currentRtt > 0.3) {
            const newBitrate = INITIAL_BITRATE * 0.8;
            adjustBitrate(sender, newBitrate);
            if (sender.track) {
                await adjustResolution(sender.track, "low");
            }
            console.log("Bitrate adjusted to:", newBitrate, "packetLoss:", packetLoss, "RTT:", currentRtt);
            updateMetrics({
                candidatePair,
                outboundRtp,
                transportSent,
                transportReceived,
                bitrate: newBitrate
            });
        } else {
            if (sender.getParameters().encodings?.[0]?.maxBitrate !== INITIAL_BITRATE) {
                adjustBitrate(sender, INITIAL_BITRATE);
                if (sender.track) {
                    await adjustResolution(sender.track, "high");
                }
                console.log("Bitrate adjusted to:", INITIAL_BITRATE, "packetLoss:", packetLoss, "RTT:", currentRtt);
            }
            updateMetrics({
                candidatePair,
                outboundRtp,
                transportSent,
                transportReceived,
                bitrate: INITIAL_BITRATE
            });
        }
    } catch (err) {
        console.error("Error getting stats", err);
    }
}

function throttle<F extends (...args: any[]) => void>(func: F, delay: number): F {
    let lastCall = 0;
    return function (...args: any[]) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func(...args);
        }
    } as F;
}

// Formatea segundos a HH:mm:ss
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

export default function HostPage() {
    const [roomId, setRoomId] = useState("");
    const [peer, setPeer] = useState<Peer | null>(null);
    const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
    const [connections, setConnections] = useState<DataConnection[]>([]);
    // Estado único para las métricas de streaming
    const [streamingMetrics, setStreamingMetrics] = useState({
        candidatePair: 0,
        outboundRtp: 0,
        transportSent: 0,
        transportReceived: 0,
        bitrate: INITIAL_BITRATE
    });
    const [elapsedTime, setElapsedTime] = useState(0);

    const { toast } = useToast();
    const router = useRouter();

    interface JoystickData {
        type: string;
        [key: string]: any;
    }

    const wsRef = useRef<WebSocket | null>(null);

    const reconnectWebSocket = () => {
        if (wsRef.current) wsRef.current.close();
        const ws = new WebSocket("ws://localhost:8080");
        ws.onopen = () => {
            console.log("WebSocket reconnected");
            toast({
                title: "WebSocket reconnected",
                description: "Connection re-established successfully."
            });
        };
        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            toast({
                title: "WebSocket error",
                description: "Error re-connecting to WebSocket.",
                variant: "destructive"
            });
        };
        ws.onclose = () => console.log("WebSocket closed");
        wsRef.current = ws;
    };

    // Inicia contador (tiempo) cuando hay transmisión
    useEffect(() => {
        let timerId: NodeJS.Timeout;
        if (activeStream) {
            setElapsedTime(0);
            timerId = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(timerId);
    }, [activeStream]);

    useEffect(() => {
        if (roomId) {
            const ws = new WebSocket("ws://localhost:8080");
            ws.onopen = () => console.log("WebSocket connected");
            ws.onerror = (error) => console.error("WebSocket error:", error);
            ws.onclose = () => console.log("WebSocket closed");
            wsRef.current = ws;
        }
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, [roomId]);

    const sendJoystickDataThrottled = throttle((message: object) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, 5);

    function processJoystickData(data: JoystickData, peerId: string) {
        const message = { peerId, ...data };
        sendJoystickDataThrottled(message);
    }

    useEffect(() => {
        try {
            const customRoomId = simpleNanoid();
            const newPeer = new Peer(customRoomId, {
                debug: 2,
                config: {
                    iceServers: [{ url: "stun:stun.l.google.com:19302" }, { url: "stun:stun1.l.google.com:19302" }, { url: "stun:stun2.l.google.com:19302" }, { url: "stun:stun3.l.google.com:19302" }]
                }
            });
            setPeer(newPeer);
            newPeer.on("open", (id) => setRoomId(id));
            newPeer.on("connection", (connection) => {
                setConnections((prev) => [...prev, connection]);
                console.log("New data connection from:", connection.peer);
                connection.on("data", (data) => {
                    if (data && typeof data === "object" && "type" in data && (data as JoystickData).type === "joystick") {
                        processJoystickData(data as JoystickData, connection.peer);
                    }
                });
                connection.on("close", () => {
                    console.log("Connection closed from:", connection.peer);
                    setConnections((prev) => prev.filter((conn) => conn.peer !== connection.peer));
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: "peer-disconnected", peer: connection.peer }));
                    }
                });
            });
            return () => {
                newPeer.destroy();
            };
        } catch (error) {
            console.error("Error initializing peer:", error);
        }
    }, []);

    useEffect(() => {
        if (!peer) return;
        if (!activeStream) {
            if (connections.length > 0) {
                toast({
                    title: "New viewer connected",
                    description: "Click to start sharing your screen.",
                    duration: Infinity,
                    action: (
                        <ToastAction
                            altText="Start sharing"
                            onClick={async () => {
                                try {
                                    const stream = await navigator.mediaDevices.getDisplayMedia({
                                        video: {
                                            frameRate: { ideal: 60, max: 60 },
                                            width: { ideal: MAX_RESOLUTION.width, max: MAX_RESOLUTION.width },
                                            height: { ideal: MAX_RESOLUTION.height, max: MAX_RESOLUTION.height }
                                        },
                                        audio: {
                                            noiseSuppression: false,
                                            autoGainControl: false,
                                            echoCancellation: false
                                        }
                                    });
                                    setActiveStream(stream);
                                } catch (err) {
                                    console.error("Screen sharing error:", err);
                                    toast({
                                        title: "Screen sharing error",
                                        description: "Failed to start screen sharing. Please try again.",
                                        variant: "destructive"
                                    });
                                }
                            }}>
                            Start Sharing
                        </ToastAction>
                    )
                });
            }
        } else {
            if (!peer || !activeStream || connections.length === 0) return;
            connections.forEach((connection) => {
                const call = peer.call(connection.peer, activeStream!);

                // Función para forzar H264 en el bloque de video (sin afectar al resto del SDP)
                function forceH264inSDP(sdp: string): string {
                    const sdpLines = sdp.split("\r\n");
                    const mVideoIndex = sdpLines.findIndex((line) => line.startsWith("m=video"));
                    if (mVideoIndex === -1) return sdp;
                    let nextMLineIndex = sdpLines.findIndex((line, i) => i > mVideoIndex && line.startsWith("m="));
                    if (nextMLineIndex === -1) nextMLineIndex = sdpLines.length;
                    let videoBlock = sdpLines.slice(mVideoIndex, nextMLineIndex);
                    const h264Payloads = new Set<string>();
                    videoBlock.forEach((line) => {
                        if (line.startsWith("a=rtpmap:") && line.toLowerCase().includes("h264")) {
                            const match = line.match(/^a=rtpmap:(\d+)\s/);
                            if (match && match[1]) {
                                h264Payloads.add(match[1]);
                            }
                        }
                    });
                    if (h264Payloads.size === 0) {
                        console.warn("No se detectaron payloads H264 en video. SDP inalterado.");
                        return sdp;
                    }
                    const mLineParts = videoBlock[0].split(" ");
                    const mHeader = mLineParts.slice(0, 3);
                    const mPayloads = mLineParts.slice(3).filter((pt) => h264Payloads.has(pt));
                    if (mPayloads.length === 0) {
                        console.warn("No se encontró ningún payload H264 en m=video. SDP inalterado.");
                        return sdp;
                    }
                    videoBlock[0] = [...mHeader, ...mPayloads].join(" ");
                    videoBlock = videoBlock.filter((line) => {
                        if (line.startsWith("a=rtpmap:") || line.startsWith("a=fmtp:") || line.startsWith("a=rtcp-fb:")) {
                            const payloadMatch = line.match(/^a=(?:rtpmap|fmtp|rtcp-fb):(\d+)/);
                            return payloadMatch && payloadMatch[1] && h264Payloads.has(payloadMatch[1]);
                        }
                        return true;
                    });
                    const newSdpLines = [...sdpLines.slice(0, mVideoIndex), ...videoBlock, ...sdpLines.slice(nextMLineIndex)];
                    return newSdpLines.join("\r\n");
                }

                const pc = call.peerConnection;
                const originalSetLocalDescription = pc.setLocalDescription.bind(pc);
                pc.setLocalDescription = (description: RTCSessionDescriptionInit) => {
                    if (description && description.sdp) {
                        let modifiedSdp = forceH264inSDP(description.sdp);
                        description.sdp = modifiedSdp;
                        console.log("SDP modificado:", description.sdp);
                    }
                    return originalSetLocalDescription(description);
                };

                // Llamamos a monitorAndAdjustBitrate usando un único callback para actualizar las métricas
                call.peerConnection.getSenders().forEach((sender) => {
                    if (sender.track?.kind === "video") {
                        const monitorIntervalId = setInterval(() => {
                            monitorAndAdjustBitrate(call, sender, (metrics) => {
                                setStreamingMetrics(metrics);
                            });
                        }, MONITOR_INTERVAL);
                        sender.track.onended = () => {
                            clearInterval(monitorIntervalId);
                        };
                    }
                });
                activeStream.getTracks()[0].onended = () => {
                    call.close();
                    activeStream.getTracks().forEach((track) => track.stop());
                };
            });
        }
    }, [peer, toast, activeStream, connections]);

    function endSession() {
        if (activeStream) {
            activeStream.getTracks().forEach((track) => track.stop());
            setActiveStream(null);
        }
        if (peer) {
            peer.destroy();
            setPeer(null);
        }
        setConnections([]);
        setRoomId("");
        toast({
            title: "Session ended",
            description: "Your screen sharing session has been terminated."
        });
        router.push("/");
    }

    // Se agrupa la sección de estadísticas en una sola variable
    const streamingStats = (
        <div className="space-y-1">
            <div className="text-sm text-gray-500">
                <span>Current Bitrate: </span>
                <span className="font-semibold">{(streamingMetrics.bitrate / 1000).toFixed(0)} kbps</span>
            </div>
            <div className="text-sm text-gray-500">Candidate-Pair Consumption: {streamingMetrics.candidatePair.toFixed(2)} MB</div>
            <div className="text-sm text-gray-500">Outbound RTP Consumption: {streamingMetrics.outboundRtp.toFixed(2)} MB</div>
            <div className="text-sm text-gray-500">Transport Sent: {streamingMetrics.transportSent.toFixed(2)} MB</div>
            <div className="text-sm text-gray-500">Transport Received: {streamingMetrics.transportReceived.toFixed(2)} MB</div>
            <div className="text-sm text-gray-500">Transmission Time: {formatTime(elapsedTime)}</div>
        </div>
    );

    return (
        <div className="py-8 px-4">
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
                            <Monitor className="h-6 w-6" />
                            Your Screen Sharing Room
                        </CardTitle>
                        <CardDescription>Share your room code or link with others to let them view your screen.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <ShareOptions roomId={roomId} />
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-gray-500" />
                                <span className="text-sm text-gray-500">Current Viewers</span>
                            </div>
                            <span className="text-lg font-semibold">{connections.length}</span>
                        </div>
                        {streamingStats}
                        <div className="flex justify-end">
                            <Button variant="outline" onClick={reconnectWebSocket}>
                                Reconnect WebSocket
                            </Button>
                        </div>
                        {activeStream && (
                            <div className="flex justify-end pt-4">
                                <Button variant="destructive" onClick={endSession} className="flex items-center gap-2">
                                    Stop sharing
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
