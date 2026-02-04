import { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Camera, RefreshCw, Upload, Save } from 'lucide-react';
import { classes } from '../data/mockData';

export function StudentRegistration() {
    const { classId } = useParams();
    const currentClass = classes.find(c => c.id === classId);
    const webcamRef = useRef(null);
    const [imgSrc, setImgSrc] = useState(null);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setImgSrc(imageSrc);
    }, [webcamRef]);

    const [showSuccess, setShowSuccess] = useState(false);

    const handleRegister = (e) => {
        e.preventDefault();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-brand-900">
                        {currentClass ? `${currentClass.id} - New Student Registration` : 'New Student Registration'}
                    </h1>
                    <p className="text-brand-500">
                        {currentClass
                            ? `Register new students for ${currentClass.name}.`
                            : 'Register new students and capture face data for recognition.'}
                    </p>
                </div>
            </div>

            {showSuccess && (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200 flex items-center animate-fade-in shadow-sm">
                    <div className="bg-green-100 p-1 rounded-full mr-3">
                        <Save className="h-4 w-4" />
                    </div>
                    <p className="font-medium">
                        Student successfully registered {currentClass ? `to ${currentClass.name}` : ''}!
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                    <Card>
                        <Card.Header>
                            <Card.Title>Face Capture</Card.Title>
                        </Card.Header>
                        <Card.Content className="flex flex-col items-center gap-6">
                            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner ring-1 ring-brand-900/5">
                                {imgSrc ? (
                                    <img src={imgSrc} alt="Captured" className="w-full h-full object-cover" />
                                ) : (
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                {!imgSrc && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-48 h-64 border-2 border-white/50 rounded-full dashed opacity-50"></div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 w-full">
                                {imgSrc ? (
                                    <Button variant="secondary" onClick={retake} className="flex-1 gap-2">
                                        <RefreshCw className="h-4 w-4" /> Retake Photo
                                    </Button>
                                ) : (
                                    <Button onClick={capture} className="flex-1 gap-2">
                                        <Camera className="h-4 w-4" /> Capture Face Sample
                                    </Button>
                                )}
                            </div>
                        </Card.Content>
                    </Card>
                </div>

                <div className="lg:col-span-5">
                    <Card className="h-full">
                        <Card.Header>
                            <Card.Title>Student Details</Card.Title>
                        </Card.Header>
                        <Card.Content>
                            <form className="space-y-5" onSubmit={handleRegister}>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-brand-700">Full Name</label>
                                    <input required type="text" className="w-full h-10 px-3 rounded-lg border border-brand-300 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all" placeholder="e.g. John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-brand-700">Student ID</label>
                                    <input required type="text" className="w-full h-10 px-3 rounded-lg border border-brand-300 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all" placeholder="e.g. S-2023-001" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-brand-700">Department</label>
                                    <select className="w-full h-10 px-3 rounded-lg border border-brand-300 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all bg-white">
                                        <option>Computer Science</option>
                                        <option>Electrical Engineering</option>
                                        <option>Mechanical Engineering</option>
                                        <option>Mathematics</option>
                                    </select>
                                </div>

                                <div className="pt-6 border-t border-brand-100">
                                    <div className="flex items-center gap-3 mb-6 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                                        <Upload className="h-4 w-4" />
                                        <span>Images will be securely encrypted.</span>
                                    </div>
                                    <Button className="w-full gap-2" type="submit">
                                        <Save className="h-4 w-4" /> Register Student
                                    </Button>
                                </div>
                            </form>
                        </Card.Content>
                    </Card>
                </div>
            </div>
        </div>
    );
}
