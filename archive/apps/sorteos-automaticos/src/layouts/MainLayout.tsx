import type { ReactNode } from 'react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';

interface MainLayoutProps {
    children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="app-container">
            <Navbar />
            <main>{children}</main>
            <Footer />
        </div>
    );
}
