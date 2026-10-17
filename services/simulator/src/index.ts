import dotenv from 'dotenv';
dotenv.config();

console.log('📡 [IoT Simulator] Cold-Chain Telemetry Simulator scaffolded.');
console.log('⚙️ Target Ingestion URL:', process.env.SIMULATOR_API_URL || 'http://localhost:4000/api/v1/sensors/telemetry');
