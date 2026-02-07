import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AddClassModal } from '../components/AddClassModal';
import { Navbar } from '../components/Layout/Navbar';
// import { classes } from '../data/mockData';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Users, Clock, Plus, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ClassSelection() {
    const navigate = useNavigate();
    const { isTeacher, isStudent, user } = useAuth();

    const [classList, setClassList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            // If student, maybe show all or enrolled? For now show all or mock.
            // If teacher, show ONLY their classes.
            if (!user) {
                setClassList([]);
                return;
            }

            let url = 'http://localhost:8000/api/classes';
            if (isTeacher() && user?.teacherId) {
                url += `?teacherId=${user.teacherId}`;
            } else if (isStudent() && user?.rollNo) {
                url += `?studentId=${user.rollNo}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setClassList(data);
            }
        } catch (error) {
            console.error("Failed to fetch classes:", error);
        }
    };

    const handleAddClass = async (classData) => {
        const response = await fetch('http://localhost:8000/api/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...classData, teacherId: user.teacherId }),
        });

        if (!response.ok) {
            throw new Error('Failed to add class');
        }

        const newClass = await response.json();
        setClassList(prev => [...prev, newClass]);
    };

    const handleClassClick = (classId) => {
        // Navigate to dashboard for everyone
        navigate(`/class/${classId}/dashboard`);
    };

    return (
        <div className="min-h-screen bg-brand-50">
            <Navbar />
            <div className="p-6 lg:p-12">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-brand-900">My Subjects</h1>
                            <p className="text-brand-500 mt-2">
                                {isTeacher()
                                    ? 'Select a subject to manage recordings and attendance.'
                                    : 'Select a subject to view your attendance and dashboard.'
                                }
                            </p>
                        </div>
                        {isTeacher() && (
                            <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
                                <Plus className="h-4 w-4" /> Add New Subject
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classList.map((cls) => (
                            <Card
                                key={cls.id}
                                className="group hover:border-primary-200 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                                onClick={() => handleClassClick(cls.id)}
                            >
                                <div className="h-32 bg-brand-900 relative">
                                    <img
                                        src={cls.image}
                                        alt={cls.name}
                                        className="w-full h-full object-cover opacity-50 text-white"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 to-transparent" />
                                    <div className="absolute bottom-4 left-6">
                                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white backdrop-blur-sm border border-white/20 mb-2">
                                            {cls.id}
                                        </span>
                                        <h3 className="text-xl font-bold text-white truncate pr-4">{cls.name.split(':')[0]}</h3>
                                    </div>
                                </div>
                                <Card.Content className="pt-6">
                                    <h4 className="font-semibold text-brand-900 mb-4">{cls.name.split(':')[1] || cls.name}</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center text-sm text-brand-500">
                                            <Users className="h-4 w-4 mr-3" />
                                            {cls.students} Students Enrolled
                                        </div>
                                        <div className="flex items-center text-sm text-brand-500">
                                            <Clock className="h-4 w-4 mr-3" />
                                            {cls.time}
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-center text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                                        View Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                                    </div>
                                </Card.Content>
                            </Card>
                        ))}
                    </div>
                </div>

            </div>
            <AddClassModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddClass}
            />
        </div>
    );
}
