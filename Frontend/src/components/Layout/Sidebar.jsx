import { LayoutDashboard, UserPlus, Video, FileText, ArrowLeft, LogOut, GraduationCap, User } from 'lucide-react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Sidebar() {
    const { classId } = useParams();
    const { user, logout, isTeacher, isStudent } = useAuth();
    const navigate = useNavigate();

    // Base links available to all users
    const baseLinks = [
        { to: `/class/${classId}/dashboard`, icon: LayoutDashboard, label: 'Dashboard' },
        { to: `/class/${classId}/reports`, icon: FileText, label: 'Attendance Reports' },
    ];

    // Teacher-only links
    const teacherLinks = [
        { to: `/class/${classId}/registration`, icon: UserPlus, label: 'Registration' },
        { to: `/class/${classId}/upload`, icon: Video, label: 'Video Management' },
    ];

    // Combine links based on role
    const links = isTeacher() ? [...baseLinks, ...teacherLinks] : baseLinks;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getRoleLabel = () => {
        if (isTeacher()) return 'Teacher';
        if (isStudent()) return 'Student';
        return 'User';
    };

    const getRoleIcon = () => {
        if (isTeacher()) return User;
        if (isStudent()) return GraduationCap;
        return User;
    };

    const RoleIcon = getRoleIcon();

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-brand-900 text-white flex flex-col shadow-2xl z-50">
            <div className="flex h-16 items-center px-6 border-b border-brand-800/50 bg-brand-950/30">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/classes')}>
                    <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center hover:bg-primary-500 transition-colors">
                        <ArrowLeft className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">Smart Attend</h1>
                        <p className="text-xs text-brand-400">Class: {classId}</p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
                {links.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 group ${isActive
                                ? 'bg-primary-600/10 text-primary-400 border-r-2 border-primary-500'
                                : 'text-brand-400 hover:bg-brand-800 hover:text-brand-100 hover:pl-5'
                            }`
                        }
                    >
                        <Icon className="h-5 w-5" />
                        {label}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-brand-800 bg-brand-950/30">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-brand-700 to-brand-600 ring-2 ring-brand-800 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                            {user?.email?.substring(0, 2).toUpperCase() || 'US'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{getRoleLabel()}</p>
                            <p className="text-xs text-brand-400 truncate">{user?.email || user?.name}</p>
                            {user?.studentId && (
                                <p className="text-xs text-brand-500 truncate">ID: {user.studentId}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-brand-400 hover:text-white hover:bg-brand-800 rounded-lg transition-colors"
                        title="Sign Out"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
