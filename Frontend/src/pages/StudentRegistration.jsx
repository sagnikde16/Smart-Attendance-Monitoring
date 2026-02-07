import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Upload, Save, User, Video, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { classes } from '../data/mockData';

export function StudentRegistration() {
    const { classId } = useParams();
    // In a real app, fetch class details from backend
    const currentClass = classes.find(c => c.id === classId) || { id: classId, name: 'Class' };

    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    // Registration form state
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [studentData, setStudentData] = useState({ name: '', roll_no: '' });
    const [registering, setRegistering] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setResults(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setProcessing(true);
        setError(null);

        const formData = new FormData();
        formData.append('video', file);

        try {
            const response = await fetch('http://localhost:5000/api/process-register-video', {
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

    const handleClusterClick = (cluster) => {
        setSelectedCluster(cluster);
        setRegisterSuccess(null);
        setStudentData({ name: '', roll_no: '' });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!selectedCluster) return;

        setRegistering(true);
        try {
            const payload = {
                name: studentData.name,
                roll_no: studentData.roll_no,
                classId: classId,
                embedding: selectedCluster.embedding, // Use the centroid
                face_base64: selectedCluster.face_base64
            };

            const response = await fetch('http://localhost:5000/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to save student');
            }

            setRegisterSuccess(`Registered ${studentData.name} successfully!`);
            // Optionally remove the cluster from the list or mark as done
            // For now, just clear selection
            setTimeout(() => {
                setSelectedCluster(null);
                setStudentData({ name: '', roll_no: '' });
            }, 1500);

        } catch (err) {
            setError(err.message);
        } finally {
            setRegistering(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-brand-900">Student Registration</h1>
                    <p className="text-brand-500 mt-1">
                        Register students for <span className="font-semibold text-brand-700">{currentClass.name}</span> ({currentClass.id})
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Upload & Instructions */}
                <div className="lg:col-span-5 space-y-6">
                    <Card>
                        <Card.Header>
                            <Card.Title className="flex items-center gap-2">
                                <Video className="h-5 w-5 text-brand-600" />
                                1. Upload Video
                            </Card.Title>
                        </Card.Header>
                        <Card.Content className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Upload a short video (10-30s) containing the student's face.
                                The system will detect and cluster faces automatically.
                            </p>

                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
                                <input
                                    type="file"
                                    id="video-upload"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
                                    <Upload className="h-10 w-10 text-brand-400 mb-3" />
                                    <span className="text-sm font-medium text-brand-700">
                                        {file ? file.name : "Click to select video"}
                                    </span>
                                    <span className="text-xs text-gray-500 mt-1">MP4, MOV, AVI supported</span>
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
                                    'Process Video'
                                )}
                            </Button>
                        </Card.Content>
                    </Card>

                    {/* Registration Form (Only visible when cluster selected) */}
                    {selectedCluster && (
                        <Card className="animate-in fade-in slide-in-from-top-4 duration-300 border-brand-200 shadow-md">
                            <Card.Header className="bg-brand-50/50">
                                <Card.Title className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-brand-600" />
                                    3. Label Student
                                </Card.Title>
                            </Card.Header>
                            <Card.Content>
                                {registerSuccess ? (
                                    <div className="flex flex-col items-center justify-center p-6 text-green-600">
                                        <CheckCircle className="h-12 w-12 mb-2" />
                                        <p className="font-medium">{registerSuccess}</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleRegister} className="space-y-4">
                                        <div className="flex justify-center mb-4">
                                            <div className="relative">
                                                <img
                                                    src={`data:image/jpeg;base64,${selectedCluster.face_base64}`}
                                                    alt="Selected Face"
                                                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                                                />
                                                <div className="absolute bottom-0 right-0 bg-brand-600 text-white text-xs px-2 py-0.5 rounded-full">
                                                    #{selectedCluster.cluster_id}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={studentData.name}
                                                onChange={e => setStudentData({ ...studentData, name: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                                placeholder="e.g. Jane Doe"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                                            <input
                                                type="text"
                                                required
                                                value={studentData.roll_no}
                                                onChange={e => setStudentData({ ...studentData, roll_no: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                                placeholder="e.g. CS-2023-101"
                                            />
                                        </div>

                                        <div className="pt-2 flex gap-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => setSelectedCluster(null)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                className="flex-1"
                                                disabled={registering}
                                            >
                                                {registering ? 'Saving...' : 'Register'}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </Card.Content>
                        </Card>
                    )}
                </div>

                {/* Right Column: Results Grid */}
                <div className="lg:col-span-7">
                    <Card className="h-full">
                        <Card.Header>
                            <Card.Title className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-brand-600" />
                                    2. Detected Faces
                                </div>
                                {results && (
                                    <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                        {results.unique_faces_registered} clusters found
                                    </span>
                                )}
                            </Card.Title>
                        </Card.Header>
                        <Card.Content>
                            {!results ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                                        <User className="h-12 w-12 text-gray-300" />
                                    </div>
                                    <p>Upload and process a video to see detected faces here.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {results.clusters.map((cluster) => (
                                        <div
                                            key={cluster.cluster_id}
                                            onClick={() => handleClusterClick(cluster)}
                                            className={`
                                                cursor-pointer group relative rounded-xl overflow-hidden aspect-square border-2 transition-all
                                                ${selectedCluster?.cluster_id === cluster.cluster_id
                                                    ? 'border-brand-500 ring-4 ring-brand-100 scale-95'
                                                    : 'border-transparent hover:border-brand-300 hover:shadow-lg'
                                                }
                                            `}
                                        >
                                            <img
                                                src={`data:image/jpeg;base64,${cluster.face_base64}`}
                                                alt={`Cluster ${cluster.cluster_id}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                <p className="text-white text-xs font-medium">
                                                    Cluster {cluster.cluster_id}
                                                    <span className="block opacity-75">{cluster.count} samples</span>
                                                </p>
                                            </div>
                                            {selectedCluster?.cluster_id === cluster.cluster_id && (
                                                <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                                                    <CheckCircle className="h-8 w-8 text-white drop-shadow-md" />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {results.clusters.length === 0 && (
                                        <div className="col-span-full text-center py-8 text-gray-500">
                                            No clear faces detected. Try a better video.
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card.Content>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default StudentRegistration;
