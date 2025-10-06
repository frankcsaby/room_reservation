import React, { useState, useMemo } from 'react';
import { Filter, X, Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

const AdvancedFilters = ({ rooms, onFilterChange, initialFilters = {} }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    capacity: initialFilters.capacity || '',
    building: initialFilters.building || '',
    floor: initialFilters.floor || '',
    status: initialFilters.status || 'all',
    amenities: initialFilters.amenities || [],
    ...initialFilters
  });

  // Extract unique values from rooms
  const buildings = useMemo(() =>
    [...new Set(rooms.map(room => room.building).filter(Boolean))].sort(),
    [rooms]
  );

  const floors = useMemo(() =>
    [...new Set(rooms.map(room => room.floor).filter(Boolean))].sort((a, b) => a - b),
    [rooms]
  );

  // Extract all unique amenities from rooms
  const allAmenities = useMemo(() => {
    const amenitySet = new Set();
    rooms.forEach(room => {
      if (Array.isArray(room.amenities)) {
        room.amenities.forEach(amenity => {
          if (typeof amenity === 'string') {
            amenitySet.add(amenity);
          }
        });
      }
    });
    return [...amenitySet].sort();
  }, [rooms]);

  // Update filters and notify parent
  const updateFilters = (newFilters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Handle amenity toggle
  const toggleAmenity = (amenity) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];

    updateFilters({ ...filters, amenities: newAmenities });
  };

  // Remove a specific filter chip
  const removeFilter = (filterType, value = null) => {
    const newFilters = { ...filters };

    if (filterType === 'amenities' && value) {
      newFilters.amenities = filters.amenities.filter(a => a !== value);
    } else if (filterType === 'amenities') {
      newFilters.amenities = [];
    } else {
      newFilters[filterType] = filterType === 'status' ? 'all' : '';
    }

    updateFilters(newFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    const clearedFilters = {
      capacity: '',
      building: '',
      floor: '',
      status: 'all',
      amenities: []
    };
    setSearchQuery('');
    updateFilters(clearedFilters);
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.capacity ||
    filters.building ||
    filters.floor ||
    filters.status !== 'all' ||
    filters.amenities.length > 0 ||
    searchQuery;

  // Get active filter count
  const activeFilterCount = [
    filters.capacity,
    filters.building,
    filters.floor,
    filters.status !== 'all' && filters.status,
    ...filters.amenities
  ].filter(Boolean).length;

  // Filter amenities by search query
  const filteredAmenities = useMemo(() => {
    if (!searchQuery) return allAmenities;
    return allAmenities.filter(amenity =>
      amenity.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allAmenities, searchQuery]);

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Advanced Filters
          </h2>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Clear All
            </Button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronDown
              className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          {filters.building && (
            <FilterChip
              label={`Building: ${filters.building}`}
              onRemove={() => removeFilter('building')}
            />
          )}
          {filters.floor && (
            <FilterChip
              label={`Floor: ${filters.floor}`}
              onRemove={() => removeFilter('floor')}
            />
          )}
          {filters.capacity && (
            <FilterChip
              label={`Min Capacity: ${filters.capacity}`}
              onRemove={() => removeFilter('capacity')}
            />
          )}
          {filters.status !== 'all' && (
            <FilterChip
              label={`Status: ${filters.status}`}
              onRemove={() => removeFilter('status')}
            />
          )}
          {filters.amenities.map(amenity => (
            <FilterChip
              key={amenity}
              label={amenity}
              onRemove={() => removeFilter('amenities', amenity)}
            />
          ))}
        </div>
      )}

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="space-y-6 animate-in slide-in-from-top duration-200">
          {/* Basic Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Building */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Building
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                value={filters.building}
                onChange={e => updateFilters({ ...filters, building: e.target.value })}
              >
                <option value="">All Buildings</option>
                {buildings.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Floor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Floor
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                value={filters.floor}
                onChange={e => updateFilters({ ...filters, floor: e.target.value })}
              >
                <option value="">All Floors</option>
                {floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
              </select>
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Capacity
              </label>
              <input
                type="number"
                min="1"
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                value={filters.capacity}
                onChange={e => updateFilters({ ...filters, capacity: e.target.value })}
                placeholder="Any"
              />
            </div>

            {/* Availability Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Availability
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                value={filters.status}
                onChange={e => updateFilters({ ...filters, status: e.target.value })}
              >
                <option value="all">All Rooms</option>
                <option value="free">Available Only</option>
                <option value="occupied">Occupied Only</option>
              </select>
            </div>
          </div>

          {/* Amenities Section */}
          {allAmenities.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amenities
                </label>
                {filters.amenities.length > 0 && (
                  <button
                    onClick={() => removeFilter('amenities')}
                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
                  >
                    Clear ({filters.amenities.length})
                  </button>
                )}
              </div>

              {/* Search Amenities */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                  placeholder="Search amenities..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Amenity Pills */}
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                {filteredAmenities.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 w-full text-center py-4">
                    No amenities found
                  </p>
                ) : (
                  filteredAmenities.map(amenity => {
                    const isSelected = filters.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400'
                        }`}
                      >
                        {amenity}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Quick Suggestions */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Filters:</p>
            <div className="flex flex-wrap gap-2">
              <QuickFilterButton
                label="Large Rooms (20+)"
                onClick={() => updateFilters({ ...filters, capacity: '20' })}
              />
              <QuickFilterButton
                label="Available Now"
                onClick={() => updateFilters({ ...filters, status: 'free' })}
              />
              {allAmenities.includes('Projector') && (
                <QuickFilterButton
                  label="With Projector"
                  onClick={() => updateFilters({ ...filters, amenities: ['Projector'] })}
                />
              )}
              {allAmenities.includes('Whiteboard') && (
                <QuickFilterButton
                  label="With Whiteboard"
                  onClick={() => updateFilters({ ...filters, amenities: ['Whiteboard'] })}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// Filter Chip Component
const FilterChip = ({ label, onRemove }) => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium animate-in fade-in zoom-in duration-200">
    <span>{label}</span>
    <button
      onClick={onRemove}
      className="hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded-full p-0.5 transition-colors"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
);

// Quick Filter Button
const QuickFilterButton = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
  >
    {label}
  </button>
);

export default AdvancedFilters;
