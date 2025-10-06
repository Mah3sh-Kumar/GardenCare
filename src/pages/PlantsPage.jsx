import React, { useState, useEffect } from 'react';
import { supabase, getCurrentUser } from '../lib/supabaseClient';
import { DeviceService } from '../services/deviceService';
import realtimeManager from '../lib/realtimeConfig';

const PlantsPage = () => {
  const [zones, setZones] = useState([]);
  const [devices, setDevices] = useState([]); // Add devices state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showDeviceAssignment, setShowDeviceAssignment] = useState(false); // For device assignment modal
  const [selectedZoneForAssignment, setSelectedZoneForAssignment] = useState(null); // Track which zone we're assigning devices to
  const [selectedDevicesForAssignment, setSelectedDevicesForAssignment] = useState([]); // Track selected devices
  const [newZone, setNewZone] = useState({
    name: '',
    description: '',
    soil_type: 'Loamy',
    moisture_threshold: 30,
  });

  useEffect(() => {
    loadZones();
    loadDevices(); // Load devices as well
    
    // Subscribe to real-time zone updates
    const zoneChannel = realtimeManager.subscribeZones((payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        // Reload zones to get updated data
        loadZones();
      }
    });

    // Subscribe to real-time device updates
    const deviceChannel = realtimeManager.subscribeDeviceStatus((payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        // Reload devices to get updated data
        loadDevices();
      }
    });

    return () => {
      // Unsubscribe when component unmounts
      if (zoneChannel) {
        realtimeManager.unsubscribe('zones');
      }
      if (deviceChannel) {
        realtimeManager.unsubscribe('device_status');
      }
    };
  }, []);

  const loadZones = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setZones(data || []);
    } catch (err) {
      console.error('Error loading zones:', err);
      setError('Failed to load plant zones. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setDevices(data || []);
    } catch (err) {
      console.error('Error loading devices:', err);
    }
  };

  const handleRefresh = () => {
    loadZones();
    loadDevices();
  };

  const handleAddZone = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.user) {
      setError('User not logged in');
      return;
    }
    const user = currentUser.user;

    if (!newZone.name.trim()) {
      setError('Zone name is required');
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('zones')
        .insert([
          {
            user_id: user.id,
            name: newZone.name,
            description: newZone.description,
            soil_type: newZone.soil_type,
            moisture_threshold: newZone.moisture_threshold,
            pump_on: false, // Initialize pump_on status
          },
        ])
        .select();

      if (error) throw error;
      setZones((prev) => [...prev, ...data]);
      setNewZone({
        name: '',
        description: '',
        soil_type: 'Loamy',
        moisture_threshold: 30,
      });
    } catch (err) {
      console.error('Add zone failed:', err.message);
      setError('Failed to add plant zone.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteZone = async (id) => {
    try {
      const { error } = await supabase.from('zones').delete().eq('id', id);
      if (error) throw error;
      setZones((prev) => prev.filter((z) => z.id !== id));
    } catch (err) {
      console.error('Delete failed:', err.message);
      setError('Failed to delete zone.');
    }
  };

  // Function to open device assignment modal
  const openDeviceAssignment = (zone) => {
    setSelectedZoneForAssignment(zone);
    // Pre-select devices that are already assigned to this zone
    const assignedDeviceIds = devices
      .filter(device => device.zone_id === zone.id)
      .map(device => device.id);
    setSelectedDevicesForAssignment(assignedDeviceIds);
    setShowDeviceAssignment(true);
  };

  // Function to handle device selection in assignment modal
  const toggleDeviceSelection = (deviceId) => {
    setSelectedDevicesForAssignment(prev => {
      if (prev.includes(deviceId)) {
        return prev.filter(id => id !== deviceId);
      } else {
        return [...prev, deviceId];
      }
    });
  };

  // Function to save device assignments
  const saveDeviceAssignments = async () => {
    try {
      setError(null);
      
      // Update each device's zone assignment
      const updatePromises = devices.map(device => {
        const shouldBeAssigned = selectedDevicesForAssignment.includes(device.id);
        const isCurrentlyAssigned = device.zone_id === selectedZoneForAssignment.id;
        
        // Only update if assignment status has changed
        if (shouldBeAssigned && !isCurrentlyAssigned) {
          // Assign device to this zone
          return DeviceService.updateDeviceZone(device.id, selectedZoneForAssignment.id);
        } else if (!shouldBeAssigned && isCurrentlyAssigned) {
          // Remove device from this zone
          return DeviceService.updateDeviceZone(device.id, null);
        }
        // No change needed
        return Promise.resolve();
      });
      
      await Promise.all(updatePromises);
      
      // Close modal and refresh data
      setShowDeviceAssignment(false);
      setSelectedZoneForAssignment(null);
      setSelectedDevicesForAssignment([]);
      loadDevices(); // Refresh devices to show updated assignments
      
      console.log('✅ Device assignments updated successfully');
    } catch (err) {
      console.error('Device assignment failed:', err);
      setError(`Could not update device assignments: ${err.message}`);
    }
  };

  const handleTogglePump = async (zoneId, currentStatus) => {
    try {
      setError(null);
      
      // First, find devices in this zone
      const { data: devicesInZone, error: deviceError } = await supabase
        .from('devices')
        .select('id')
        .eq('zone_id', zoneId);

      if (deviceError) throw deviceError;
      
      if (!devicesInZone || devicesInZone.length === 0) {
        // Instead of showing error, we'll prompt user to assign devices
        const zone = zones.find(z => z.id === zoneId);
        if (zone) {
          openDeviceAssignment(zone);
        }
        return;
      }

      // Send pump command to each device in the zone
      const commandType = currentStatus ? 'pump_off' : 'pump_on';
      const parameters = currentStatus ? {} : { duration: 30 }; // 30 seconds default
      
      const commandPromises = devicesInZone.map(device => 
        DeviceService.sendCommand(device.id, commandType, parameters)
      );
      
      await Promise.all(commandPromises);
      
      // Update zone status in database
      const { error } = await supabase
        .from('zones')
        .update({ pump_on: !currentStatus })
        .eq('id', zoneId);

      if (error) throw error;
      
      // Update local state
      setZones((prevZones) =>
        prevZones.map((zone) =>
          zone.id === zoneId ? { ...zone, pump_on: !currentStatus } : zone,
        ),
      );
      
      console.log(`✅ Pump ${currentStatus ? 'OFF' : 'ON'} command sent to ${devicesInZone.length} device(s)`);
      
    } catch (err) {
      console.error('Pump toggle failed:', err);
      setError(`Could not ${currentStatus ? 'stop' : 'start'} pump: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 text-gray-800 dark:text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Plant Zones</h1>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg transition-colors bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
          title="Refresh zones"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-800 border-l-4 border-red-500 text-red-700 dark:text-white rounded">
          {error}
        </div>
      )}

      {/* Add Zone Form */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">Add Plant Zone</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Zone Name</label>
            <input
              className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-900 dark:text-white"
              value={newZone.name}
              onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
              placeholder="Enter zone name"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <input
              className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-900 dark:text-white"
              value={newZone.description}
              onChange={(e) =>
                setNewZone({ ...newZone, description: e.target.value })
              }
              placeholder="Enter description"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Soil Type</label>
            <select
              className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-900 dark:text-white"
              value={newZone.soil_type}
              onChange={(e) =>
                setNewZone({ ...newZone, soil_type: e.target.value })
              }
            >
              <option value="Loamy">Loamy</option>
              <option value="Sandy">Sandy</option>
              <option value="Clay">Clay</option>
              <option value="Silty">Silty</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Moisture Threshold (%)</label>
            <input
              type="number"
              className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-900 dark:text-white"
              value={newZone.moisture_threshold}
              onChange={(e) =>
                setNewZone({
                  ...newZone,
                  moisture_threshold: e.target.value
                    ? parseInt(e.target.value)
                    : 0,
                })
              }
              placeholder="Enter moisture threshold"
            />
          </div>
        </div>
        <button
          className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleAddZone}
          disabled={adding}
        >
          {adding ? 'Adding...' : 'Add Zone'}
        </button>
      </div>

      {/* Device Assignment Modal */}
      {showDeviceAssignment && selectedZoneForAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  Assign Devices to "{selectedZoneForAssignment.name}"
                </h3>
                <button
                  onClick={() => setShowDeviceAssignment(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Select which devices should be assigned to this zone. These devices will receive pump commands when you toggle the pump.
              </p>
              
              {devices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔌</div>
                  <p className="text-gray-600 dark:text-gray-400">
                    No devices found. Add devices in the System page first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedDevicesForAssignment.includes(device.id)
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                      }`}
                      onClick={() => toggleDeviceSelection(device.id)}
                    >
                      <div className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center ${
                        selectedDevicesForAssignment.includes(device.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 dark:border-gray-500'
                      }`}>
                        {selectedDevicesForAssignment.includes(device.id) && (
                          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{device.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {device.device_id} • {device.status}
                        </div>
                      </div>
                      {device.zone_id === selectedZoneForAssignment.id && (
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full">
                          Currently Assigned
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeviceAssignment(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveDeviceAssignments}
                  disabled={devices.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Assignments
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zones Grid */}
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : zones.length === 0 ? (
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-5xl mb-4">🪴</div>
          <p className="text-gray-600 dark:text-gray-400">No zones added yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => {
            // Count devices in this zone
            const deviceCount = devices.filter(d => d.zone_id === zone.id).length;
            
            return (
              <div
                key={zone.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm space-y-3"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">{zone.name}</h3>
                  <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full">
                    {zone.soil_type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {zone.description || 'No description'}
                </p>
                <div>
                  <div className="text-xs mb-1">Moisture Threshold</div>
                  <div className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full">
                    <div
                      className={`h-full rounded-full ${
                        zone.moisture_threshold < 30
                          ? 'bg-red-500'
                          : zone.moisture_threshold < 40
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${zone.moisture_threshold}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-right mt-1">
                    {zone.moisture_threshold}%
                  </div>
                </div>
                
                {/* Device count */}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {deviceCount} device{deviceCount !== 1 ? 's' : ''} assigned
                </div>
                
                <div className="mt-2">
                  {zone.pump_on ? (
                    <span className="text-green-500 text-sm font-bold">
                      🚿 Pump is ON
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm font-semibold">
                      Pump is OFF
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center gap-2">
                  <button
                    className="text-sm text-red-600 hover:text-red-800"
                    onClick={() => handleDeleteZone(zone.id)}
                  >
                    Delete
                  </button>
                  <div className="flex gap-2">
                    <button
                      className="text-sm px-3 py-1 rounded font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      onClick={() => openDeviceAssignment(zone)}
                    >
                      Assign Devices
                    </button>
                    <button
                      className={`text-sm px-3 py-1 rounded font-medium ${
                        zone.pump_on
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                      onClick={() => handleTogglePump(zone.id, zone.pump_on)}
                    >
                      {zone.pump_on ? 'Turn Off Pump' : 'Turn On Pump'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlantsPage;