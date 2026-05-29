import type { ReactNode } from 'react';

interface StepCardProps {
    icon: ReactNode;
    step: string;
    title: string;
    desc: string;
}

export default function StepCard({ icon, step, title, desc }: StepCardProps) {
    return (
        <div style={{ padding: '2rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                {icon}
                <span style={{ fontSize: '3rem', fontWeight: '900', opacity: 0.1, lineHeight: 1 }}>{step}</span>
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{title}</h3>
            <p className="text-secondary">{desc}</p>
        </div>
    );
}
