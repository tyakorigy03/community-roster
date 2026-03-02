import React, { useEffect, useState, useRef, memo } from 'react';

const locationIQ_token = 'pk.7e6d24e4df4e8624f46ce9d76081ed31';
// shared cache across ALL component instances
const addressCache = new Map();
function LocationIQ({ lat, lon }) {
  const [locationAddress, setLocationAddress] = useState('');
  const [showMap, setShowMap] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!lat || !lon) return;
    const cacheKey = `${lat},${lon}`;
    // 🔹 already fetched globally
    if (addressCache.has(cacheKey)) {
      setLocationAddress(addressCache.get(cacheKey));
      return;
    }

    // 🔹 prevent double-fetch (StrictMode)
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const resp = await fetch(
          `https://us1.locationiq.com/v1/reverse?key=${locationIQ_token}&lat=${lat}&lon=${lon}&format=json`
        );

        if (!resp.ok) {
          if (resp.status === 429) {
            setLocationAddress('Rate limit exceeded');
          }
          return;
        }

        const data = await resp.json();
        addressCache.set(cacheKey, data?.display_name || 'Unknown location');
        setLocationAddress(data?.display_name || 'Unknown location');
      } catch (err) {
        console.error('LocationIQ error:', err);
      }
    })();
  }, [lat, lon]);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <p><strong>Address:</strong> {locationAddress || 'Loading...'}</p>

      <button
        onClick={() => setShowMap(v => !v)}
        style={{
          padding: '8px 16px',
          marginBottom: '10px',
          cursor: 'pointer',
          borderRadius: '6px',
          border: '1px solid #ccc',
          background: showMap ? '#f0f0f0' : '#fff',
        }}
      >
        {showMap ? 'Hide Map' : 'Show Map'}
      </button>

      {showMap && (
        <iframe
          title="location-map"
          width="100%"
          height="500"
          style={{ border: 0 }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01}%2C${lat-0.01}%2C${lon+0.01}%2C${lat+0.01}&layer=mapnik&marker=${lat}%2C${lon}`}
          allowFullScreen
        />
      )}
    </div>
  );
}

// 🔹 prevents re-render if lat/lon are the same
export default memo(LocationIQ, (prev, next) =>
  prev.lat === next.lat && prev.lon === next.lon
);
