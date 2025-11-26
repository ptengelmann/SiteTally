'use client';

interface Asset {
  asset_name: string;
  qr_code_id: string;
  current_location?: string;
}

interface SuccessScreenProps {
  action: 'checkout' | 'checkin';
  asset: Asset;
  onScanAnother: () => void;
}

export default function SuccessScreen({ action, asset, onScanAnother }: SuccessScreenProps) {
  const isCheckout = action === 'checkout';

  return (
    <div className="w-full max-w-md mx-auto text-center">
      {/* Success animation */}
      <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${isCheckout ? 'bg-green-500' : 'bg-orange-500'}`}>
        <svg className="w-14 h-14 text-white animate-bounce-once" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-3xl font-bold text-white mb-2">
        {isCheckout ? 'Checked Out!' : 'Checked In!'}
      </h2>

      <div className="bg-gray-800 rounded-xl p-4 mb-6">
        <p className="text-xl text-white font-semibold">{asset.asset_name}</p>
        <p className="text-gray-400 text-sm font-mono">{asset.qr_code_id}</p>
        {isCheckout && asset.current_location && (
          <p className="text-green-400 mt-2 text-sm">
            Location: {asset.current_location}
          </p>
        )}
      </div>

      <p className="text-gray-400 mb-8">
        {isCheckout
          ? 'This asset is now assigned to you. Remember to check it back in when done.'
          : 'This asset has been returned and is now available.'}
      </p>

      <button
        onClick={onScanAnother}
        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl transition-colors"
      >
        Scan Another
      </button>
    </div>
  );
}
