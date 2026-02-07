import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from './Button';
import { Video, StopCircle, RotateCcw, Check, Camera } from 'lucide-react';

export function VideoRecorder({ onRecordingComplete }) {
    const mediaRecorderRef = useRef(null);
    const videoRef = useRef(null);
    const chunksRef = useRef([]); // Store chunks in ref to avoid closure staleness

    const [isRecording, setIsRecording] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, isStreamActive]);

    const startCamera = async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setStream(mediaStream);
            setIsStreamActive(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access camera. Please ensure permissions are granted.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsStreamActive(false);
    };

    const startRecording = useCallback(() => {
        chunksRef.current = []; // Reset chunks
        setPreviewUrl(null);
        setError(null);

        if (!stream) {
            setError("No camera stream available.");
            return;
        }

        try {
            // Try to find a supported mime type
            const mimeTypes = [
                'video/webm;codecs=vp9',
                'video/webm',
                'video/mp4'
            ];

            let options = undefined;
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    options = { mimeType: type };
                    break;
                }
            }

            const mediaRecorder = new MediaRecorder(stream, options);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error("MediaRecorder Error:", event);
                setError("Recording error occurred.");
            };

            // Set onstop handler immediately
            mediaRecorder.onstop = () => {
                try {
                    const mimeType = mediaRecorder.mimeType || 'video/webm';
                    if (chunksRef.current.length === 0) {
                        setError("No video data recorded.");
                        return;
                    }

                    const blob = new Blob(chunksRef.current, { type: mimeType });
                    const url = URL.createObjectURL(blob);
                    setPreviewUrl(url);

                    // Determine extension
                    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                    const file = new File([blob], `recorded-video.${ext}`, { type: mimeType });

                    onRecordingComplete(file);
                    stopCamera();
                } catch (err) {
                    console.error("Error saving video:", err);
                    setError("Failed to save recording.");
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            mediaRecorderRef.current = mediaRecorder;
            console.log("Recording started with mimeType:", mediaRecorder.mimeType);

        } catch (err) {
            console.error("Failed to start MediaRecorder:", err);
            setError(`Failed to start recording: ${err.message}`);
        }
    }, [stream, onRecordingComplete]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, []);

    const handleRetake = () => {
        setPreviewUrl(null);
        chunksRef.current = [];
        startCamera();
    };

    return (
        <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                {!isStreamActive && !previewUrl ? (
                    <div className="text-center">
                        <Button onClick={startCamera} variant="secondary">
                            <Camera className="mr-2 h-4 w-4" />
                            Enable Camera
                        </Button>
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                ) : (
                    <>
                        {previewUrl ? (
                            <div className="w-full h-full">
                                <video src={previewUrl} controls className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover transform scale-x-[-1]"
                            />
                        )}

                        {isRecording && (
                            <div className="absolute top-4 right-4 animate-pulse">
                                <div className="h-4 w-4 rounded-full bg-red-600 border-2 border-white shadow-lg"></div>
                            </div>
                        )}

                        {error && (
                            <div className="absolute top-4 left-4 right-4 bg-red-500/80 text-white p-2 rounded text-sm text-center">
                                {error}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="flex justify-center gap-4">
                {isStreamActive && !isRecording && !previewUrl && (
                    <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700 text-white">
                        <Video className="mr-2 h-4 w-4" />
                        Start Recording
                    </Button>
                )}

                {isRecording && (
                    <Button onClick={stopRecording} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                        <StopCircle className="mr-2 h-4 w-4" />
                        Stop Recording
                    </Button>
                )}

                {previewUrl && (
                    <Button onClick={handleRetake} variant="outline">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Retake
                    </Button>
                )}
            </div>

            {previewUrl && (
                <p className="text-center text-sm text-green-600 font-medium flex items-center justify-center gap-2">
                    <Check className="h-4 w-4" />
                    Video ready for upload
                </p>
            )}
        </div>
    );
}
