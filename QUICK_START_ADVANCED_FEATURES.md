# Quick Start: Advanced Features

This guide will help you quickly get started with the newly implemented advanced features.

## Prerequisites

Ensure you have:
- Node.js 22+ installed
- Python virtual environment activated
- PostgreSQL running
- Redis running (optional, for WebSocket)

## Installation

### 1. Install Backend Dependencies

```bash
cd backend
source .venv/bin/activate
pip install qrcode[pil]
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
# qrcode.react, html5-qrcode, workbox packages already added
```

## Feature 1: Advanced Search Filters

### Using Advanced Filters

1. Navigate to "Browse Rooms"
2. The filter panel is at the top
3. Try these filters:
   - **Building**: Select a specific building
   - **Floor**: Choose floor number
   - **Capacity**: Set minimum capacity
   - **Amenities**: Search and select amenities (e.g., "Projector")
   - **Quick Filters**: Click pre-configured filters

### Integration (if needed)

The `AdvancedFilters` component is already created. To integrate:

```jsx
import AdvancedFilters from './AdvancedFilters';

// Replace basic filter card with:
<AdvancedFilters
  rooms={rooms}
  onFilterChange={setFilters}
  initialFilters={filters}
/>
```

## Feature 2: QR Code Check-in

### Generating QR Codes

1. Go to "My Reservations"
2. Find a confirmed reservation
3. Click "Show QR Code" button
4. Download or display the QR code

### Scanning QR Codes

1. Click "Scan QR Code" tab in the modal
2. Click "Start Camera"
3. Grant camera permissions
4. Point at a reservation QR code
5. Check-in will happen automatically

### Check-in Rules

- Check-in window: 15 minutes before to 15 minutes after start time
- Only works for confirmed reservations
- Only works on the reservation date

### API Endpoints

```bash
# Generate QR code
GET /api/reservations/{id}/qr/

# Check in
POST /api/reservations/{id}/check-in/
```

## Feature 3: PWA Capabilities

### Installing as PWA

#### Desktop (Chrome/Edge)
1. Look for install icon in address bar
2. OR wait for install prompt (appears after 3 seconds)
3. Click "Install" button
4. App will be installed to your system

#### Mobile (Android)
1. Tap menu (⋮)
2. Tap "Add to Home Screen"
3. Confirm installation
4. Open from app drawer

#### Mobile (iOS)
1. Tap Share button
2. Tap "Add to Home Screen"
3. Confirm
4. Open from home screen

### Testing Offline Mode

1. **Install the PWA first**
2. Open the app
3. Browse rooms (this caches data)
4. Turn off WiFi or enable Airplane Mode
5. Refresh the app
6. You should see cached content
7. Turn WiFi back on - app auto-reconnects

### Service Worker Management

#### Check Service Worker Status
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Service Workers"
4. Verify it's "activated and running"

#### Clear Cache
```javascript
// In browser console
caches.keys().then(keys => keys.forEach(key => caches.delete(key)))
```

#### Unregister Service Worker
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs =>
  regs.forEach(reg => reg.unregister())
)
```

## Testing Checklist

### Advanced Filters
- [ ] Filter by building works
- [ ] Filter by floor works
- [ ] Filter by capacity works
- [ ] Amenity search works
- [ ] Multiple amenities work (AND logic)
- [ ] Filter chips appear and remove correctly
- [ ] "Clear All" removes all filters
- [ ] Quick filters work

### QR Code System
- [ ] QR code generates for reservation
- [ ] QR code downloads as PNG
- [ ] Camera scanner starts
- [ ] QR code scans successfully
- [ ] Check-in succeeds within time window
- [ ] Check-in fails outside time window
- [ ] Error messages are clear

### PWA
- [ ] Install prompt appears
- [ ] App installs successfully
- [ ] App opens in standalone mode
- [ ] Service worker registers
- [ ] Cache is created
- [ ] Offline mode works
- [ ] Auto-reconnect works
- [ ] Update prompt works

## Common Issues

### QR Code: "Failed to generate"
```bash
# Reinstall QR libraries
cd backend
source .venv/bin/activate
pip uninstall qrcode Pillow
pip install qrcode[pil]
```

### Camera: "Permission denied"
1. Check browser permissions
2. Use HTTPS (or localhost)
3. Try different browser
4. Check if camera is in use

### PWA: "Service worker failed"
1. Use HTTPS (localhost is OK)
2. Clear cache: Ctrl+Shift+Delete
3. Try incognito mode
4. Check `/public/service-worker.js` exists

### Offline: "Not working offline"
1. Visit pages while online first (to cache)
2. Check service worker is active
3. Check cache in DevTools
4. Install as PWA for better offline support

## File Structure

### New Backend Files
```
backend/api/
├── views.py (added QR endpoints)
└── urls.py (added QR routes)
```

### New Frontend Files
```
frontend/
├── public/
│   ├── manifest.json (PWA config)
│   ├── service-worker.js (offline support)
│   └── offline.html (fallback page)
├── src/components/
│   ├── AdvancedFilters.jsx (filter component)
│   ├── QRCheckIn.jsx (QR display + scanner)
│   └── PWAInstallPrompt.jsx (install UI)
└── index.html (updated with PWA tags)
```

## Next Steps

1. **Generate PWA Icons**
   ```bash
   # Use a tool to generate all icon sizes
   npx pwa-asset-generator logo.svg ./public --icon-only
   ```

2. **Test on Mobile**
   - Use ngrok or similar to test on real devices
   - Test camera permissions
   - Test PWA installation

3. **Enable HTTPS** (for production)
   - PWA requires HTTPS
   - Use Let's Encrypt or similar
   - Configure nginx/Apache

4. **Monitor Performance**
   - Run Lighthouse audit
   - Check bundle size
   - Monitor cache hit rate

## Resources

- **Full Documentation**: See `ADVANCED_FEATURES_IMPLEMENTATION.md`
- **Troubleshooting**: Check documentation for detailed solutions
- **Icons**: Use [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- **Testing**: Use Chrome DevTools Lighthouse for PWA audit

## Support

If you encounter issues:
1. Check the troubleshooting section in the full documentation
2. Verify all dependencies are installed
3. Check browser console for errors
4. Test in incognito mode
5. Try a different browser

---

**Status**: ✅ All features implemented and ready to use
**Date**: 2025-10-06
