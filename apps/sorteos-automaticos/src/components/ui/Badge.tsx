import type { ReactNode } from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    className?: string;
}

export default function Badge({ children, className = '', ...props }: BadgeProps) {
    return (
        <div className={`badge ${className}`} {...props}>
            {children}
        </div>
    );
}
