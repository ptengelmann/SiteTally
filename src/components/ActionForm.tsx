'use client';

import { useState } from 'react';

// Common location presets for quick selection
const LOCATION_PRESETS = [
  { label: 'Select a preset location...', value: '' },
  { label: 'Main Warehouse', value: 'Main Warehouse' },
  { label: 'Site Office', value: 'Site Office' },
  { label: 'Vehicle Bay', value: 'Vehicle Bay' },
  { label: 'Tool Storage', value: 'Tool Storage' },
  { label: 'North Site', value: 'North Site' },
  { label: 'South Site', value: 'South Site' },
  { label: 'East Site', value: 'East Site' },
  { label: 'West Site', value: 'West Site' },
  { label: 'Client Location', value: 'Client Location' },
];

interface Asset {
  asset_id: string;
  asset_name: string;
  qr_code_id: string;
  current_status: 'AVAILABLE' | 'CHECKED_OUT' | 'MAINTENANCE' | 'RETIRED';
  current_location?: string;
}

interface ActionFormProps {
  asset: Asset;
  userId: string;
  onSuccess: (action: 'checkout' | 'checkin', updatedAsset: Asset) => void;
  onError: (error: string) => void;
}

export default function ActionForm({ asset, userId, onSuccess, onError }: ActionFormProps) {
  const [jobSiteName, setJobSiteName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckout = async () => {
    if (!jobSiteName.trim()) {
      onError('Please enter a job site name');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code_id: asset.qr_code_id,
          user_id: userId,
          job_site_name: jobSiteName.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        onError(data.error || 'Checkout failed');
        return;
      }

      // Vibrate on success
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      onSuccess('checkout', data.data);
    } catch {
      onError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckin = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code_id: asset.qr_code_id,
          user_id: userId,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        onError(data.error || 'Check-in failed');
        return;
      }

      // Vibrate on success
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      onSuccess('checkin', data.data);
    } catch {
      onError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // AVAILABLE: Show checkout form
  if (asset.current_status === 'AVAILABLE') {
    return (
      <div className="w-full max-w-md mx-auto mt-6">
        <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
              →
            </span>
            Check Out This Asset
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="locationPreset" className="block text-sm font-medium text-gray-300 mb-2">
                Quick Select Location
              </label>
              <select
                id="locationPreset"
                onChange={(e) => {
                  if (e.target.value) {
                    setJobSiteName(e.target.value);
                  }
                }}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                disabled={isSubmitting}
              >
                {LOCATION_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="jobSite" className="block text-sm font-medium text-gray-300 mb-2">
                Job Site Name <span className="text-red-400">*</span>
              </label>
              <input
                id="jobSite"
                type="text"
                value={jobSiteName}
                onChange={(e) => setJobSiteName(e.target.value)}
                placeholder="Or type a custom location..."
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-lg"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none"
                disabled={isSubmitting}
              />
            </div>

            <button
              onClick={handleCheckout}
              disabled={isSubmitting || !jobSiteName.trim()}
              className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-xl rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  CHECK OUT
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CHECKED_OUT: Show checkin form
  if (asset.current_status === 'CHECKED_OUT') {
    return (
      <div className="w-full max-w-md mx-auto mt-6">
        <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white">
              ←
            </span>
            Return This Asset
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-2">
                Return Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condition notes, issues to report..."
                rows={2}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                disabled={isSubmitting}
              />
            </div>

            <button
              onClick={handleCheckin}
              disabled={isSubmitting}
              className="w-full py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-xl rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  CHECK IN
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAINTENANCE or RETIRED: Show unavailable message
  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <div className="bg-gray-800 rounded-2xl p-5 border border-yellow-600">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
          <div>
            <h3 className="text-lg font-bold text-yellow-400">Asset Unavailable</h3>
            <p className="text-sm text-gray-400">
              {asset.current_status === 'MAINTENANCE'
                ? 'This asset is currently in maintenance and cannot be checked out.'
                : 'This asset has been retired and is no longer in service.'}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Contact your supervisor if you need access to this equipment.
        </p>
      </div>
    </div>
  );
}
