import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Initialize default users in localStorage if not exists
const initializeDefaultUsers = () => {
    const storedUsers = localStorage.getItem('registeredUsers');
    if (!storedUsers) {
        const defaultUsers = {
            teachers: [
                { teacherId: 'T001', password: 'teacher123', role: 'teacher', name: 'Teacher Account' },
                { teacherId: 'ADMIN', password: 'admin123', role: 'teacher', name: 'Admin Teacher' },
            ],
            students: [
                { rollNo: 'STU001', password: 'student123', role: 'student', name: 'Student Account' },
                { rollNo: 'STU002', password: 'student123', role: 'student', name: 'John Doe' },
            ],
        };
        localStorage.setItem('registeredUsers', JSON.stringify(defaultUsers));
        return defaultUsers;
    };
    return JSON.parse(storedUsers);
};

export const AuthProvider = ({ children }) => {
    // Initialize registered users
    const [registeredUsers, setRegisteredUsers] = useState(() => initializeDefaultUsers());

    // Initialize state from sessionStorage so login persists on refresh but clears on close
    const [user, setUser] = useState(() => {
        const savedUser = sessionStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    // Save registered users to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    }, [registeredUsers]);

    const signup = (identifier, password, name, role) => {
        // Validation
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Check uniqueness based on role
        if (role === 'teacher') {
            const exists = registeredUsers.teachers.find(u => u.teacherId === identifier);
            if (exists) throw new Error('Teacher ID already exists');
        } else {
            const exists = registeredUsers.students.find(u => u.rollNo === identifier);
            if (exists) throw new Error('Roll Number already exists');
        }

        // Create new user object
        const newUser = {
            password,
            name,
            role,
        };

        // Assign specific ID field
        if (role === 'teacher') {
            newUser.teacherId = identifier;
        } else {
            newUser.rollNo = identifier;
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
        sessionStorage.setItem('user', JSON.stringify(userWithoutPassword));

        return userWithoutPassword;
    };

    const login = (identifier, password, role) => {
        // Find user in registered users
        const userList = role === 'teacher' ? registeredUsers.teachers : registeredUsers.students;

        let foundUser;
        if (role === 'teacher') {
            foundUser = userList.find(u => u.teacherId === identifier && u.password === password);
        } else {
            foundUser = userList.find(u => u.rollNo === identifier && u.password === password);
        }

        if (!foundUser) {
            throw new Error('Invalid ID or password');
        }

        // Create user object without password
        const { password: _, ...userWithoutPassword } = foundUser;
        const newUser = { ...userWithoutPassword };

        setUser(newUser);
        sessionStorage.setItem('user', JSON.stringify(newUser));
        return newUser;
    };

    const logout = () => {
        setUser(null);
        sessionStorage.removeItem('user');
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
