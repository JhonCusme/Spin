const mongoose = require('mongoose');

console.log('Testing MongoDB connection...');
console.log('URI:', process.env.MONGODB_URI ? 'Present' : 'Missing');

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
})
.then(() => {
  console.log('✅ Successfully connected to MongoDB Atlas!');
  process.exit(0);
})
.catch(err => {
  console.error('❌ Connection error:', err.message);
  if (err.message.includes('ECONNREFUSED') || err.message.includes('querySrv')) {
    console.log('\n💡 SOLUCIÓN:');
    console.log('1. Ve a MongoDB Atlas > Network Access');
    console.log('2. Agrega "0.0.0.0/0" (Allow Access from Anywhere)');
    console.log('3. Espera 1 minuto y vuelve a intentar');
  }
  process.exit(1);
});
