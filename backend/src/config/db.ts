import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mi-base-datos', {
      serverSelectionTimeoutMS: 5000 // Timeout de 5 segundos
    });
    console.log('✅ MongoDB local conectado');
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    process.exit(1);
  }
};

export default connectDB;