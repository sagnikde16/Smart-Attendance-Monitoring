import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, GraduationCap } from 'lucide-react';
import { Button } from '../ui/Button';

export function Navbar() {
    const { user, logout, isTeacher } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getRoleLabel = () => {
        return isTeacher() ? 'Teacher' : 'Student';
    };

    const RoleIcon = isTeacher() ? User : GraduationCap;

    return (
        <nav className="bg-white border-b border-brand-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-brand-900 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="text-xl font-bold text-brand-900">Smart Attendance Monitoring</span>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-brand-900">{user?.name || 'User'}</p>
                        <p className="text-xs text-brand-500">
                            {getRoleLabel()} {user?.teacherId ? `• ${user.teacherId}` : user?.rollNo ? `• ${user.rollNo}` : ''}
                        </p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center border border-brand-200">
                        <RoleIcon className="h-5 w-5 text-brand-600" />
                    </div>
                </div>

                <div className="h-8 w-px bg-brand-200 mx-2"></div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-brand-600 hover:text-red-600 hover:bg-red-50 gap-2"
                >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                </Button>
            </div>
        </nav>
    );
}
