// Test Script for GardenCare Functions
// Run this in the browser console after logging into the app

console.log('🧪 Starting GardenCare Function Tests...');

// Test 1: Check if user is authenticated
async function testAuthentication() {
  console.log('\n📋 Test 1: Authentication Check');
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('❌ Authentication failed:', error);
    return false;
  }
  
  if (user) {
    console.log('✅ User authenticated:', user.email);
    return true;
  } else {
    console.log('⚠️ No user logged in');
    return false;
  }
}

// Test 2: Test Simulate Sensor Data Function
async function testSimulateSensorData() {
  console.log('\n📋 Test 2: Simulate Sensor Data Function');
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('⚠️ No session found. Please log in first.');
      return;
    }
    
    const response = await fetch('https://bzloebjykhwoscuoiikw.supabase.co/functions/v1/simulate-sensor-data', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Simulate function working:', result);
    } else {
      console.log('❌ Simulate function error:', result);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test 3: Test Device Management Function
async function testDeviceManagement() {
  console.log('\n📋 Test 3: Device Management Function');
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('⚠️ No session found. Please log in first.');
      return;
    }
    
    const response = await fetch('https://bzloebjykhwoscuoiikw.supabase.co/functions/v1/device-management', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Device management working:', result);
    } else {
      console.log('❌ Device management error:', result);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test 4: Check Database Tables
async function testDatabaseTables() {
  console.log('\n📋 Test 4: Database Tables Check');
  
  try {
    // Test zones table
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('*')
      .limit(1);
    
    if (zonesError) {
      console.log('❌ Zones table not found:', zonesError.message);
    } else {
      console.log('✅ Zones table exists');
    }
    
    // Test devices table
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('*')
      .limit(1);
    
    if (devicesError) {
      console.log('❌ Devices table not found:', devicesError.message);
    } else {
      console.log('✅ Devices table exists');
    }
    
    // Test sensor_data table
    const { data: sensorData, error: sensorError } = await supabase
      .from('sensor_data')
      .select('*')
      .limit(1);
    
    if (sensorError) {
      console.log('❌ Sensor_data table not found:', sensorError.message);
    } else {
      console.log('✅ Sensor_data table exists');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive GardenCare tests...\n');
  
  const isAuthenticated = await testAuthentication();
  
  if (isAuthenticated) {
    await testDatabaseTables();
    await testDeviceManagement();
    await testSimulateSensorData();
  } else {
    console.log('\n⚠️ Please log in first to run function tests');
  }
  
  console.log('\n🎯 Test suite completed!');
}

// Auto-run tests
runAllTests();