import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ImportResult {
  message: string;
  imported: number;
  skipped: number;
  errors: string[];
}

interface Props {
  /** Called after a successful import with the number of imported transfers */
  onImportComplete?: () => void;
}

/**
 * T016: Collapsible right vertical import panel.
 * FR-002: Upload transfers from a collapsible right vertical menu.
 */
export function TransferImport({ onImportComplete }: Props) {
  const { accessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
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
    if (!file || !accessToken) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bankType', 'belfius');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/transfers/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: { message?: string } };
        throw new Error(errorData.error?.message ?? 'Upload failed');
      }

      const data = (await response.json()) as ImportResult;
      setResult(data);
      setFile(null);

      const fileInput = document.getElementById('transfer-file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // T018: Notify parent to refresh transfer list
      onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-2 rounded-l-lg shadow-lg transition-all duration-200 flex flex-col items-center gap-1 writing-mode-vertical text-sm"
        title={isOpen ? 'Close import panel' : 'Open import panel'}
        data-testid="import-panel-toggle"
        style={{ writingMode: 'vertical-rl' }}
      >
        {isOpen ? '▶ Close' : '◀ Import'}
      </button>

      {/* Slide-in panel */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-30 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        data-testid="import-panel"
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Import Transfers</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            aria-label="Close import panel"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File (Belfius Format)
            </label>
            <input
              id="transfer-file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-3 file:py-1.5 file:px-3
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              disabled={uploading}
              data-testid="file-input"
            />
          </div>

          {file !== null && (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
              <button
                onClick={() => void handleUpload()}
                disabled={uploading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition duration-200"
                data-testid="upload-button"
              >
                {uploading ? 'Uploading...' : 'Upload & Import'}
              </button>
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              Processing CSV file...
            </div>
          )}

          {error !== null && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-800 font-medium">Error: {error}</p>
            </div>
          )}

          {result !== null && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <h3 className="text-sm font-semibold text-green-800 mb-1">Import Complete!</h3>
              <ul className="text-sm text-green-700 space-y-0.5">
                <li>✓ Imported: {result.imported} transfers</li>
                <li>○ Skipped: {result.skipped} duplicates</li>
                {result.errors.length > 0 && (
                  <li className="text-red-600">✗ Errors: {result.errors.length}</li>
                )}
              </ul>
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-red-800 mb-1">Errors:</p>
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
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-20"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
