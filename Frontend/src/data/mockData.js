export const classes = [
    { id: 'C101', name: 'CS-101: Intro to Computer Science', time: 'Mon/Wed 09:00 AM', students: 34, image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
    { id: 'C102', name: 'ENG-202: Advanced Engineering', time: 'Tue/Thu 11:00 AM', students: 28, image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a783?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
    { id: 'C103', name: 'PHY-110: Physics Lab', time: 'Fri 02:00 PM', students: 15, image: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' },
];

export const stats = {
    totalClasses: 3,
    attendanceRate: 88.5,
    activeStudents: 156,
    alerts: 3
};

export const recentActivity = [
    { id: 1, type: 'attendance', message: 'Attendance marked for CS-101', time: '10 min ago', classId: 'C101' },
    { id: 2, type: 'registration', message: 'New student registered: John Doe', time: '1 hour ago' },
    { id: 3, type: 'video', message: 'Classroom footage uploaded', time: '2 hours ago', classId: 'C101' },
    { id: 4, type: 'alert', message: 'Low attendance alert: ENG-202', time: 'Yesterday', classId: 'C102' },
];

export const students = [
    { id: 'S001', name: 'Alice Johnson', department: 'Computer Science', status: 'Active' },
    { id: 'S002', name: 'Bob Smith', department: 'Electrical Engineering', status: 'Active' },
    { id: 'S003', name: 'Charlie Brown', department: 'Mechanical Engineering', status: 'Inactive' },
    { id: 'S004', name: 'Diana Prince', department: 'Mathematics', status: 'Active' },
];

export const videos = [
    { id: 101, name: 'CS-101 Lecture 4.mp4', status: 'Completed', date: '2023-10-25', size: '450 MB', classId: 'C101' },
    { id: 102, name: 'ENG-202 Lab Session.mp4', status: 'Processing', date: '2023-10-26', size: '1.2 GB', classId: 'C102' },
    { id: 103, name: 'PHY-110 Seminar.mp4', status: 'Failed', date: '2023-10-24', size: '200 MB', classId: 'C103' },
];

export const attendanceRecords = [
    { id: 1, studentName: 'Alice Johnson', studentId: 'S001', status: 'Present', time: '09:05 AM', confidence: 98, evidence: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80', classId: 'C101' },
    { id: 2, studentName: 'Bob Smith', studentId: 'S002', status: 'Absent', time: '-', confidence: 0, evidence: null, classId: 'C101' },
    { id: 3, studentName: 'Charlie Brown', studentId: 'S003', status: 'Present', time: '09:12 AM', confidence: 89, evidence: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80', classId: 'C101' },
    { id: 4, studentName: 'Diana Prince', studentId: 'S004', status: 'Present', time: '09:00 AM', confidence: 99, evidence: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80', classId: 'C102' },
    { id: 5, studentName: 'Evan Wright', studentId: 'S005', status: 'Present', time: '09:08 AM', confidence: 92, evidence: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80', classId: 'C103' },
];
