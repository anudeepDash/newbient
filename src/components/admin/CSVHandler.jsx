import React from 'react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
import { Download, Upload } from 'lucide-react';

// Converts an array of objects to a CSV string and downloads it
export const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) {
        useStore.getState().addToast("No data available to download.", 'error');
        return;
    }

    // Get all unique keys from the objects to form header row
    const headers = Array.from(new Set(data.flatMap(Object.keys)));

    const csvContent = [
        headers.join(','), // Header row
        ...data.map(row =>
            headers.map(fieldName => {
                let cellData = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];

                // If it's an array (like niches), join it
                if (Array.isArray(cellData)) {
                    cellData = cellData.join(';');
                }

                // Escape quotes and wrap in quotes to handle commas within data
                cellData = String(cellData).replace(/"/g, '""');
                return `"${cellData}"`;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Component to handle file uploads
export const CSVUploadButton = ({ onUpload, className, isLoading }) => {
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const csvText = event.target.result;
            // Basic CSV parsing
            const lines = csvText.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) {
                useStore.getState().addToast("CSV seems empty or invalid.", 'error');
                return;
            }

            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

            const parsedData = lines.slice(1).map(line => {
                // simple split by comma handling basic quotes (not perfectly robust, but functional for this scope)
                const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                const rowObj = {};
                headers.forEach((header, i) => {
                    let val = values[i] ? values[i].replace(/(^"|"$)/g, '').trim() : '';
                    rowObj[header] = val;
                });
                return rowObj;
            });

            onUpload(parsedData);
        };
        reader.readAsText(file);

        // Reset input
        e.target.value = null;
    };

    return (
        <label className={`cursor-pointer inline-flex items-center justify-center ${className}`}>
            <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
                disabled={isLoading}
            />
            {isLoading ? "Uploading..." : <><Upload size={16} className="mr-2" /> Upload Shortlist</>}
        </label>
    );
};
