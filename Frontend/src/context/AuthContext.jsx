import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Initialize default users in localStorage if not exists
const initializeDefaultUsers = () => {
    const storedUsers = localStorage.getItem('registeredUsers');
    if (!storedUsers) {
        const defaultUsers = {
            teachers: [
                { email: 'teacher@school.edu', password: 'teacher123', role: 'teacher', name: 'Teacher Account' },
                { email: 'admin@school.edu', password: 'admin123', role: 'teacher', name: 'Admin Teacher' },
            ],
            students: [
                { email: 'student@school.edu', password: 'student123', role: 'student', name: 'Student Account', studentId: 'STU001' },
                { email: 'john.doe@school.edu', password: 'student123', role: 'student', name: 'John Doe', studentId: 'STU002' },
            ],
        };
        localStorage.setItem('registeredUsers', JSON.stringify(defaultUsers));
        return defaultUsers;
    }
    return JSON.parse(storedUsers);
};

// Generate unique student ID
const generateStudentId = (existingStudents) => {
    const maxId = existingStudents.reduce((max, student) => {
        const idNum = parseInt(student.studentId?.replace('STU', '') || '0');
        return idNum > max ? idNum : max;
    }, 0);
    return `STU${String(maxId + 1).padStart(3, '0')}`;
};

export const AuthProvider = ({ children }) => {
    // Initialize registered users
    const [registeredUsers, setRegisteredUsers] = useState(() => initializeDefaultUsers());

    // Initialize state from localStorage so login persists on refresh
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    // Save registered users to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    }, [registeredUsers]);

    const signup = (email, password, name, role) => {
        // Check if user already exists
        const allUsers = [...registeredUsers.teachers, ...registeredUsers.students];
        const existingUser = allUsers.find(u => u.email === email);

        if (existingUser) {
            throw new Error('An account with this email already exists');
        }

        // Validate password
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Create new user object
        const newUser = {
            email,
            password,
            name,
            role,
        };

        // Add studentId for students
        if (role === 'student') {
            newUser.studentId = generateStudentId(registeredUsers.students);
        }

        // Add to registered users
        const updatedUsers = { ...registeredUsers };
        if (role === 'teacher') {
            updatedUsers.teachers = [...updatedUsers.teachers, newUser];
        } else {
            updatedUsers.students = [...updatedUsers.students, newUser];
        }

        setRegisteredUsers(updatedUsers);

        // Auto-login after signup
        const { password: _, ...userWithoutPassword } = newUser;
        setUser(userWithoutPassword);
        localStorage.setItem('user', JSON.stringify(userWithoutPassword));

        return userWithoutPassword;
    };

    const login = (email, password, role) => {
        // Find user in registered users
        const userList = role === 'teacher' ? registeredUsers.teachers : registeredUsers.students;
        const foundUser = userList.find(u => u.email === email && u.password === password);

        if (!foundUser) {
            throw new Error('Invalid email or password');
        }

        // Create user object without password
        const { password: _, ...userWithoutPassword } = foundUser;
        const newUser = { ...userWithoutPassword };

        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
        return newUser;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const isTeacher = () => {
        return user?.role === 'teacher';
    };

    const isStudent = () => {
        return user?.role === 'student';
    };

    return (
        <AuthContext.Provider value={{ user, signup, login, logout, isTeacher, isStudent }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
