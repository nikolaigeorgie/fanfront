"use client";

import { useEffect, useState } from "react";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function DashboardMap() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoading(false);
      },
      (error) => {
        setError(`Error getting location: ${error.message}`);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg bg-gray-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
          <p className="text-gray-600">Getting your location...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg bg-gray-100">
        <div className="text-center">
          <div className="mb-4 text-4xl">📍</div>
          <p className="mb-2 text-gray-600">Unable to get your location</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-96 overflow-hidden rounded-lg border bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Map Placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl">🗺️</div>
          <p className="mb-2 font-medium text-gray-700">
            Interactive Map Coming Soon
          </p>
          <p className="text-sm text-gray-600">
            Full Mapbox integration in development
          </p>
        </div>
      </div>

      {/* Location Info Overlay */}
      {location && (
        <div className="absolute top-4 left-4 rounded-lg border bg-white/90 p-4 shadow-sm backdrop-blur-sm">
          <h3 className="mb-2 flex items-center font-semibold text-gray-900">
            <span className="mr-2 text-green-500">📍</span>
            Your Location
          </h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Lat: {location.latitude.toFixed(6)}</p>
            <p>Lng: {location.longitude.toFixed(6)}</p>
            {location.accuracy && (
              <p>Accuracy: {Math.round(location.accuracy)}m</p>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="absolute right-4 bottom-4 space-y-2">
        <button className="block flex h-12 w-12 items-center justify-center rounded-full border bg-white shadow-lg transition-colors hover:bg-gray-50">
          <span className="text-xl">🎯</span>
        </button>
        <button className="block flex h-12 w-12 items-center justify-center rounded-full border bg-white shadow-lg transition-colors hover:bg-gray-50">
          <span className="text-xl">🔍</span>
        </button>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid h-full grid-cols-8 grid-rows-6">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="border border-gray-300"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
