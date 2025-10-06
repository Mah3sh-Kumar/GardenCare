import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const PlantRecommendationCard = ({ plant, onClick }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!plant) return null;

  return (
    <div
      className={`rounded-lg border shadow-sm overflow-hidden h-full flex flex-col cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
      onClick={() => onClick && onClick(plant)}
    >
      <div
        className={`p-4 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <h3
          className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}
        >
          {plant.Plant_Name}
        </h3>
        <p
          className={`text-sm italic ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
        >
          {plant.Scientific_Name}
        </p>
        <span
          className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
            isDark
              ? 'bg-green-900/30 text-green-300 border border-green-800'
              : 'bg-green-100 text-green-800'
          }`}
        >
          {plant.Category}
        </span>
      </div>

      <div className="p-4 flex-grow">
        <div className="space-y-3">
          <div>
            <h4
              className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Soil Types
            </h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {plant.Soil_Types.map((soil, index) => (
                <span
                  key={index}
                  className={`text-xs px-2 py-1 rounded ${
                    isDark
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {soil}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4
              className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Water Requirement
            </h4>
            <p
              className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {plant.Water_Requirement}
            </p>
          </div>

          <div>
            <h4
              className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Humidity Range
            </h4>
            <p
              className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {plant.Humidity_Range_Percent}
            </p>
          </div>

          <div>
            <h4
              className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Temperature Range
            </h4>
            <p
              className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {plant.Temperature_Range_Celsius}
            </p>
          </div>

          <div>
            <h4
              className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Fertilizer Needs
            </h4>
            <p
              className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {plant.Fertilizer_Needs}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlantRecommendationCard;