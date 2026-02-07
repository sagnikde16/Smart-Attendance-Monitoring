import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Lock, Mail, ArrowRight, GraduationCap, User, AlertCircle, UserPlus, CheckCircle } from 'lucide-react';

export function Signup() {
    const navigate = useNavigate();
    const { signup } = useAuth();
    const [name, setName] = useState('');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('teacher'); // 'teacher' or 'student'
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!identifier.trim()) {
            setError(role === 'teacher' ? 'Please enter your Teacher ID' : 'Please enter your Roll Number');
            return;
        }

        setIsLoading(true);

        try {
            // Mock signup delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Attempt signup
            const newUser = signup(identifier, password, name.trim(), role);

            setIsLoading(false);
            setSuccess(true);

            // Navigate after short delay
            setTimeout(() => {
                navigate('/classes');
            }, 1500);
        } catch (err) {
            setError(err.message || 'An error occurred during signup. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-brand-900">Smart Attendance Monitoring</h1>
                    <p className="text-brand-500 mt-2">Create your account</p>
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
                                    className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${role === 'teacher'
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
                                    className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${role === 'student'
                                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                                        : 'border-brand-200 bg-white text-brand-600 hover:border-brand-300'
                                        }`}
                                >
                                    <GraduationCap className="h-5 w-5" />
                                    <span className="font-medium">Student</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSignup} className="space-y-6">
                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>Account created successfully! Redirecting...</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-brand-700">Full Name</label>
                                <div className="relative">
                                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-400" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-shadow"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-brand-700">
                                    {role === 'teacher' ? 'Teacher ID' : 'Roll Number'}
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-400" />
                                    <input
                                        type="text"
                                        required
                                        value={identifier}
                                        onChange={(e) => {
                                            setIdentifier(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-shadow"
                                        placeholder={role === 'teacher' ? 'T001' : 'STU001'}
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
                                        minLength={6}
                                    />
                                </div>
                                <p className="text-xs text-brand-500">Must be at least 6 characters</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-brand-700">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-400" />
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full h-11 pl-10 pr-4 rounded-lg border border-brand-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-shadow"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-11 text-base gap-2" disabled={isLoading || success}>
                                {isLoading ? (
                                    'Creating account...'
                                ) : success ? (
                                    <>
                                        Success! <CheckCircle className="h-4 w-4" />
                                    </>
                                ) : (
                                    <>
                                        Create Account <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-brand-200">
                            <p className="text-sm text-center text-brand-600">
                                Already have an account?{' '}
                                <Link
                                    to="/login"
                                    className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                                >
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </Card.Content>
                    <div className="bg-brand-50 px-6 py-4 border-t border-brand-100 rounded-b-xl">
                        <p className="text-xs text-center text-brand-500">
                            Protected by Smart Attendance Monitoring security systems.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
