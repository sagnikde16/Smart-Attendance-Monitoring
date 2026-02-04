import { useParams } from 'react-router-dom';
import { attendanceRecords, classes } from '../data/mockData';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download, Filter, Search, Check, X, User } from 'lucide-react';

export function AttendanceReports() {
    const { classId } = useParams();
    const currentClass = classes.find(c => c.id === classId);
    const classRecords = attendanceRecords.filter(r => r.classId === classId);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-brand-900">
                        {currentClass ? `${currentClass.id} - Attendance Reports` : 'Attendance Reports'}
                    </h1>
                    <p className="text-brand-500">View and export detailed attendance records for {currentClass?.name}.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" className="gap-2">
                        <Filter className="h-4 w-4" /> Filter
                    </Button>
                    <Button className="gap-2">
                        <Download className="h-4 w-4" /> Export CSV
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-brand-50 text-brand-600 font-medium border-b border-brand-200">
                            <tr>
                                <th className="px-6 py-4 whitespace-nowrap">Student</th>
                                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                                <th className="px-6 py-4 whitespace-nowrap">Time</th>
                                <th className="px-6 py-4 whitespace-nowrap">Confidence</th>
                                <th className="px-6 py-4 whitespace-nowrap">Visual Evidence</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-100">
                            {classRecords.map((record) => (
                                <tr key={record.id} className="hover:bg-brand-50/50 transition-colors">
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
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                                    ${record.status === 'Present'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {record.status === 'Present' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                            {record.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-brand-600 whitespace-nowrap">
                                        {record.id === 2 ? <span className="text-brand-300">-</span> : record.time}
                                    </td>
                                    <td className="px-6 py-4">
                                        {record.confidence > 0 ? (
                                            <div className="w-32">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-medium text-brand-700">{record.confidence}% Match</span>
                                                </div>
                                                <div className="h-2 w-full bg-brand-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ease-in-out ${record.confidence > 90 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                                        style={{ width: `${record.confidence}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-brand-300 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {record.evidence ? (
                                            <div className="h-12 w-16 rounded-md overflow-hidden border border-brand-200 ring-1 ring-brand-900/5 group relative shadow-sm cursor-zoom-in hover:scale-105 transition-transform">
                                                <img src={record.evidence} alt="Evidence" className="h-full w-full object-cover" />
                                                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
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
                <div className="p-4 border-t border-brand-100 bg-brand-50/50 flex items-center justify-between text-sm text-brand-500">
                    <p>Showing 5 of 42 records</p>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" disabled>Previous</Button>
                        <Button variant="secondary" size="sm">Next</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
