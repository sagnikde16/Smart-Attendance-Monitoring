import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download, Filter, Search, Check, X, User, Loader2 } from 'lucide-react';
import { classes } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export function AttendanceReports() {
    const { classId } = useParams();
    const { user, isStudent } = useAuth();
    // In real app, fetch class details from backend
    const currentClass = classes.find(c => c.id === classId) || { id: classId, name: 'Class' };

    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // Default to today
    const [allStudents, setAllStudents] = useState([]);

    useEffect(() => {
        fetchData();
    }, [classId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch students first
            const studentsRes = await fetch('http://localhost:8000/api/students');
            let students = [];
            if (studentsRes.ok) {
                const all = await studentsRes.json();
                students = all.filter(s => s.classId === classId);
                setAllStudents(students);
            }

            // Fetch attendance
            let url = `http://localhost:8000/api/attendance/${classId}`;
            if (isStudent() && user?.rollNo) {
                url += `?studentId=${user.rollNo}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                processAttendanceData(data, students);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const processAttendanceData = (attendanceData, students) => {
        const flatList = [];

        if (isStudent()) {
            // Student logic remains mostly same (viewing own history)
            // But if we want to show "Absent" days where NO record exists, that's complex
            // For now, let's keep student view as is (shows sessions they participated in OR teacher marked)
            // Actually, backend filters for studentId, so it returns sessions relevant to them.
            // If we want to show sessions they MISSED, we need all class sessions. 
            // The current backend `get_class_attendance` with `studentId` param is a bit ambiguous.
            // Let's assume for student view we just show what backend returns for now.
            attendanceData.forEach(session => {
                const sessionDate = new Date(session.date).toISOString().slice(0, 10);
                const date = new Date(session.date).toLocaleDateString() + ' ' + new Date(session.date).toLocaleTimeString();

                // For student view, backend might have filtered present_students. 
                // We check if "present_students" contains this student.
                // Re-reading backend: if studentId is passed, it returns all class records but filters present_students list.
                // So if present_students is empty, it means absent (or just not in that list).

                const isPresent = session.present_students && session.present_students.length > 0;
                const studentRecord = isPresent ? session.present_students[0] : null;

                flatList.push({
                    id: session.id,
                    rawDate: sessionDate, // For filtering
                    date: date,
                    studentName: user.name,
                    studentId: user.rollNo,
                    status: isPresent ? 'Present' : 'Absent',
                    confidence: isPresent ? 90 : 0,
                    evidence: studentRecord?.face_base64 ? `data:image/jpeg;base64,${studentRecord.face_base64}` : null
                });
            });

        } else {
            // Teacher View: Show ALL students for EACH session, merging duplicates by Name
            attendanceData.forEach(session => {
                const sessionDate = new Date(session.date).toISOString().slice(0, 10);
                const date = new Date(session.date).toLocaleDateString() + ' ' + new Date(session.date).toLocaleTimeString();

                // Create a map of present students for easy lookup
                const presentMap = new Map();
                if (session.present_students) {
                    session.present_students.forEach(p => presentMap.set(p.roll_no, p));
                }

                // Temporary map to handle duplicates by Name within this session
                const sessionRecordsByName = new Map();

                // Iterate over ALL registered students
                students.forEach(student => {
                    const presentRecord = presentMap.get(student.roll_no);
                    const isPresent = !!presentRecord;

                    // Normalize name to handle minor case differences or spaces if needed (using straight match for now)
                    const nameKey = student.name.trim();

                    if (sessionRecordsByName.has(nameKey)) {
                        // Merge logic
                        const existing = sessionRecordsByName.get(nameKey);

                        // If this instance is Present, it overrides Absent
                        if (isPresent) {
                            existing.status = 'Present';
                            existing.confidence = 90;
                            existing.evidence = `data:image/jpeg;base64,${presentRecord.face_base64}`;
                            // Use the Roll No of the matched record as the primary one, or append?
                            // Let's swap to the matched ID for clarity, or show both.
                            // Showing the ID that matched is most useful.
                            existing.studentId = student.roll_no;
                        }
                        // If existing was already Present, we leave it. 
                        // If both Absent, doesn't matter.
                    } else {
                        // Create new entry
                        sessionRecordsByName.set(nameKey, {
                            id: `${session.id}_${student.roll_no}`,
                            rawDate: sessionDate,
                            date: date,
                            studentName: student.name,
                            studentId: student.roll_no,
                            status: isPresent ? 'Present' : 'Absent',
                            confidence: isPresent ? 90 : 0,
                            evidence: presentRecord?.face_base64 ? `data:image/jpeg;base64,${presentRecord.face_base64}` : null
                        });
                    }
                });

                // Add merged records to flat list
                sessionRecordsByName.forEach(record => flatList.push(record));
            });
        }

        // Sort by date desc
        flatList.sort((a, b) => new Date(b.date) - new Date(a.date));
        setStats(flatList);
    };

    // Filter stats based on selectedDate
    const filteredStats = stats.filter(stat => stat.rawDate === selectedDate);

    const handleExport = async () => {
        setExporting(true);
        try {
            // Updated export to include date filtering if needed on backend, 
            // but for now keeping it simple or maybe passing date? 
            // The user asked for view filtering.
            const response = await fetch(`http://localhost:8000/api/attendance/export/${classId}`);
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
            alert(`Failed to export attendance: ${error.message}`);
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
                <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-2">
                        <span className="text-sm text-gray-500">Date:</span>
                        <input
                            type="date"
                            className="text-sm focus:outline-none"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

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
                {filteredStats.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        No attendance records found for this date ({new Date(selectedDate).toLocaleDateString()}).
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
                                {filteredStats.map((record, idx) => (
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
                                            {record.status === 'Present' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200">
                                                    <Check className="h-3 w-3" />
                                                    Present
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200">
                                                    <X className="h-3 w-3" />
                                                    Absent
                                                </span>
                                            )}
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
