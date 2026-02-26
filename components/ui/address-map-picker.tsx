'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Search, Loader2, LocateFixed, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLoadScript } from '@react-google-maps/api'
import dynamic from 'next/dynamic'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
const LIBRARIES: ('places')[] = ['places']

// Lazy load the map component
const MapComponent = dynamic(() => import('./address-map-internal'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[250px] bg-gray-100 rounded-lg flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  ),
})

export interface AddressMapPickerValue {
  address: string
  city: string
  department: string
  neighborhood: string
  lat: number | null
  lng: number | null
}

interface AddressMapPickerProps {
  value: AddressMapPickerValue
  onChange: (value: Partial<AddressMapPickerValue>) => void
  required?: boolean
  accentColor?: string
}

// Departamentos de Paraguay para mapear desde Google
const DEPARTMENT_MAP: Record<string, string> = {
  'asunción': 'Asunción',
  'asuncion': 'Asunción',
  'distrito capital': 'Asunción',
  'capital': 'Asunción',
  'central': 'Central',
  'departamento central': 'Central',
  'departamento de central': 'Central',
  'alto paraná': 'Alto Paraná',
  'alto parana': 'Alto Paraná',
  'alto paraguay': 'Alto Paraguay',
  'amambay': 'Amambay',
  'boquerón': 'Boquerón',
  'boqueron': 'Boquerón',
  'caaguazú': 'Caaguazú',
  'caaguazu': 'Caaguazú',
  'caazapá': 'Caazapá',
  'caazapa': 'Caazapá',
  'canindeyú': 'Canindeyú',
  'canindeyu': 'Canindeyú',
  'concepción': 'Concepción',
  'concepcion': 'Concepción',
  'cordillera': 'Cordillera',
  'guairá': 'Guairá',
  'guaira': 'Guairá',
  'itapúa': 'Itapúa',
  'itapua': 'Itapúa',
  'misiones': 'Misiones',
  'ñeembucú': 'Ñeembucú',
  'neembucu': 'Ñeembucú',
  'paraguarí': 'Paraguarí',
  'paraguari': 'Paraguarí',
  'presidente hayes': 'Presidente Hayes',
  'san pedro': 'San Pedro',
}

function mapDepartment(adminArea: string | undefined): string {
  if (!adminArea) return ''
  const normalized = adminArea.toLowerCase().trim()
    .replace(/^departamento\s+de\s+/i, '')
    .replace(/^departamento\s+/i, '')
  if (DEPARTMENT_MAP[normalized]) return DEPARTMENT_MAP[normalized]
  // Partial match
  for (const [key, value] of Object.entries(DEPARTMENT_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return value
  }
  return adminArea
}

/**
 * Search for a component type across multiple geocoder results.
 * Google often puts neighborhood info in less-specific results.
 */
function findComponentInResults(
  results: google.maps.GeocoderResult[],
  types: string[]
): string {
  for (const result of results) {
    for (const type of types) {
      const comp = result.address_components.find((c) => c.types.includes(type))
      if (comp) return comp.long_name
    }
  }
  return ''
}

/**
 * Extract address components from Google Geocoding results.
 * Uses the first result for address/city/department, and searches
 * across all results for neighborhood (barrio).
 */
function extractFromGoogleResults(results: google.maps.GeocoderResult[]): {
  address: string
  city: string
  department: string
  neighborhood: string
} {
  const primary = results[0]
  const components = primary.address_components
  const get = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name || ''

  const streetNumber = get('street_number')
  const route = get('route')

  // Search neighborhood across ALL results - Google puts it in less specific ones
  const neighborhood = findComponentInResults(results, [
    'neighborhood',
    'sublocality_level_1',
    'sublocality',
    'administrative_area_level_3',
  ])

  const city =
    get('locality') || get('administrative_area_level_2') || ''
  const adminArea1 = get('administrative_area_level_1')
  const department = mapDepartment(adminArea1)

  // Build address: route + number
  const address =
    [route, streetNumber].filter(Boolean).join(' ') ||
    primary.formatted_address.split(',')[0] ||
    ''

  return { address, city, department, neighborhood }
}

export function AddressMapPicker({
  value,
  onChange,
  required,
  accentColor = '#e7243f',
}: AddressMapPickerProps) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Ref for latest onChange to avoid stale closures in async callbacks
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Initialize Google services when loaded
  useEffect(() => {
    if (isLoaded && typeof google !== 'undefined') {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService()
      geocoderRef.current = new google.maps.Geocoder()
      // PlacesService needs a DOM element (can be a hidden div)
      const div = document.createElement('div')
      placesServiceRef.current = new google.maps.places.PlacesService(div)
    }
  }, [isLoaded])

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search with Google Places Autocomplete
  const searchAddress = useCallback(
    (query: string) => {
      if (!autocompleteServiceRef.current || query.length < 3) {
        setSuggestions([])
        return
      }

      setIsSearching(true)
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'py' },
          types: ['address'],
        },
        (predictions, status) => {
          setIsSearching(false)
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            setSuggestions(predictions)
            setShowSuggestions(predictions.length > 0)
          } else {
            setSuggestions([])
          }
        }
      )
    },
    []
  )

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(query)
    }, 300)
  }

  // When user selects a suggestion, get full place details
  const handleSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['address_components', 'formatted_address', 'geometry'],
      },
      (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location &&
          place.address_components
        ) {
          const result = {
            address_components: place.address_components,
            formatted_address: place.formatted_address || '',
          } as google.maps.GeocoderResult
          const extracted = extractFromGoogleResults([result])

          onChangeRef.current({
            ...extracted,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          })
        }
      }
    )

    setSearchQuery('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  // Reverse geocode when marker is moved or map is clicked
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    // Set position immediately
    onChangeRef.current({ lat, lng })

    if (!geocoderRef.current) return

    try {
      const response = await geocoderRef.current.geocode({
        location: { lat, lng },
      })

      if (response.results && response.results.length > 0) {
        const extracted = extractFromGoogleResults(response.results)
        onChangeRef.current({
          ...extracted,
          lat,
          lng,
        })
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error)
    }
  }, [])

  const handleLocateMe = () => {
    if (!navigator.geolocation) return

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleMapClick(position.coords.latitude, position.coords.longitude)
        setIsLocating(false)
      },
      (error) => {
        console.error('Geolocation error:', error)
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  if (!isLoaded) {
    return (
      <div className="space-y-3">
        <div className="w-full h-10 bg-gray-100 rounded-md animate-pulse" />
        <div className="w-full h-[250px] bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="w-full h-10 bg-gray-100 rounded-md animate-pulse" />
          <div className="w-full h-10 bg-gray-100 rounded-md animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div ref={containerRef} className="relative">
        <Label htmlFor="address-search" className="flex items-center gap-1.5 mb-1.5">
          <Search className="h-3.5 w-3.5" />
          Buscar dirección
        </Label>
        <div className="relative">
          <Input
            id="address-search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Escribí tu dirección para buscar..."
            className="pr-10"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          )}
          {searchQuery && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSuggestions([])
                setShowSuggestions(false)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handleSelectSuggestion(prediction)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-start gap-2 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <MapPin
                  className="h-4 w-4 mt-0.5 shrink-0"
                  style={{ color: accentColor }}
                />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-800 block truncate">
                    {prediction.structured_formatting.main_text}
                  </span>
                  <span className="text-xs text-gray-500 block truncate">
                    {prediction.structured_formatting.secondary_text}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border border-gray-200">
        <MapComponent
          lat={value.lat}
          lng={value.lng}
          onPositionChange={handleMapClick}
        />

        {/* Locate me button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="absolute bottom-3 right-3 z-10 bg-white rounded-lg shadow-md p-2 hover:bg-gray-50 transition-colors border border-gray-200"
          title="Usar mi ubicación actual"
        >
          {isLocating ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          ) : (
            <LocateFixed className="h-5 w-5" style={{ color: accentColor }} />
          )}
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Podés mover el marcador en el mapa para ajustar tu ubicación exacta.
      </p>

      {/* Address fields */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="address-field">
            Dirección{' '}
            {required && <span style={{ color: accentColor }}>*</span>}
          </Label>
          <Input
            id="address-field"
            value={value.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Calle y número"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="city-field">
              Ciudad{' '}
              {required && <span style={{ color: accentColor }}>*</span>}
            </Label>
            <Input
              id="city-field"
              value={value.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="Asunción"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="neighborhood-field">Barrio</Label>
            <Input
              id="neighborhood-field"
              value={value.neighborhood}
              onChange={(e) => onChange({ neighborhood: e.target.value })}
              placeholder="Tu barrio"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
