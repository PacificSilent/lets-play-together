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

// 3mbps
const INITIAL_BITRATE = 3000000;
const MONITOR_INTERVAL = 1000;
const simpleNanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 4);

// Variable global que acumula todas las métricas
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
    // TODO: DEJAR ENCODING H265
    params.encodings[0].maxBitrate = targetBitrate;
    params.encodings[0].maxFramerate = 60;
    params.encodings[0].networkPriority = "high";
    params.encodings[0].priority = "high";
    params.degradationPreference = "maintain-framerate";
    sender.setParameters(params).catch((err) => console.error("Error adjusting bitrate", err));
}

async function adjustResolution(track: MediaStreamTrack, resolution: "low" | "high") {
    try {
        if (track.kind === "audio") {
            await track.applyConstraints({ sampleRate: 16000 });
        } else {
            if (resolution === "low") {
                await track.applyConstraints({
                    frameRate: { ideal: 60, max: 60 },
                    width: { ideal: 1366, max: 1366 },
                    height: { ideal: 768, max: 768 }
                });
            } else {
                await track.applyConstraints({
                    frameRate: { ideal: 60, max: 60 },
                    width: { ideal: 1920, max: 1920 },
                    height: { ideal: 1080, max: 1080 }
                });
            }
        }
    } catch (err) {
        console.error("Error adjusting resolution:", err);
    }
}

/* 
  monitorAndAdjustBitrate ahora utiliza la variable global "contador" para acumular
  separadamente los bytes de candidate-pair, outbound-rtp y transport (sent y received)
*/
async function monitorAndAdjustBitrate(
    call: MediaConnection,
    sender: RTCRtpSender,
    updateMetrics: {
        updateCandidatePair: (mb: number) => void;
        updateOutboundRtp: (mb: number) => void;
        updateTransportSent: (mb: number) => void;
        updateTransportReceived: (mb: number) => void;
    }
) {
    try {
        if (!call || !call.peerConnection) {
            console.warn("peerConnection not available");
            return;
        }
        const stats = await call.peerConnection.getStats();
        let packetLoss = 0;
        let currentRtt = 0;

        stats.forEach((report) => {
            // Puedes ver cada reporte en consola
            // console.log("KK:", JSON.stringify(report, null, 2));

            if (report.type === "candidate-pair" && report.transportId === "T01") {
                // Acumulamos para candidate-pair en la variable global
                contador.candidatePairBytes += report.bytesSent;
                // También se usa para ajustar bitrate con contador
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

        // Actualizamos cada métrica en MB (convertido de bytes)
        updateMetrics.updateCandidatePair(contador.candidatePairBytes / (1024 * 1024));
        updateMetrics.updateOutboundRtp(contador.outboundRtpBytes / (1024 * 1024));
        updateMetrics.updateTransportSent(contador.transportSentBytes / (1024 * 1024));
        updateMetrics.updateTransportReceived(contador.transportReceivedBytes / (1024 * 1024));

        // Lógica de ajuste de bitrate según métricas de pérdida y RTT
        if (packetLoss >= 10 || currentRtt > 0.3) {
            const newBitrate = INITIAL_BITRATE * 0.8;
            adjustBitrate(sender, newBitrate);
            if (sender.track) {
                await adjustResolution(sender.track, "low");
            }
            console.log("Bitrate adjusted to:", newBitrate, "packetLoss:", packetLoss, "RTT:", currentRtt);
        } else {
            if (sender.getParameters().encodings?.[0]?.maxBitrate !== INITIAL_BITRATE) {
                adjustBitrate(sender, INITIAL_BITRATE);
                if (sender.track) {
                    await adjustResolution(sender.track, "high");
                }
                console.log("Bitrate adjusted to:", INITIAL_BITRATE, "packetLoss:", packetLoss, "RTT:", currentRtt);
            }
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

// Función para formatear segundos a HH:mm:ss
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
    // Estado para la métrica original (acumulación en MB)
    const [mbConsumed, setMbConsumed] = useState(0);
    // Estados para cada métrica separada
    const [candidatePairConsumption, setCandidatePairConsumption] = useState(0);
    const [outboundRtpConsumption, setOutboundRtpConsumption] = useState(0);
    const [transportSentConsumption, setTransportSentConsumption] = useState(0);
    const [transportReceivedConsumption, setTransportReceivedConsumption] = useState(0);
    // Estado para el contador de transmisión (en segundos)
    const [elapsedTime, setElapsedTime] = useState(0);

    const { toast } = useToast();
    const router = useRouter();

    interface JoystickData {
        type: string;
        [key: string]: any;
    }

    const wsRef = useRef<WebSocket | null>(null);

    const reconnectWebSocket = () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
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
        ws.onclose = () => {
            console.log("WebSocket closed");
        };
        wsRef.current = ws;
    };

    // Efecto para iniciar el contador cuando se activa la transmisión
    useEffect(() => {
        let timerId: NodeJS.Timeout;
        if (activeStream) {
            // Reiniciamos el contador
            setElapsedTime(0);
            timerId = setInterval(() => {
                setElapsedTime((prev) => prev + 1);
            }, 1000);
        } else {
            // Si no hay transmisión, detenemos el contador
            setElapsedTime(0);
        }
        return () => {
            clearInterval(timerId);
        };
    }, [activeStream]);

    useEffect(() => {
        if (roomId) {
            const ws = new WebSocket("ws://localhost:8080");
            ws.onopen = () => {
                console.log("WebSocket connected");
            };
            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
            };
            ws.onclose = () => {
                console.log("WebSocket closed");
            };
            wsRef.current = ws;
        }
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
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
            newPeer.on("open", (id) => {
                setRoomId(id);
            });
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
                                            width: { ideal: 1920, max: 1920 },
                                            height: { ideal: 1080, max: 1080 }
                                        },
                                        audio: {
                                            noiseSuppression: false,
                                            autoGainControl: false,
                                            echoCancellation: false,
                                            sampleRate: 16000
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
                call.peerConnection.getTransceivers().forEach((transceiver) => {
                    if (transceiver.sender && transceiver.sender.track?.kind === "video") {
                        const videoCaps = RTCRtpSender.getCapabilities("video");
                        if (videoCaps) {
                            const h264Codecs = videoCaps.codecs.filter((codec) => {
                                const mime = codec.mimeType.toLowerCase();
                                return mime.includes("h264");
                            });
                            if (h264Codecs.length) {
                                transceiver.setCodecPreferences(h264Codecs);
                                console.log("H264 codec preferences set:", h264Codecs);
                            } else {
                                console.warn("H264 codecs not found in video capabilities.");
                            }
                        }
                    }
                });
                call.peerConnection.getSenders().forEach((sender) => {
                    if (sender.track?.kind === "video") {
                        adjustBitrate(sender, INITIAL_BITRATE);
                        const monitorIntervalId = setInterval(() => {
                            monitorAndAdjustBitrate(call, sender, {
                                updateCandidatePair: setCandidatePairConsumption,
                                updateOutboundRtp: setOutboundRtpConsumption,
                                updateTransportSent: setTransportSentConsumption,
                                updateTransportReceived: setTransportReceivedConsumption
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
                        <div className="text-sm text-gray-500">Candidate-Pair Consumption (consumo servidor): {candidatePairConsumption.toFixed(2)} MB</div>
                        <div className="text-sm text-gray-500">Outbound RTP Consumption (consumo cliente): {outboundRtpConsumption.toFixed(2)} MB</div>
                        <div className="text-sm text-gray-500">Transport Sent: {transportSentConsumption.toFixed(2)} MB</div>
                        <div className="text-sm text-gray-500">Transport Received: {transportReceivedConsumption.toFixed(2)} MB</div>
                        <div className="text-sm text-gray-500">Transmission Time: {formatTime(elapsedTime)}</div>
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
