import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface ImportResult {
  message: string;
  imported: number;
  /** Total skipped (sum of the three breakdown fields) */
  skipped: number;
  skippedDuplicates: number;
  skippedReversedInternal: number;
  skippedInvalidData: number;
  errors: string[];
}

interface Props {
  /** Called after a successful import with the result details */
  onImportComplete?: (result: ImportResult) => void;
  /** When true, renders inline content without the fixed panel or accordion (for use in modals) */
  compact?: boolean;
}

/**
 * US2: Responsive import panel.
 * - Wide screens (lg+): fixed panel on the right that does NOT scroll with content.
 * - Narrow screens: collapsible accordion ABOVE the transaction list.
 * - compact mode: inline content only (for use in modals/ActionBar).
 * - Now supports multiple file uploads for async processing.
 */
export function TransferImport({ onImportComplete, compact = false }: Props) {
  const { accessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isWide, setIsWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for window resize and update layout mode
  useEffect(() => {
    const handleResize = () => {
      setIsWide(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(selectedFiles);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!files || files.length === 0 || !accessToken) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      
      // Add multiple files
      for (let i = 0; i < files.length; i++) {
        formData.append('files[]', files[i]);
      }
      
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
      setFiles(null);
      const fileInput = document.getElementById('transfer-file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      onImportComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    if (!files) return;
    
    const newFiles = new DataTransfer();
    for (let i = 0; i < files.length; i++) {
      if (i !== index) {
        newFiles.items.add(files[i]);
      }
    }
    
    if (newFiles.files.length === 0) {
      setFiles(null);
      const fileInput = document.getElementById('transfer-file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } else {
      setFiles(newFiles.files);
    }
  };
  // ── Shared panel content ─────────────────────────────────────────────────
  const panelContent = (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select CSV Files (Belfius Format)
        </label>
        <input
          id="transfer-file-upload"
          type="file"
          accept=".csv"
          multiple
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
        <p className="text-xs text-gray-500 mt-1">
          You can select multiple CSV files to upload at once.
        </p>
      </div>
      
      {files !== null && files.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Selected Files ({files.length}):
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {Array.from(files).map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span className="text-sm text-gray-700 truncate flex-1">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-2 text-red-500 hover:text-red-700 text-sm font-medium"
                  disabled={uploading}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => void handleUpload()}
            disabled={uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition duration-200 mt-3"
            data-testid="upload-button"
          >
            {uploading ? 'Uploading...' : `Upload & Import ${files.length} File${files.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
      
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          Processing CSV file{files && files.length > 1 ? 's' : ''}...
          <p className="text-xs text-gray-500 mt-1">
            Files are being processed asynchronously. You can navigate away from this page.
          </p>
        </div>
      )}
      
      {error !== null && (
        <div className="bg-red-50 border border-red-200 rounded p-3" role="alert">
          <p className="text-sm text-red-800 font-medium">Error: {error}</p>
        </div>
      )}
      
      {result !== null && (
        <div className="bg-green-50 border border-green-200 rounded p-3" role="status">
          <h3 className="text-sm font-semibold text-green-800 mb-2">
            {result.message.includes('successfully') ? 'Upload Successful!' : 'Import Complete!'}
          </h3>
          {result.message.includes('successfully') ? (
            <p className="text-sm text-green-700">
              Your file{files && files.length > 1 ? 's have' : ' has'} been uploaded and will be processed asynchronously.
            </p>
          ) : (
            <ul className="text-sm space-y-0.5">
              <li className="text-green-700">✓ Imported: <strong>{result.imported}</strong> transfer{result.imported !== 1 ? 's' : ''}</li>
              {result.skippedDuplicates > 0 && (
                <li className="text-amber-600">○ Duplicates skipped: <strong>{result.skippedDuplicates}</strong></li>
              )}
              {result.skippedReversedInternal > 0 && (
                <li className="text-amber-600">○ Reversed internal transfers cancelled: <strong>{result.skippedReversedInternal}</strong></li>
              )}
              {result.skippedInvalidData > 0 && (
                <li className="text-orange-600">⚠ Invalid / incomplete rows skipped: <strong>{result.skippedInvalidData}</strong></li>
              )}
              {result.errors.length > 0 && (
                <li className="text-red-600">✗ Errors: <strong>{result.errors.length}</strong></li>
              )}
            </ul>
          )}
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-800 mb-1">Error details:</p>
              <ul className="text-xs text-red-700 list-disc list-inside space-y-0.5">
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
  // ── Compact mode: inline content only (e.g. inside a modal) ─────────────
  if (compact) {
    return <div className="space-y-4">{panelContent}</div>;
  }
  // ── Wide screen: fixed panel on the right ────────────────────────────────
  if (isWide) {
    return (
      <div
        className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-30 flex flex-col border-l border-gray-200"
        data-testid="import-panel"
        role="complementary"
        aria-label="Import transfers panel"
      >
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Import Transfers</h2>
          <p className="text-xs text-gray-500 mt-0.5">Upload Belfius CSV files (single or multiple)</p>
        </div>
        {panelContent}
      </div>
    );
  }
  // ── Narrow screen: collapsible accordion above the list ──────────────────
  return (
    <div className="mb-4" data-testid="import-panel">
      {/* Accordion toggle button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-expanded={isOpen}
        aria-controls="import-panel-accordion"
        data-testid="import-panel-toggle"
      >
        <span className="text-sm font-semibold text-gray-700">
          {isOpen ? '▲ Import Transfers' : '▼ Import Transfers'}
        </span>
        <span className="text-xs text-gray-400">{isOpen ? 'Collapse' : 'Expand'}</span>
      </button>

      {/* Accordion body */}
      {isOpen && (
        <div
          id="import-panel-accordion"
          className="bg-white rounded-b-lg shadow-md border-t border-gray-100 flex flex-col"
          role="region"
          aria-label="Import transfers form"
        >
          {panelContent}
        </div>
      )}
    </div>
  );
}
