import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Scan, Check, X, AlertCircle, Download, Smartphone } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';

const API_BASE_URL = 'http://localhost:8000/api';

const QRCheckIn = ({ reservation, onClose, onCheckInSuccess }) => {
  const [mode, setMode] = useState('display'); // 'display' or 'scan'
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [scanner, setScanner] = useState(null);
  const [scanning, setScanning] = useState(false);

  const token = localStorage.getItem('access_token');

  // Fetch QR code for reservation
  const fetchQRCode = async () => {
    if (!reservation) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/reservations/${reservation.id}/qr/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate QR code');
      }

      const data = await response.json();
      setQrCodeData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching QR code:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'display' && reservation) {
      fetchQRCode();
    }
  }, [mode, reservation]);

  // Initialize QR code scanner
  const startScanner = async () => {
    setScanning(true);
    setError(null);

    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      setScanner(html5QrCode);

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanError
      );
    } catch (err) {
      setError('Failed to start camera. Please ensure camera permissions are granted.');
      setScanning(false);
      console.error('Scanner error:', err);
    }
  };

  // Stop scanner
  const stopScanner = async () => {
    if (scanner) {
      try {
        await scanner.stop();
        await scanner.clear();
        setScanner(null);
        setScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  // Handle successful QR scan
  const onScanSuccess = async (decodedText) => {
    try {
      const qrData = JSON.parse(decodedText);
      const reservationId = qrData.reservation_id;

      if (!reservationId) {
        throw new Error('Invalid QR code format');
      }

      // Stop scanner
      await stopScanner();

      // Perform check-in
      await performCheckIn(reservationId);
    } catch (err) {
      setError('Invalid QR code. Please scan a valid reservation QR code.');
      console.error('QR scan error:', err);
    }
  };

  // Handle scan errors (ignore most)
  const onScanError = (error) => {
    // Ignore "NotFoundException" - it's normal when no QR code is in view
    if (!error.includes('NotFoundException')) {
      console.warn('QR scan error:', error);
    }
  };

  // Perform check-in API call
  const performCheckIn = async (reservationId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/check-in/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to check in');
      }

      const data = await response.json();
      setSuccess(`Successfully checked in to ${data.room}!`);

      // Call success callback
      if (onCheckInSuccess) {
        onCheckInSuccess(data);
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
      console.error('Check-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Download QR code as image
  const downloadQRCode = () => {
    if (!qrCodeData) return;

    const svg = document.getElementById('reservation-qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `reservation-${reservation.id}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <QrCode className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {mode === 'display' ? 'Your QR Code' : 'Scan QR Code'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {mode === 'display' ? 'Show this to check in' : 'Scan to check in'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => {
                setMode('display');
                stopScanner();
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'display'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Show QR Code
            </button>
            <button
              onClick={() => {
                setMode('scan');
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === 'scan'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Scan className="w-4 h-4" />
              Scan QR Code
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
            </div>
          )}

          {/* Display QR Code Mode */}
          {mode === 'display' && (
            <div className="text-center">
              {loading ? (
                <div className="py-12">
                  <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Generating QR code...</p>
                </div>
              ) : qrCodeData ? (
                <>
                  {/* Reservation Details */}
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Reservation Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Room:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{qrCodeData.data.room_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Building:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{qrCodeData.data.building}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Date:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{qrCodeData.data.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Time:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {qrCodeData.data.start_time} - {qrCodeData.data.end_time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="p-8 bg-white rounded-xl inline-block shadow-lg">
                    <QRCodeSVG
                      id="reservation-qr-code"
                      value={JSON.stringify(qrCodeData.data)}
                      size={256}
                      level="M"
                      includeMargin={true}
                    />
                  </div>

                  {/* Instructions */}
                  <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                    Show this QR code at the room entrance to check in.
                    <br />
                    Check-in is available 15 minutes before your reservation start time.
                  </p>

                  {/* Download Button */}
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={downloadQRCode}
                    className="mt-4 gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download QR Code
                  </Button>
                </>
              ) : null}
            </div>
          )}

          {/* Scan QR Code Mode */}
          {mode === 'scan' && (
            <div className="text-center">
              {!scanning ? (
                <div className="py-12">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
                    <Scan className="w-12 h-12 text-white" />
                  </div>
                  <p className="mb-6 text-gray-600 dark:text-gray-400">
                    Click the button below to start scanning QR codes for check-in.
                  </p>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={startScanner}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Scan className="w-5 h-5" />
                    Start Camera
                  </Button>
                </div>
              ) : (
                <>
                  {/* Scanner Container */}
                  <div id="qr-reader" className="rounded-xl overflow-hidden mb-4"></div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Position the QR code within the frame to scan
                  </p>

                  <Button
                    variant="secondary"
                    size="md"
                    onClick={stopScanner}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Stop Scanning
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default QRCheckIn;
