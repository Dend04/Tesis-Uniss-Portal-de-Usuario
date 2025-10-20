// app/api/users/inviteAccount.controller.ts
import { Request, Response } from 'express';
import { CreateGuestUserDto, GuestUserService } from '../services/inviteAccount.services';


export class GuestUserController {
  private guestUserService: GuestUserService;

  constructor() {
    this.guestUserService = new GuestUserService();
  }

  async createGuestUser(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;
      
      // Validar campos obligatorios
      const validationError = this.validateCreateGuestUserDto(body);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const createGuestUserDto: CreateGuestUserDto = {
        username: body.username.trim(),
        password: body.password,
        email: body.email.trim(),
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        identityCard: body.identityCard?.trim(),
        reason: body.reason?.trim()
      };

      const result = await this.guestUserService.createGuestUser(createGuestUserDto);

      res.status(201).json({ 
        message: result.message,
        username: result.username 
      });

    } catch (error: any) {
      console.error('Error en controlador al crear usuario invitado:', error);
      
      // Manejar errores específicos
      if (error.message.includes('ya existe') || error.message.includes('username único')) {
        res.status(409).json({ error: 'El nombre de usuario no está disponible. Por favor, elija otro.' });
        return;
      }

      if (error.message.includes('Invalid credentials') || error.name === 'InvalidCredentialsError') {
        res.status(500).json({ error: 'Error de autenticación con el servidor LDAP' });
        return;
      }

      res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
  }

  private validateCreateGuestUserDto(body: any): string | null {
    const requiredFields = ['username', 'password', 'email', 'firstName', 'lastName'];
    
    for (const field of requiredFields) {
      if (!body[field] || typeof body[field] !== 'string' || !body[field].trim()) {
        return `El campo ${field} es obligatorio`;
      }
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return 'El formato del email no es válido';
    }

    // Validar longitud de contraseña
    if (body.password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }

    // Validar formato de username
    const usernameRegex = /^[a-z0-9-]+$/;
    if (!usernameRegex.test(body.username.toLowerCase())) {
      return 'El nombre de usuario solo puede contener letras minúsculas, números y guiones';
    }

    // Validar longitud de username
    if (body.username.length < 3 || body.username.length > 20) {
      return 'El nombre de usuario debe tener entre 3 y 20 caracteres';
    }

    // Validar formato de carnet de identidad si se proporciona
    if (body.identityCard && !/^\d{11}$/.test(body.identityCard.replace(/\D/g, ''))) {
      return 'El carnet de identidad debe tener 11 dígitos';
    }

    return null;
  }
}