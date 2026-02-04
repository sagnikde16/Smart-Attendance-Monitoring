import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Lock, Mail, ArrowRight, GraduationCap, User, AlertCircle } from 'lucide-react';

export function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('teacher'); // 'teacher' or 'student'
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Mock login delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Attempt login with credentials
            const loggedInUser = login(email, password, role);
            
            setIsLoading(false);
            
            // Navigate based on role
            if (loggedInUser.role === 'teacher') {
                navigate('/classes');
            } else {
                navigate('/classes');
            }
        } catch (err) {
            setError(err.message || 'Invalid credentials. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-brand-900">EduVision AI</h1>
                    <p className="text-brand-500 mt-2">Sign in to your account</p>
                </div>

                <Card>
                    <Card.Content className="pt-6">
                        {/* Role Selection */}
                        <div className="mb-6">
                            <label className="text-sm font-medium text-brand-700 mb-3 block">I am a</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRole('teacher');
                                        setError('');
                                    }}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                                        role === 'teacher'
                                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                                            : 'border-brand-200 bg-white text-brand-600 hover:border-brand-300'
                                    }`}
                                >
                                    <User className="h-5 w-5" />
                                    <span className="font-medium">Teacher</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRole('student');
                                        setError('');
                                    }}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                                        role === 'student'
                                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                                            : 'border-brand-200 bg-white text-brand-600 hover:border-brand-300'
                                    }`}
                                >
                                    <GraduationCap className="h-5 w-5" />
                                    <span className="font-medium">Student</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-brand-700">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-400" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-shadow"
                                        placeholder={role === 'teacher' ? 'teacher@school.edu' : 'student@school.edu'}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-brand-700">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-400" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-shadow"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-11 text-base gap-2" disabled={isLoading}>
                                {isLoading ? (
                                    'Signing in...'
                                ) : (
                                    <>
                                        Sign In <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>

                        {/* Demo Credentials */}
                        <div className="mt-6 p-4 bg-brand-50 rounded-lg border border-brand-200">
                            <p className="text-xs font-medium text-brand-700 mb-2">Demo Credentials:</p>
                            <div className="space-y-1 text-xs text-brand-600">
                                <p><strong>Teacher:</strong> teacher@school.edu / teacher123</p>
                                <p><strong>Student:</strong> student@school.edu / student123</p>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-brand-200">
                            <p className="text-sm text-center text-brand-600">
                                Don't have an account?{' '}
                                <Link 
                                    to="/signup" 
                                    className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                                >
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </Card.Content>
                    <div className="bg-brand-50 px-6 py-4 border-t border-brand-100 rounded-b-xl">
                        <p className="text-xs text-center text-brand-500">
                            Protected by EduVision AI security systems.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
