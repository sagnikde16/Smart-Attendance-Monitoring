import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';

export function Layout() {
    return (
        <div className="min-h-screen bg-brand-50 flex">
            <Sidebar />
            <main className="flex-1 ml-64 min-w-0">
                <div className="container mx-auto p-8 max-w-7xl animate-fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
