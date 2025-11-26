'use client';

interface Asset {
  asset_id: string;
  asset_name: string;
  qr_code_id: string;
  description?: string;
  purchase_cost?: string;
  current_status: 'AVAILABLE' | 'CHECKED_OUT' | 'MAINTENANCE' | 'RETIRED';
  last_checked_out_by_id?: string;
  last_checkout_time?: string;
  current_location?: string;
  checked_out_by_name?: string;
}

interface AssetStatusProps {
  asset: Asset;
  onBack: () => void;
}

const statusConfig = {
  AVAILABLE: {
    color: 'bg-green-500',
    textColor: 'text-green-400',
    borderColor: 'border-green-500',
    label: 'Available',
    icon: '✓',
  },
  CHECKED_OUT: {
    color: 'bg-orange-500',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500',
    label: 'Checked Out',
    icon: '→',
  },
  MAINTENANCE: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500',
    label: 'In Maintenance',
    icon: '⚠',
  },
  RETIRED: {
    color: 'bg-gray-500',
    textColor: 'text-gray-400',
    borderColor: 'border-gray-500',
    label: 'Retired',
    icon: '✕',
  },
};

export default function AssetStatus({ asset, onBack }: AssetStatusProps) {
  const config = statusConfig[asset.current_status];

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount?: string) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center text-gray-400 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Scan Again
      </button>

      {/* Asset Card */}
      <div className={`bg-gray-800 rounded-2xl border-2 ${config.borderColor} overflow-hidden`}>
        {/* Status Banner */}
        <div className={`${config.color} px-4 py-3 flex items-center justify-between`}>
          <span className="text-white font-bold text-lg flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            {config.label}
          </span>
          <span className="text-white/80 text-sm font-mono">{asset.qr_code_id}</span>
        </div>

        {/* Asset Details */}
        <div className="p-5">
          <h2 className="text-2xl font-bold text-white mb-2">{asset.asset_name}</h2>

          {asset.description && (
            <p className="text-gray-400 text-sm mb-4">{asset.description}</p>
          )}

          <div className="space-y-3">
            {asset.current_location && (
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400 text-sm">Location</span>
                <span className="text-white font-medium">{asset.current_location}</span>
              </div>
            )}

            {asset.current_status === 'CHECKED_OUT' && (
              <>
                {asset.checked_out_by_name && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span className="text-gray-400 text-sm">Checked Out By</span>
                    <span className="text-white font-medium">{asset.checked_out_by_name}</span>
                  </div>
                )}
                {asset.last_checkout_time && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span className="text-gray-400 text-sm">Since</span>
                    <span className="text-white font-medium">{formatDate(asset.last_checkout_time)}</span>
                  </div>
                )}
              </>
            )}

            {asset.purchase_cost && (
              <div className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-gray-400 text-sm">Value</span>
                <span className="text-white font-medium">{formatCurrency(asset.purchase_cost)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
