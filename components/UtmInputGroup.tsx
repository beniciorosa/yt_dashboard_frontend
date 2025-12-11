import React, { useRef } from 'react';

interface InputGroupProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    className?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

export const InputGroup: React.FC<InputGroupProps> = ({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    className = "",
    icon,
    disabled = false,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleLabelClick = (e: React.MouseEvent) => {
        if (type === 'date' && inputRef.current && 'showPicker' in inputRef.current) {
            e.preventDefault();
            try {
                (inputRef.current as any).showPicker();
            } catch (err) {
                inputRef.current.focus();
            }
        }
    };

    const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
        if (type === 'date' && 'showPicker' in e.currentTarget) {
            try {
                (e.currentTarget as any).showPicker();
            } catch (err) {
                // ignore
            }
        }
    };

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label
                onClick={handleLabelClick}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-pointer select-none"
            >
                {icon}
                {label}
            </label>
            <input
                ref={inputRef}
                type={type}
                value={value}
                onChange={onChange}
                onClick={handleInputClick}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500"
            />
        </div>
    );
};
