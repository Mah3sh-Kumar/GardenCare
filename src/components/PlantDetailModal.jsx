import React from 'react';
import Modal from './ui/Modal';
import { useTheme } from '../contexts/ThemeContext';

const PlantDetailModal = ({ plant, isOpen, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!plant) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={plant.Plant_Name} size="lg">
      <div className="space-y-6">
        {/* Scientific Name and Category */}
        <div className="flex flex-wrap items-center gap-4">
          <p className={`text-lg italic ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {plant.Scientific_Name}
          </p>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isDark
                ? 'bg-green-900/30 text-green-300 border border-green-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {plant.Category}
          </span>
        </div>

        {/* Plant Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Soil Types */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Soil Types
            </h3>
            <div className="flex flex-wrap gap-2">
              {plant.Soil_Types.map((soil, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 rounded-full text-sm ${
                    isDark
                      ? 'bg-gray-600 text-gray-200'
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  {soil}
                </span>
              ))}
            </div>
          </div>

          {/* Water Requirement */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Water Requirement
            </h3>
            <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
              {plant.Water_Requirement}
            </p>
          </div>

          {/* Humidity Range */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Humidity Range
            </h3>
            <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
              {plant.Humidity_Range_Percent}
            </p>
          </div>

          {/* Temperature Range */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Temperature Range
            </h3>
            <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
              {plant.Temperature_Range_Celsius}
            </p>
          </div>

          {/* Fertilizer Needs */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Fertilizer Needs
            </h3>
            <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
              {plant.Fertilizer_Needs}
            </p>
          </div>
        </div>

        {/* Additional Information */}
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
          <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Care Tips
          </h3>
          <ul className={`space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Ensure proper drainage to prevent root rot</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Monitor soil moisture levels regularly</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Apply organic fertilizer during growing season</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Prune regularly to promote healthy growth</span>
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default PlantDetailModal;