'use client';

import React, { useContext } from 'react';
import { useAuth } from '../../context/AuthContext';

export interface ChatFileUploadProps {
    onFileUpload: (file: File) => void;
}

export default function ChatFileUpload({ onFileUpload }: ChatFileUploadProps) {
    const { tokens } = useAuth();
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onFileUpload(file);
        }
    };

    return (
        <div className="mt-2">
            <input
                type="file"
                accept="*/*"
                onChange={handleFileChange}
                className="w-full rounded border border-gray-300 p-2 bg-white"
            />
            <button
                type="button"
                className="ml-2 rounded bg-blue-500 px-4 py-2 text-white"
                onClick={() => {
                    // Clear the file input
                    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                    if (input) {
                        input.value = '';
                    }
                }}
            >
                Clear
            </button>
        </div>
    );
}