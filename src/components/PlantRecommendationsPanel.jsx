import React, { useState, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import plantData from '../data/plantsData.json';
import PlantRecommendationCard from './PlantRecommendationCard';

const PlantRecommendationsPanel = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSoilType, setSelectedSoilType] = useState('');

  // Get unique soil types from all plants
  const soilTypes = useMemo(() => {
    const allSoilTypes = plantData.flatMap((plant) => plant.Soil_Types);
    return [...new Set(allSoilTypes)].sort();
  }, []);

  // Filter plants based on search term and soil type
  const filteredPlants = useMemo(() => {
    return plantData.filter((plant) => {
      const matchesSearch = plant.Plant_Name.toLowerCase().includes(
        searchTerm.toLowerCase(),
      );
      const matchesSoil = selectedSoilType
        ? plant.Soil_Types.includes(selectedSoilType)
        : true;
      return matchesSearch && matchesSoil;
    });
  }, [searchTerm, selectedSoilType]);

  return (
    <div
      className={`rounded-lg border shadow-sm overflow-hidden ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <div
        className={`p-4 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <h2
          className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}
        >
          Plant Recommendations
        </h2>
      </div>

      <div className="p-4">
        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              htmlFor="plant-search"
              className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Search by Plant Name
            </label>
            <input
              id="plant-search"
              type="text"
              placeholder="Enter plant name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-green-500 focus:border-green-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-green-500 focus:border-green-500'
              }`}
            />
          </div>

          <div>
            <label
              htmlFor="soil-filter"
              className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Filter by Soil Type
            </label>
            <select
              id="soil-filter"
              value={selectedSoilType}
              onChange={(e) => setSelectedSoilType(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white focus:ring-green-500 focus:border-green-500'
                  : 'bg-white border-gray-300 text-gray-900 focus:ring-green-500 focus:border-green-500'
              }`}
            >
              <option value="">All Soil Types</option>
              {soilTypes.map((soilType, index) => (
                <option key={index} value={soilType}>
                  {soilType}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Plant Cards - One Row with Scroll */}
        <div className="max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-700">
          {filteredPlants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPlants.map((plant, index) => (
                <div key={index} className="h-auto">
                  <PlantRecommendationCard plant={plant} />
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`rounded-lg border shadow-sm p-8 text-center ${
                isDark
                  ? 'bg-gray-800/50 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <svg
                className={`h-12 w-12 mx-auto ${isDark ? 'text-gray-600' : 'text-gray-300'} mb-4`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3
                className={`text-lg font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
              >
                No results found
              </h3>
              <p
                className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
              >
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlantRecommendationsPanel;
