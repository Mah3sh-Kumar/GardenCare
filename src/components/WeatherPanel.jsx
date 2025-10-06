import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import {
  FiSun,
  FiMoon,
  FiWind,
  FiDroplet,
  FiZap,
  FiCloud,
  FiCloudDrizzle,
  FiCloudRain,
  FiCloudSnow,
  FiSunrise,
  FiSunset,
  FiEye,
  FiSearch,
  FiMapPin,
  FiX,
  FiLoader,
  FiInfo,
} from 'react-icons/fi';
import PlantZonesPanel from './PlantZonesPanel';
import PlantRecommendationsPanel from './PlantRecommendationsPanel';
import { convertTemperature, getTemperatureUnitSymbol } from '../utils/temperatureUtils';
import { useTemperatureUnit } from '../hooks/useTemperatureUnit';

const WeatherIcon = ({ condition, ...props }) => {
  const conditionText = condition?.toLowerCase() || '';
  if (conditionText.includes('sunny') || conditionText.includes('clear'))
    return <FiSun {...props} />;
  if (conditionText.includes('partly cloudy'))
    return <FiCloud className="text-gray-400" {...props} />;
  if (conditionText.includes('cloudy') || conditionText.includes('overcast'))
    return <FiCloud {...props} />;
  if (conditionText.includes('rain') || conditionText.includes('drizzle'))
    return <FiCloudRain {...props} />;
  if (conditionText.includes('snow')) return <FiCloudSnow {...props} />;
  if (conditionText.includes('thunder') || conditionText.includes('storm'))
    return <FiZap {...props} />;
  if (conditionText.includes('fog') || conditionText.includes('mist'))
    return <FiCloud {...props} />;
  return <FiSun {...props} />;
};

const WeatherPanel = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const temperatureUnit = useTemperatureUnit();

  const [city, setCity] = useState('Boisar');
  const [weatherData, setWeatherData] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false); // New state for debug info toggle

  const apiKey =
    import.meta.env.VITE_WEATHER_API_KEY || '031c15b46712429b8cf162631251707';
  const baseUrl = 'https://api.weatherapi.com/v1';

  const timeoutRef = useRef(null);

  const fetchWeather = async (query) => {
    setLoading(true);
    setSearchLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${baseUrl}/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=3&aqi=yes`,
      );

      if (response.data.error) {
        setError(`Location "${query}" not found. Please try a different city.`);
        setWeatherData(null);
        setForecast([]);
        setLocation(null);
      } else {
        setWeatherData(response.data.current);
        setForecast(response.data.forecast.forecastday);
        setLocation(response.data.location);
      }
    } catch (err) {
      console.error('Error fetching weather:', err);
      setError('Unable to fetch weather data. Please try again later.');
      setWeatherData(null);
      setForecast([]);
      setLocation(null);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(city);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCityInputChange = useCallback(
    (e) => {
      setCity(e.target.value);
      if (error) setError(null);
    },
    [error],
  );

  const handleCitySearch = useCallback(() => {
    if (!city.trim() || city.length < 2) {
      setError('Please enter a valid city name (at least 2 characters).');
      return;
    }
    fetchWeather(city.trim());
  }, [city]);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        handleCitySearch();
      }
    },
    [handleCitySearch],
  );

  const handleLocationClick = useCallback(async () => {
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser.');
      return;
    }
    setLocationLoading(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setError(
        'Location request timed out. Please try again or enter a city manually.',
      );
      setLocationLoading(false);
    }, 10000);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        const { latitude, longitude } = position.coords;
        try {
          const reverseRes = await axios.get(
            `https://nominatim.openstreetmap.org/reverse`,
            {
              params: { lat: latitude, lon: longitude, format: 'json' },
              headers: { 'Accept-Language': 'en' },
              timeout: 5000,
            },
          );
          const cityName =
            reverseRes.data.address.city ||
            reverseRes.data.address.town ||
            reverseRes.data.address.village ||
            reverseRes.data.address.state ||
            `${latitude},${longitude}`;
          setCity(cityName);
          fetchWeather(cityName);
        } catch (geoErr) {
          console.error('Reverse geocoding failed:', geoErr);
          setError(
            'Failed to get city from location. Showing weather by coordinates.',
          );
          fetchWeather(`${latitude},${longitude}`);
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        console.error('Geolocation error:', err);
        let errorMessage =
          'Failed to get your location. Please ensure location services are enabled.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage =
              'Location access denied. Please allow location access in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage =
              'Location information unavailable. Please try again or enter a city manually.';
            break;
          case err.TIMEOUT:
            errorMessage =
              'Location request timed out. Please try again or enter a city manually.';
            break;
          default:
            errorMessage =
              'Failed to get your location. Please try again or enter a city manually.';
        }
        setError(errorMessage);
        setLocationLoading(false);
      },
    );
  }, []);

  const getUvIndexClass = (uv) => {
    if (uv <= 2) return 'text-green-500';
    if (uv <= 5) return 'text-yellow-500';
    if (uv <= 7) return 'text-orange-500';
    return 'text-red-500';
  };

  const getAirQualityClass = (aqi) => {
    if (aqi <= 2) return 'bg-green-500';
    if (aqi <= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div
        className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-3 sm:p-4 rounded-xl shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'} transition-all duration-300`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <div>
            <h2
              className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              Weather
            </h2>
            <p
              className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {location
                ? `${location.name}, ${location.country}`
                : 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                value={city}
                onChange={handleCityInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Search city..."
                className={`w-full sm:w-32 px-2.5 py-1.5 text-xs rounded-md border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-green-500/50 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
              {city && (
                <button
                  onClick={() => setCity('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>
            <button
              onClick={handleCitySearch}
              disabled={searchLoading}
              className="p-1.5 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors disabled:bg-gray-400"
            >
              <FiSearch size={14} />
            </button>
            <button
              onClick={handleLocationClick}
              disabled={locationLoading}
              className="p-1.5 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:bg-gray-400"
            >
              {locationLoading ? (
                <FiLoader className="animate-spin" size={14} />
              ) : (
                <FiMapPin size={14} />
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <FiLoader className="animate-spin mr-2" size={24} />
            <span className="text-sm">Loading weather...</span>
          </div>
        ) : error ? (
          <div
            className={`p-3 rounded-xl border text-center text-xs ${isDark ? 'bg-red-900/20 border-red-700 text-red-300' : 'bg-red-100 border-red-400 text-red-700'}`}
          >
            <p>{error}</p>
          </div>
        ) : (
          weatherData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Current Weather */}
              <div
                className={`p-3 rounded-xl flex flex-col justify-between ${isDark ? 'bg-gray-700/30' : 'bg-gray-50'}`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p
                        className={`font-bold text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        {convertTemperature(weatherData.temp_c, 'celsius', temperatureUnit).toFixed(0)}{getTemperatureUnitSymbol(temperatureUnit)}
                      </p>
                      <p
                        className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                      >
                        Feels like {convertTemperature(weatherData.feelslike_c, 'celsius', temperatureUnit).toFixed(0)}{getTemperatureUnitSymbol(temperatureUnit)}
                      </p>
                    </div>
                    <div className="text-yellow-400">
                      <WeatherIcon
                        condition={weatherData.condition.text}
                        size={40}
                      />
                    </div>
                  </div>
                  <p
                    className={`mt-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    {weatherData.condition.text}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-center">
                  <div className="p-2 rounded-md bg-white/10">
                    <p
                      className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      Humidity
                    </p>
                    <p
                      className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}
                    >
                      {weatherData.humidity}%
                    </p>
                  </div>
                  <div className="p-2 rounded-md bg-white/10">
                    <p
                      className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      Wind
                    </p>
                    <p
                      className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}
                    >
                      {weatherData.wind_kph} km/h
                    </p>
                  </div>
                  <div className="p-2 rounded-md bg-white/10">
                    <p
                      className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      UV Index
                    </p>
                    <p
                      className={`font-bold text-sm ${getUvIndexClass(weatherData.uv)}`}
                    >
                      {weatherData.uv}
                    </p>
                  </div>
                  <div className="p-2 rounded-md bg-white/10">
                    <p
                      className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      Pressure
                    </p>
                    <p
                      className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}
                    >
                      {weatherData.pressure_mb} mb
                    </p>
                  </div>
                </div>
              </div>

              {/* 3-Day Forecast & Additional Info */}
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-xl ${isDark ? 'bg-gray-700/30' : 'bg-gray-50'}`}
                >
                  <h3
                    className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    3-Day Forecast
                  </h3>
                  <div className="space-y-2">
                    {forecast.map((day, index) => (
                      <div
                        key={day.date}
                        className="flex items-center justify-between"
                      >
                        <p
                          className={`w-1/3 text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                        >
                          {index === 0
                            ? 'Today'
                            : new Date(day.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                              })}
                        </p>
                        <div className="flex items-center justify-center w-1/3">
                          <WeatherIcon
                            condition={day.day.condition.text}
                            size={20}
                            className="text-yellow-400"
                          />
                        </div>
                        <div className="flex items-center justify-end w-1/3 space-x-2">
                          <span
                            className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                          >
                            {convertTemperature(day.day.mintemp_c, 'celsius', temperatureUnit).toFixed(0)}{getTemperatureUnitSymbol(temperatureUnit)}
                          </span>
                          <span
                            className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                          >
                            {convertTemperature(day.day.maxtemp_c, 'celsius', temperatureUnit).toFixed(0)}{getTemperatureUnitSymbol(temperatureUnit)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Weather Info */}
                <div
                  className={`p-3 rounded-xl ${isDark ? 'bg-gray-700/30' : 'bg-gray-50'}`}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-md bg-white/10">
                      <p
                        className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                      >
                        Visibility
                      </p>
                      <p
                        className={`font-bold text-xs ${isDark ? 'text-white' : 'text-gray-800'}`}
                      >
                        {weatherData.vis_km} km
                      </p>
                    </div>
                    <div className="p-2 rounded-md bg-white/10">
                      <p
                        className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                      >
                        Gusts
                      </p>
                      <p
                        className={`font-bold text-xs ${isDark ? 'text-white' : 'text-gray-800'}`}
                      >
                        {weatherData.gust_kph} km/h
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiSunrise
                        size={14}
                        className={`${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}
                      />
                      <div>
                        <p
                          className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                        >
                          Sunrise
                        </p>
                        <p
                          className={`font-bold text-xs ${isDark ? 'text-white' : 'text-gray-800'}`}
                        >
                          {weatherData.sunrise || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiSunset
                        size={14}
                        className={`${isDark ? 'text-orange-400' : 'text-orange-600'}`}
                      />
                      <div>
                        <p
                          className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                        >
                          Sunset
                        </p>
                        <p
                          className={`font-bold text-xs ${isDark ? 'text-white' : 'text-gray-800'}`}
                        >
                          {weatherData.sunset || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default WeatherPanel;
