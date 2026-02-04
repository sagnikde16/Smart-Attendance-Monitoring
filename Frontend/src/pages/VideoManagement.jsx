import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    UploadCloud,
    Video,
    Clock,
    FileVideo,
    MoreVertical,
    Loader2,
    CheckCircle,
    Scan,
    UserPlus,
    AlertCircle,
    Play,
    Save,
    User,
} from 'lucide-react';
import { videos as mockVideos, classes } from '../data/mockData';
import {
    uploadVideoForAttendance,
    registerStudents,
    getRegistrations,
    getVideoUrl,
} from '../api/attendance';

const STEPS = [
    { key: 'upload', label: 'Upload video', icon: UploadCloud },
    { key: 'detection', label: 'Face detection', icon: Scan },
    { key: 'registration', label: 'Face clustering', icon: UserPlus },
];

export function VideoManagement() {
    const { classId } = useParams();
    const [activeTab, setActiveTab] = useState('upload');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [currentStep, setCurrentStep] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [processedVideos, setProcessedVideos] = useState([]);
    const [studentInputs, setStudentInputs] = useState({});
    const [saveStatus, setSaveStatus] = useState(null);
    const fileInputRef = useRef(null);

    const currentClass = classes.find((c) => c.id === classId);
    const classVideos = [
        ...processedVideos,
        ...mockVideos.filter((v) => v.classId === classId),
    ];

    const handleFileSelect = (file) => {
        if (!file || !file.type.startsWith('video/')) {
            setError('Please select a video file (MP4, AVI, MKV, etc.)');
            return;
        }
        setError(null);
        setSelectedFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files?.[0]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleUpload = async () => {
        if (!selectedFile || !classId) return;

        setError(null);
        setResult(null);
        setStudentInputs({});
        setUploadStatus('uploading');
        setCurrentStep('upload');

        try {
            setCurrentStep('detection');
            setUploadStatus('processing');

            const data = await uploadVideoForAttendance(selectedFile, classId);

            setCurrentStep('registration');
            setResult(data);
            setUploadStatus('done');
            setProcessedVideos((prev) => [
                {
                    id: data.video_id || `v-${Date.now()}`,
                    video_id: data.video_id,
                    name: data.video_name || selectedFile.name,
                    status: 'Completed',
                    date: new Date().toISOString().slice(0, 10),
                    size: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
                    classId,
                    faces_detected: data.faces_detected ?? 0,
                    unique_faces: data.unique_faces_registered ?? (data.clusters?.length ?? 0),
                },
                ...prev,
            ]);
            setSelectedFile(null);

            const initial = {};
            (data.clusters || []).forEach((c) => {
                initial[c.cluster_id] = { name: '', roll_no: '' };
            });
            setStudentInputs(initial);
        } catch (err) {
            setUploadStatus('error');
            setError(err.message || 'Upload or processing failed');
        }
    };

    const handleStudentChange = (clusterId, field, value) => {
        setStudentInputs((prev) => ({
            ...prev,
            [clusterId]: { ...(prev[clusterId] || {}), [field]: value },
        }));
    };

    const handleSaveRegistration = async () => {
        if (!result?.video_id || !classId) return;

        setSaveStatus('saving');
        setError(null);
        try {
            const students = (result.clusters || []).map((c) => ({
                cluster_id: c.cluster_id,
                name: (studentInputs[c.cluster_id]?.name ?? '').trim(),
                roll_no: (studentInputs[c.cluster_id]?.roll_no ?? '').trim(),
            }));
            await registerStudents(classId, result.video_id, students);
            setSaveStatus('saved');
        } catch (err) {
            setError(err.message || 'Failed to save');
            setSaveStatus(null);
        }
    };

    const openFileDialog = () => fileInputRef.current?.click();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-brand-900">
                        {currentClass ? `${currentClass.id} - Video Management` : 'Video Management'}
                    </h1>
                    <p className="text-brand-500">
                        Upload a video. Faces are detected and clustered; then enter each student's name and roll no.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="lg:col-span-2">
                    <Card.Header className="border-b-0 pb-0">
                        <div className="flex space-x-6 border-b border-brand-200 w-full">
                            <button
                                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'upload'
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-brand-500 hover:text-brand-700'
                                }`}
                                onClick={() => setActiveTab('upload')}
                            >
                                Upload Video
                            </button>
                            <button
                                className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === 'live'
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-brand-500 hover:text-brand-700'
                                }`}
                                onClick={() => setActiveTab('live')}
                            >
                                Live Classroom
                            </button>
                        </div>
                    </Card.Header>
                    <Card.Content className="pt-8">
                        {activeTab === 'upload' ? (
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="video/mp4,video/avi,video/x-matroska,video/quicktime,video/webm"
                                    className="hidden"
                                    onChange={(e) =>
                                        handleFileSelect(e.target.files?.[0])
                                    }
                                />
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onClick={
                                        selectedFile ? undefined : openFileDialog
                                    }
                                    className={`border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                                        isDragging
                                            ? 'border-primary-500 bg-primary-50/50'
                                            : 'border-brand-300 hover:bg-brand-50/50 hover:border-primary-400'
                                    }`}
                                >
                                    {!uploadStatus || uploadStatus === 'error' ? (
                                        selectedFile ? (
                                            <div className="space-y-4">
                                                <div className="h-16 w-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto">
                                                    <FileVideo className="h-8 w-8" />
                                                </div>
                                                <p className="font-medium text-brand-900">
                                                    {selectedFile.name}
                                                </p>
                                                <p className="text-sm text-brand-500">
                                                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                                </p>
                                                <div className="flex gap-3">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedFile(null);
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUpload();
                                                        }}
                                                    >
                                                        Upload & Process
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="h-16 w-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                                                    <UploadCloud className="h-8 w-8" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-brand-900">
                                                    Click to upload or drag and drop
                                                </h3>
                                                <p className="text-brand-500 mt-2 max-w-sm text-sm">
                                                    MP4, AVI, MKV, MOV, WEBM. Face detection and clustering run after upload.
                                                </p>
                                            </>
                                        )
                                    ) : uploadStatus === 'uploading' ||
                                      uploadStatus === 'processing' ? (
                                        <div className="space-y-6">
                                            <Loader2 className="h-12 w-12 text-primary-600 animate-spin mx-auto" />
                                            <div>
                                                <p className="font-medium text-brand-900">
                                                    Processing video (notebook pipeline)
                                                </p>
                                                <div className="flex justify-center gap-4 mt-4">
                                                    {STEPS.map(({ key, label, icon: Icon }) => (
                                                        <div
                                                            key={key}
                                                            className={`flex flex-col items-center gap-1 ${
                                                                currentStep === key
                                                                    ? 'text-primary-600'
                                                                    : 'text-brand-400'
                                                            }`}
                                                        >
                                                            <Icon
                                                                className={`h-5 w-5 ${
                                                                    currentStep === key ? 'animate-pulse' : ''
                                                                }`}
                                                            />
                                                            <span className="text-xs">{label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : uploadStatus === 'done' && result ? (
                                        <div className="space-y-4 w-full max-w-2xl mx-auto text-left">
                                            <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle className="h-5 w-5" />
                                                <span className="font-medium">
                                                    Processing complete
                                                </span>
                                            </div>
                                            <p className="text-sm text-brand-600">
                                                Faces detected: <strong>{result.faces_detected}</strong> → Showing <strong>{result.clusters?.length ?? 0}</strong> face(s) below. Enter name and roll no for each, then save.
                                            </p>
                                            <p className="text-xs font-medium text-brand-700">Detected faces (enter name & roll no for each)</p>
                                            <div className="border border-brand-200 rounded-lg divide-y divide-brand-100 max-h-[28rem] overflow-y-auto bg-brand-50/30">
                                                {(result.clusters || []).map((c) => (
                                                    <div
                                                        key={c.cluster_id}
                                                        className="p-4 flex items-center gap-4 bg-white"
                                                    >
                                                        <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-brand-100 border border-brand-200">
                                                            {c.face_base64 ? (
                                                                <img
                                                                    src={`data:image/jpeg;base64,${c.face_base64}`}
                                                                    alt={`Person ${c.cluster_id}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-brand-400">
                                                                    <User className="h-6 w-6" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
                                                            <div>
                                                                <label className="text-xs font-medium text-brand-600 block mb-1">
                                                                    Name
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        studentInputs[c.cluster_id]?.name ?? ''
                                                                    }
                                                                    onChange={(e) =>
                                                                        handleStudentChange(
                                                                            c.cluster_id,
                                                                            'name',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    placeholder="Student name"
                                                                    className="w-full h-9 px-3 rounded-lg border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-medium text-brand-600 block mb-1">
                                                                    Roll No
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        studentInputs[c.cluster_id]?.roll_no ?? ''
                                                                    }
                                                                    onChange={(e) =>
                                                                        handleStudentChange(
                                                                            c.cluster_id,
                                                                            'roll_no',
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    placeholder="Roll number"
                                                                    className="w-full h-9 px-3 rounded-lg border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
                                                                />
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-brand-500 flex-shrink-0">
                                                            {c.count} detections
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-3">
                                                <Button
                                                    type="button"
                                                    onClick={handleSaveRegistration}
                                                    disabled={saveStatus === 'saving'}
                                                    className="gap-2"
                                                >
                                                    {saveStatus === 'saving' ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                                                        </>
                                                    ) : saveStatus === 'saved' ? (
                                                        <>
                                                            <CheckCircle className="h-4 w-4" /> Saved
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="h-4 w-4" /> Save registration
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setUploadStatus(null);
                                                        setResult(null);
                                                        setCurrentStep(null);
                                                        setSaveStatus(null);
                                                    }}
                                                >
                                                    Upload another
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                {error && (
                                    <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center bg-brand-900 rounded-xl text-white relative overflow-hidden group">
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-brand-900 to-brand-900" />
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="h-20 w-20 mb-6 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                        <Video className="h-10 w-10 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">Connect to Classroom Feed</h3>
                                    <p className="text-brand-300 mb-8 max-w-md">
                                        Start real-time attendance tracking using the classroom's installed IP camera system.
                                    </p>
                                    <Button
                                        variant="primary"
                                        className="gap-2 bg-red-600 hover:bg-red-700 focus:ring-red-500 border-none px-8 py-3 h-auto text-base shadow-lg shadow-red-900/20"
                                    >
                                        <span className="relative flex h-3 w-3 mr-1">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                        </span>
                                        Start Recording
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card.Content>
                </Card>

                <Card className="lg:col-span-2">
                    <Card.Header>
                        <Card.Title>Recent Uploads</Card.Title>
                    </Card.Header>
                    <Card.Content className="p-0">
                        <div className="divide-y divide-brand-100">
                            {classVideos.map((video) => (
                                <div
                                    key={video.id}
                                    className="p-4 sm:px-6 flex items-center justify-between hover:bg-brand-50 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600">
                                            <FileVideo className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-brand-900">{video.name}</p>
                                            <div className="flex items-center gap-3 text-xs text-brand-500 mt-1 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> {video.date}
                                                </span>
                                                <span>{video.size}</span>
                                                {video.faces_detected != null && (
                                                    <span className="text-primary-600">
                                                        {video.faces_detected} faces → {video.unique_faces ?? 0} persons
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {video.video_id && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="gap-1.5"
                                                onClick={() =>
                                                    window.open(
                                                        getVideoUrl(video.video_id),
                                                        '_blank'
                                                    )
                                                }
                                            >
                                                <Play className="h-4 w-4" /> Open
                                            </Button>
                                        )}
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                video.status === 'Completed'
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : video.status === 'Processing'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-red-50 text-red-700 border-red-200'
                                            }`}
                                        >
                                            {video.status}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="hidden sm:flex text-brand-400 hover:text-brand-600"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card.Content>
                </Card>
            </div>
        </div>
    );
}
