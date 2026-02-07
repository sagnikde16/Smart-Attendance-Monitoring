import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download, Filter, Search, Check, X, User, Loader2 } from 'lucide-react';
import { classes } from '../data/mockData';

export function AttendanceReports() {
    const { classId } = useParams();
    // In real app, fetch class details from backend
    const currentClass = classes.find(c => c.id === classId) || { id: classId, name: 'Class' };

    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchAttendance();
    }, [classId]);

    const fetchAttendance = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/attendance/${classId}`);
            if (response.ok) {
                const data = await response.json();
                processAttendanceData(data);
            }
        } catch (error) {
            console.error("Failed to fetch attendance:", error);
        } finally {
            setLoading(false);
        }
    };

    const processAttendanceData = (data) => {
        // Flatten the sessions data into student records
        // For this view, we might want to show "List of Sessions" or "Student Stats"
        // Let's show a list of recent attendance events

        const flatList = [];
        data.forEach(session => {
            const date = new Date(session.date).toLocaleDateString() + ' ' + new Date(session.date).toLocaleTimeString();
            session.present_students.forEach(student => {
                flatList.push({
                    id: `${session.id}_${student.id}`,
                    date: date,
                    studentName: student.name,
                    studentId: student.roll_no,
                    status: 'Present',
                    confidence: 90, // Mock, or avg from session logs if we had them
                    evidence: student.face_base64 ? `data:image/jpeg;base64,${student.face_base64}` : null
                });
            });
        });

        // Sort by date desc
        flatList.sort((a, b) => new Date(b.date) - new Date(a.date));
        setStats(flatList);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await fetch(`http://localhost:5000/api/attendance/export/${classId}`);
            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Attendance_${classId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Export error:", error);
            alert("Failed to export attendance");
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-gray-500">Loading attendance data...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-900">
                        {currentClass.name} - Attendance Reports
                    </h1>
                    <p className="text-brand-500">View and export detailed attendance records.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" className="gap-2">
                        <Filter className="h-4 w-4" /> Filter
                    </Button>
                    <Button className="gap-2" onClick={handleExport} disabled={exporting}>
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Export Excel
                    </Button>
                </div>
            </div>

            <Card>
                <div className="p-4 border-b border-brand-100 bg-brand-50/50">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400" />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            className="w-full h-10 pl-10 pr-4 rounded-lg border border-brand-300 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-shadow"
                        />
                    </div>
                </div>
                {stats.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        No attendance records found for this class.
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-brand-50 text-brand-600 font-medium border-b border-brand-200 sticky top-0">
                                <tr>
                                    <th className="px-6 py-4 whitespace-nowrap">Date & Time</th>
                                    <th className="px-6 py-4 whitespace-nowrap">Student</th>
                                    <th className="px-6 py-4 whitespace-nowrap">Status</th>
                                    <th className="px-6 py-4 whitespace-nowrap">Visual Evidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-100">
                                {stats.map((record, idx) => (
                                    <tr key={idx} className="hover:bg-brand-50/50 transition-colors">
                                        <td className="px-6 py-4 text-brand-600 whitespace-nowrap">
                                            {record.date}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-brand-200 flex items-center justify-center text-brand-600 border border-brand-300">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-brand-900">{record.studentName}</p>
                                                    <p className="text-xs text-brand-500">{record.studentId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200">
                                                <Check className="h-3 w-3" />
                                                Present
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.evidence ? (
                                                <div className="h-10 w-10 rounded-full overflow-hidden border border-brand-200">
                                                    <img src={record.evidence} alt="Evidence" className="h-full w-full object-cover" />
                                                </div>
                                            ) : (
                                                <span className="text-xs text-brand-400 italic">No capture</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
