import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import SyncService from '../services/sync.services';

// Interface mejorada con todos los campos y métodos
export interface IUser extends Document {
  username: string;
  institutionalEmail: string;
  backupEmail: string;
  password: string;
  lastPasswordUpdate: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  ldapSynced: boolean;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  syncPassword(newPassword: string): Promise<void>;
}

// Definición del esquema con tipos explícitos
const UserSchema: Schema<IUser> = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  institutionalEmail: {
    type: String,
    required: true,
    unique: true,
    match: [/^[\w-]+(\.[\w-]+)*@uniss\.edu\.cu$/, 'Correo institucional inválido']
  },
  backupEmail: {
    type: String,
    required: true,
    match: [/^\S+@\S+\.\S+$/, 'Correo inválido']
  },
  password: {
    type: String,
    required: true
  },
  lastPasswordUpdate: {
    type: Date,
    default: Date.now
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  ldapSynced: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Método para sincronizar contraseña (con tipo explícito)
UserSchema.methods.syncPassword = async function(this: IUser, newPassword: string): Promise<void> {
  await SyncService.syncPassword(this, newPassword);
};

// Middleware para hashear contraseña
UserSchema.pre<IUser>('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function(
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Exportar el modelo con tipo explícito
const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
export default User;