import axios from 'axios';

const TEST_USER = {
  name: "Test Pilot",
  email: "pilot@timeflow.com",
  password: "password123",
  industry: "TECH"
};

async function testSignup() {
  try {
    console.log('⏳ Attempting to create a user...');
    const response = await axios.post('http://localhost:5000/api/auth/signup', TEST_USER);
    console.log('✅ Success! User created.');
    console.log('Token received:', response.data.token);
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

testSignup();
