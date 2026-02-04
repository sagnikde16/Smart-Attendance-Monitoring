import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { stats, recentActivity, classes } from '../data/mockData';
import { Card } from '../components/ui/Card';
import { Users, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';

export function Dashboard() {
    const { classId } = useParams();
    const { user } = useAuth();
    const currentClass = classes.find(c => c.id === classId);

    // Filter activity for this class if we are in class context
    const classActivity = classId ? recentActivity.filter(a => a.classId === classId || !a.classId) : recentActivity;

    const statItems = [
        { label: 'Total Classes', value: stats.totalClasses, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Avg Attendance', value: `${stats.attendanceRate}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Active Students', value: currentClass ? currentClass.students : stats.activeStudents, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
        { label: 'System Alerts', value: stats.alerts, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-brand-900">
                        {currentClass ? `${currentClass.id} Dashboard` : 'Dashboard'}
                    </h1>
                    <p className="text-brand-500">
                        {currentClass ? `Overview for ${currentClass.name}` : `Welcome back ${user?.email || 'Teacher'}, here's what's happening today.`}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statItems.map((item, index) => (
                    <Card key={index} className="p-6 transition-all hover:shadow-md hover:translate-y-[-2px]">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${item.bg}`}>
                                <item.icon className={`h-6 w-6 ${item.color}`} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-brand-500">{item.label}</p>
                                <p className="text-2xl font-bold text-brand-900">{item.value}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <Card.Header>
                        <Card.Title>Weekly Attendance Overview</Card.Title>
                    </Card.Header>
                    <Card.Content>
                        <div className="h-64 flex flex-col items-center justify-center bg-brand-50/50 rounded-lg border-2 border-dashed border-brand-200">
                            <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center mb-3">
                                <BookOpen className="h-6 w-6 text-brand-400" />
                            </div>
                            <p className="text-brand-400 font-medium">Attendance Analytics Chart</p>
                            <p className="text-brand-300 text-sm">(Data Visualization Placeholder)</p>
                        </div>
                    </Card.Content>
                </Card>

                <Card>
                    <Card.Header>
                        <Card.Title>Recent Activity</Card.Title>
                    </Card.Header>
                    <Card.Content>
                        <div className="space-y-4">
                            {classActivity.length > 0 ? (
                                classActivity.map((activity) => (
                                    <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-brand-100 last:border-0 last:pb-0">
                                        <div className="relative mt-1">
                                            <div className="h-2 w-2 rounded-full bg-primary-500" />
                                            <div className="absolute top-2 left-1 h-full w-px bg-brand-200 -z-10" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-brand-900">{activity.message}</p>
                                            <p className="text-xs text-brand-400 mt-0.5">{activity.time}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-brand-400 text-center py-4">No recent activity for this class.</p>
                            )}
                        </div>
                    </Card.Content>
                </Card>
            </div>
        </div>
    );
}
