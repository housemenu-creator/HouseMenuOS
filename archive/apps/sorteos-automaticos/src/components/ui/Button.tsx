import { type ReactNode, type CSSProperties } from 'react';

interface ButtonProps {
    children: ReactNode;
    variant?: 'primary' | 'outline';
    onClick?: () => void;
    className?: string;
    style?: CSSProperties;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    title?: string;
}

export default function Button({ children, variant = 'primary', onClick, className = '', style, disabled, type = 'button', title }: ButtonProps) {
    const baseClass = variant === 'primary' ? 'btn btn-primary' : 'btn btn-outline';

    return (
        <button
            type={type}
            className={`${baseClass} ${className}`}
            onClick={onClick}
            style={{ ...style, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            disabled={disabled}
            title={title}
        >
            {children}
        </button>
    );
}
