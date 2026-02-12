import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Users, BookOpen, AlertCircle, CheckCircle, Video, UserPlus, FileText, Calendar, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export function Dashboard() {
    const { classId } = useParams();
    const { user, isTeacher, isStudent } = useAuth();
    const navigate = useNavigate();

    const [classDetails, setClassDetails] = useState(null);
    const [attendanceStats, setAttendanceStats] = useState({ total_sessions: 0, my_present: 0, total_students: 0 });
    const [recentHistory, setRecentHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [classId]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Class Details
            // We need to fetch all classes and find ours because we don't have a single class endpoint yet
            // Or we can just use the /api/classes logic.
            let classesUrl = `${API_URL}/api/classes`;
            if (isTeacher() && user?.teacherId) {
                classesUrl += `?teacherId=${user.teacherId}`;
            } else if (isStudent() && user?.rollNo) {
                classesUrl += `?studentId=${user.rollNo}`;
            }

            const classRes = await fetch(classesUrl);
            if (classRes.ok) {
                const classes = await classRes.json();
                const cls = classes.find(c => c.id === classId);
                setClassDetails(cls);
            }

            // 2. Fetch Attendance for Stats
            let attUrl = `${API_URL}/api/attendance/${classId}`;
            if (isStudent() && user?.rollNo) {
                attUrl += `?studentId=${user.rollNo}`;
            }

            const attRes = await fetch(attUrl);
            if (attRes.ok) {
                const records = await attRes.json();

                if (isStudent()) {
                    // For student: API returns list of sessions where we can check "Present" status
                    // Actually, my modified API for students returns [ { ...session, present_students: [me if present] } ]
                    // records.length is total sessions? No, backend filters?
                    // Wait, my backend implementation for `studentId`:
                    // It returns ALL class sessions, but filters `present_students` list to only contain the student if present.
                    // So `records.length` = Total Sessions in that class.
                    // `present_students.length > 0` = I was present.

                    const totalSessions = records.length;
                    const presentSessions = records.filter(r => r.present_students && r.present_students.length > 0).length;

                    setAttendanceStats({
                        total_sessions: totalSessions,
                        my_present: presentSessions,
                        percentage: totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0
                    });

                    // Recent History
                    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
                    setRecentHistory(sorted.slice(0, 5));
                } else {
                    // For Teacher
                    // records.length = Total Sessions
                    // We can calculate avg attendance?
                    const totalSessions = records.length;
                    let totalPresentCount = 0;
                    records.forEach(r => {
                        totalPresentCount += (r.present_students?.length || 0);
                    });

                    // We need total students from classDetails (which might be 0 if not updated)
                    // Let's assume classDetails will be updated later or we just show raw counts

                    setAttendanceStats({
                        total_sessions: totalSessions,
                        avg_present: totalSessions > 0 ? Math.round(totalPresentCount / totalSessions) : 0
                    });

                    // Recent Activity = Last few sessions
                    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
                    setRecentHistory(sorted.slice(0, 5));
                }
            }

        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
    }

    if (!classDetails) {
        return (
            <div className="p-8 text-center text-red-500">
                <h2 className="text-xl font-bold">Access Denied or Subject Not Found</h2>
                <p className="mt-2 text-sm text-gray-600">
                    Failed to load class details for ID: <strong>{classId}</strong>.
                </p>
                <p className="text-xs text-gray-400 mt-4">
                    Debug Info: API_URL directly from env: {API_URL} <br />
                    User Role: {isTeacher() ? 'Teacher' : isStudent() ? 'Student' : 'Unknown'}
                </p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
                    Go Home
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-brand-900">
                        {classDetails.name.split(':')[1] || classDetails.name} <span className="text-brand-400 font-normal">({classDetails.id})</span>
                    </h1>
                    <p className="text-brand-500 mt-1">
                        {classDetails.time} • {isTeacher() ? 'Teacher Dashboard' : 'Student Dashboard'}
                    </p>
                </div>
            </div>

            {/* Teacher View */}
            {isTeacher() && (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-6 border-l-4 border-l-blue-500">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Enrolled Students</p>
                                    <p className="text-2xl font-bold text-gray-900">{classDetails.students || 0}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-6 border-l-4 border-l-purple-500">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                                    <p className="text-2xl font-bold text-gray-900">{attendanceStats.total_sessions}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-6 border-l-4 border-l-green-500">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-green-100 text-green-600">
                                    <CheckCircle className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Avg. Attendance</p>
                                    <p className="text-2xl font-bold text-gray-900">{attendanceStats.avg_present}</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-xl font-semibold text-brand-900 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Button
                                variant="outline"
                                className="h-auto py-6 flex flex-col items-center gap-3 hover:border-brand-500 hover:bg-brand-50"
                                onClick={() => navigate(`/class/${classId}/upload`)}
                            >
                                <Video className="h-8 w-8 text-brand-600" />
                                <span className="font-semibold">Take Attendance</span>
                                <span className="text-xs text-gray-500 font-normal">Upload video to process</span>
                            </Button>

                            <Button
                                variant="outline"
                                className="h-auto py-6 flex flex-col items-center gap-3 hover:border-brand-500 hover:bg-brand-50"
                                onClick={() => navigate(`/class/${classId}/registration`)}
                            >
                                <UserPlus className="h-8 w-8 text-brand-600" />
                                <span className="font-semibold">Register Students</span>
                                <span className="text-xs text-gray-500 font-normal">Add new students to class</span>
                            </Button>

                            <Button
                                variant="outline"
                                className="h-auto py-6 flex flex-col items-center gap-3 hover:border-brand-500 hover:bg-brand-50"
                                onClick={() => navigate(`/class/${classId}/reports`)}
                            >
                                <FileText className="h-8 w-8 text-brand-600" />
                                <span className="font-semibold">View Reports</span>
                                <span className="text-xs text-gray-500 font-normal">Check detailed logs</span>
                            </Button>
                        </div>
                    </div>

                    {/* Subject History Table */}
                    <div className="pt-4">
                        <h2 className="text-xl font-semibold text-brand-900 mb-4">Subject History</h2>
                        <Card>
                            <Card.Content className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Time</th>
                                                <th className="px-6 py-4">Present Students</th>
                                                <th className="px-6 py-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {recentHistory.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                                                        No sessions recorded yet.
                                                    </td>
                                                </tr>
                                            ) : (
                                                recentHistory.map((session, index) => (
                                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            {new Date(session.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500">
                                                            {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                {session.present_students?.length || 0} Students
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                Completed
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card.Content>
                        </Card>
                    </div>
                </>
            )}

            {/* Student View */}
            {isStudent() && (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Attendance Card */}
                        <Card className="p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-400 to-brand-600"></div>
                            <div className="h-24 w-24 rounded-full border-8 border-brand-100 flex items-center justify-center mb-4">
                                <span className="text-3xl font-bold text-brand-700">{attendanceStats.percentage}%</span>
                            </div>
                            <h3 className="text-xl font-bold text-brand-900">Attendance Rate</h3>
                            <p className="text-gray-500 mt-2">
                                You have attended <span className="font-bold text-brand-700">{attendanceStats.my_present}</span> out of <span className="font-bold text-gray-700">{attendanceStats.total_sessions}</span> sessions.
                            </p>
                        </Card>

                        {/* Recent History */}
                        <Card className="flex flex-col">
                            <Card.Header>
                                <Card.Title className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-gray-500" />
                                    Recent Sessions
                                </Card.Title>
                            </Card.Header>
                            <Card.Content className="flex-1">
                                {recentHistory.length === 0 ? (
                                    <p className="text-gray-400 text-center py-8">No sessions recorded yet.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {recentHistory.map((session) => {
                                            const isPresent = session.present_students && session.present_students.length > 0;
                                            return (
                                                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-2 w-2 rounded-full ${isPresent ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        <span className="font-medium text-gray-700">
                                                            {new Date(session.date).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    {isPresent ? (
                                                        <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">Present</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded">Absent</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="mt-6">
                                    <Button
                                        variant="ghost"
                                        className="w-full text-brand-600 hover:text-brand-800"
                                        onClick={() => navigate(`/class/${classId}/reports`)}
                                    >
                                        View Full Attendance History <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </div>
                            </Card.Content>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
