import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ImportResult {
  message: string;
  imported: number;
  skipped: number;
  errors: string[];
}

export function TransferImport() {
  const { accessToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !accessToken) {
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bankType', 'belfius');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/transfers/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      setResult(data);
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Import CSV Transfers</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select CSV File (Belfius Format)
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
          disabled={uploading}
        />
      </div>

      {file && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Selected file: <span className="font-medium">{file.name}</span>
          </p>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
              text-white font-semibold py-2 px-6 rounded transition duration-200"
          >
            {uploading ? 'Uploading...' : 'Upload & Import'}
          </button>
        </div>
      )}

      {uploading && (
        <div className="mb-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-gray-600">Processing CSV file...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded p-4">
          <p className="text-sm text-red-800 font-medium">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Import Complete!</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>✓ Imported: {result.imported} transfers</li>
            <li>○ Skipped: {result.skipped} duplicates</li>
            {result.errors.length > 0 && (
              <li className="text-red-600">✗ Errors: {result.errors.length}</li>
            )}
          </ul>
          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
              <ul className="text-xs text-red-700 list-disc list-inside">
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

