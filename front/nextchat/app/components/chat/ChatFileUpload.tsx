'use client';

import React, { useContext } from 'react';
//import { useAuth } from '../../context/AuthContext';

export interface ChatFileUploadProps {
    onFileUpload: (files: File | null) => void;
    // When this numeric prop changes, the component will clear the file input
    resetTrigger?: number;
}

export default function ChatFileUpload({ onFileUpload, resetTrigger }: ChatFileUploadProps) {
    //const { tokens } = useAuth();
    
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    // When parent increments `resetTrigger`, clear the file input and notify parent
    React.useEffect(() => {
        if (typeof resetTrigger === 'number') {
            const input = inputRef.current;
            if (input) {
                input.value = '';
            }
            onFileUpload(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetTrigger]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            onFileUpload(null);
        } else {
            onFileUpload(event.target.files[0]);
        }
    };

    return (
        <div className="mt-2">
            <input
                type="file"
                accept="*/*"
                ref={inputRef}
                onChange={handleFileChange}
                className="w-full rounded border border-gray-300 p-2 bg-gray-50"
                multiple={false}                
            />
            <button
                type="button"
                className="my-2 rounded bg-gray-200 px-2 py-1 text-gray-700"
                onClick={() => {
                    // Clear the file input
                    const input = inputRef.current;
                    if (input) {
                        input.value = '';
                        onFileUpload(null);
                    }
                }}
            >
                Clear
            </button>
        </div>
    );
}