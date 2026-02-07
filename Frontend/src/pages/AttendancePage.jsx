import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Upload, CheckCircle, AlertCircle, Loader2, UserCheck, Video } from 'lucide-react';
import { classes } from '../data/mockData';
import { VideoRecorder } from '../components/ui/VideoRecorder';

export function AttendancePage() {
    const { classId } = useParams();
    const currentClass = classes.find(c => c.id === classId) || { id: classId, name: 'Class' };

    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [saved, setSaved] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setResults(null);
            setSaved(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setProcessing(true);
        setError(null);
        setSaved(false);

        const formData = new FormData();
        formData.append('video', file);
        formData.append('classId', classId);

        try {
            const response = await fetch('http://localhost:5000/api/process-attendance-video', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to process video');
            }

            const data = await response.json();
            setResults(data);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleSaveAttendance = async () => {
        if (!results) return;

        try {
            const payload = {
                classId: classId,
                date: new Date().toISOString(),
                present_students: results.present_students, // Save full objects (Snapshot)
                video_processed: true
            };

            const response = await fetch('http://localhost:5000/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to save attendance');
            }

            setSaved(true);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-brand-900">Take Attendance</h1>
                    <p className="text-brand-500 mt-1">
                        Process class video for <span className="font-semibold text-brand-700">{currentClass.name}</span>
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {saved && (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <p>Attendance record saved successfully!</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Upload */}
                <div className="lg:col-span-4 space-y-6">
                    <Card>
                        <Card.Header>
                            <Card.Title className="flex items-center gap-2">
                                <Video className="h-5 w-5 text-brand-600" />
                                Class Video
                            </Card.Title>
                        </Card.Header>
                        <Card.Content className="space-y-4">
                            <div className="flex border-b border-gray-200 mb-4">
                                <button className={`flex-1 py-2 text-sm font-medium ${!file ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setFile(null)}>
                                    Upload File
                                </button>
                                <button className={`flex-1 py-2 text-sm font-medium ${!file ? 'text-gray-500' : 'text-brand-600 border-b-2 border-brand-600'}`}>
                                    Webcam
                                </button>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    Upload or record a video of the class. Ensure students' faces are visible.
                                </p>

                                <VideoRecorder onRecordingComplete={(recordedFile) => setFile(recordedFile)} />

                                <div className="relative flex items-center justify-center">
                                    <div className="border-t w-full border-gray-200 absolute"></div>
                                    <span className="bg-white px-2 text-xs text-gray-400 z-10">OR UPLOAD</span>
                                </div>

                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                                    <input
                                        type="file"
                                        id="video-upload"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
                                        <Upload className="h-8 w-8 text-brand-400 mb-2" />
                                        <span className="text-sm font-medium text-brand-700">
                                            {file && !file.type.startsWith('video/webm') ? file.name : "Select Video File"}
                                        </span>
                                    </label>
                                </div>

                                <Button
                                    onClick={handleUpload}
                                    disabled={!file || processing}
                                    className="w-full"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Identify Students'
                                    )}
                                </Button>
                            </div>
                        </Card.Content>
                    </Card>

                    {results && (
                        <Card className="animate-in fade-in slide-in-from-top-4 duration-500 bg-brand-50 border-brand-200">
                            <Card.Content className="text-center py-6">
                                <p className="text-brand-900 font-medium mb-1">Processing Complete</p>
                                <p className="text-3xl font-bold text-brand-600">{results.present_students?.length || 0}</p>
                                <p className="text-sm text-brand-500">Students Identified</p>
                            </Card.Content>
                        </Card>
                    )}
                </div>

                {/* Right Column: Results */}
                <div className="lg:col-span-8">
                    <Card className="h-full">
                        <Card.Header className="flex flex-row items-center justify-between">
                            <Card.Title className="flex items-center gap-2">
                                <UserCheck className="h-5 w-5 text-brand-600" />
                                Attendance List
                            </Card.Title>
                            {results && results.present_students?.length > 0 && !saved && (
                                <Button size="sm" onClick={handleSaveAttendance}>
                                    Save Record
                                </Button>
                            )}
                        </Card.Header>
                        <Card.Content>
                            {!results ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                                        <UserCheck className="h-12 w-12 text-gray-300" />
                                    </div>
                                    <p>Ready to process. Upload a video to start.</p>
                                </div>
                            ) : results.present_students?.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <p>No known students identified in this video.</p>
                                    <p className="text-sm mt-2">Ensure students are registered and faces are clearly visible.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {results.present_students.map((student) => (
                                            <div key={student.id} className="flex items-center p-3 border rounded-lg hover:shadow-sm transition-shadow bg-white">
                                                <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold mr-3 overflow-hidden">
                                                    {student.face_base64 ? (
                                                        <img src={`data:image/jpeg;base64,${student.face_base64}`} alt={student.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        student.name.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{student.name}</p>
                                                    <p className="text-xs text-brand-500">{student.roll_no}</p>
                                                </div>
                                                <div className="ml-auto">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        Present
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 pt-4 border-t text-right text-xs text-gray-400">
                                        Total Faces Processed: {results.total_faces_processed}
                                    </div>
                                </div>
                            )}
                        </Card.Content>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default AttendancePage;
