'use client';

import React, { useContext } from 'react';
//import { useAuth } from '../../context/AuthContext';

export interface ChatFileUploadProps {
    onFileUpload: (files: File | null) => void;
}

export default function ChatFileUpload({ onFileUpload }: ChatFileUploadProps) {
    //const { tokens } = useAuth();
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        //const files = event.target.files ? Array.from(event.target.files) : null;
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
                onChange={handleFileChange}
                className="w-full rounded border border-gray-300 p-2 bg-gray-50"
                multiple={false}                
            />
            <button
                type="button"
                className="my-2 rounded bg-gray-200 px-2 py-1 text-gray-700"
                onClick={() => {
                    // Clear the file input
                    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
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