'use client'

import { useCallback, useRef } from 'react'
import { GoogleMap, MarkerF } from '@react-google-maps/api'

// Default center: Asunción, Paraguay
const DEFAULT_CENTER = { lat: -25.2637, lng: -57.5759 }
const DEFAULT_ZOOM = 13
const MARKER_ZOOM = 16

const mapContainerStyle = {
  width: '100%',
  height: '250px',
}

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
}

interface MapInternalProps {
  lat: number | null
  lng: number | null
  onPositionChange: (lat: number, lng: number) => void
}

export default function AddressMapInternal({ lat, lng, onPositionChange }: MapInternalProps) {
  const callbackRef = useRef(onPositionChange)
  callbackRef.current = onPositionChange
  const mapRef = useRef<google.maps.Map | null>(null)

  const center = lat !== null && lng !== null ? { lat, lng } : DEFAULT_CENTER
  const zoom = lat !== null && lng !== null ? MARKER_ZOOM : DEFAULT_ZOOM

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      callbackRef.current(e.latLng.lat(), e.latLng.lng())
    }
  }, [])

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      callbackRef.current(e.latLng.lat(), e.latLng.lng())
    }
  }, [])

  // Fly to new position when it changes
  if (mapRef.current && lat !== null && lng !== null) {
    const currentCenter = mapRef.current.getCenter()
    if (currentCenter) {
      const dist = Math.abs(currentCenter.lat() - lat) + Math.abs(currentCenter.lng() - lng)
      if (dist > 0.0001) {
        mapRef.current.panTo({ lat, lng })
        const currentZoom = mapRef.current.getZoom() || DEFAULT_ZOOM
        if (currentZoom < MARKER_ZOOM) {
          mapRef.current.setZoom(MARKER_ZOOM)
        }
      }
    }
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      options={mapOptions}
      onLoad={onLoad}
      onClick={handleMapClick}
    >
      {lat !== null && lng !== null && (
        <MarkerF
          position={{ lat, lng }}
          draggable={true}
          onDragEnd={handleMarkerDragEnd}
        />
      )}
    </GoogleMap>
  )
}
