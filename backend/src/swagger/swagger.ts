// src/swagger/swagger.ts
import swaggerJSDoc from "swagger-jsdoc";
import dotenv from "dotenv";

dotenv.config();
const PORT = process.env.PORT;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API UNISS - Sistema de Gestión de Usuarios",
      version: "1.0.0",
      description: "API completa para gestión de usuarios, autenticación, correos electrónicos y notificaciones del sistema UNISS",
    },
    servers: [
      { 
        url: `http://localhost:${PORT}/api`, 
        description: "Servidor local de desarrollo" 
      },
      {
        url: process.env.API_URL || "https://api.uniss.edu.cu/api",
        description: "Servidor de producción"
      }
    ],
    components: {
      schemas: {
        // Schemas existentes para Email
        EmailStats: {
          type: "object",
          properties: {
            count: {
              type: "number",
              description: "Número de correos enviados hoy",
              example: 45
            },
            remaining: {
              type: "number",
              description: "Número de correos restantes disponibles hoy",
              example: 55
            },
            dailyLimit: {
              type: "number",
              description: "Límite diario de correos",
              example: 100
            },
            usageMessage: {
              type: "string",
              description: "Mensaje de uso actual",
              example: "45/100 correos enviados hoy"
            }
          }
        },
        VerificationCodeRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Correo electrónico del destinatario",
              example: "usuario@ejemplo.com"
            },
            userName: {
              type: "string",
              description: "Nombre del usuario (opcional)",
              example: "Juan Pérez"
            }
          }
        },
        ChangeEmailRequest: {
          type: "object",
          required: ["email", "newEmail"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Correo electrónico actual",
              example: "actual@ejemplo.com"
            },
            newEmail: {
              type: "string",
              format: "email",
              description: "Nuevo correo electrónico",
              example: "nuevo@ejemplo.com"
            },
            userName: {
              type: "string",
              description: "Nombre del usuario (opcional)",
              example: "Juan Pérez"
            }
          }
        },
        VerifyCodeRequest: {
          type: "object",
          required: ["email", "code"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Correo electrónico asociado al código",
              example: "usuario@ejemplo.com"
            },
            code: {
              type: "string",
              description: "Código de verificación de 6 dígitos",
              example: "123456"
            }
          }
        },
        PasswordAlertRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Correo electrónico del destinatario",
              example: "usuario@ejemplo.com"
            },
            userName: {
              type: "string",
              description: "Nombre del usuario",
              example: "Juan Pérez"
            },
            daysLeft: {
              type: "number",
              description: "Días restantes para expiración de contraseña",
              example: 7
            }
          }
        },
        WelcomeEmailRequest: {
          type: "object",
          required: ["to", "username", "userPrincipalName", "fullName", "userType"],
          properties: {
            to: {
              type: "string",
              format: "email",
              description: "Correo electrónico del destinatario",
              example: "nuevo.usuario@uniss.edu.cu"
            },
            username: {
              type: "string",
              description: "Nombre de usuario (sAMAccountName)",
              example: "jperez"
            },
            userPrincipalName: {
              type: "string",
              description: "User Principal Name",
              example: "jperez@uniss.edu.cu"
            },
            fullName: {
              type: "string",
              description: "Nombre completo del usuario",
              example: "Juan Pérez González"
            },
            userType: {
              type: "string",
              description: "Tipo de usuario",
              example: "Estudiante"
            }
          }
        },
        ForgotPasswordRequest: {
          type: "object",
          required: ["userIdentifier"],
          properties: {
            userIdentifier: {
              type: "string",
              description: "Nombre de usuario (sAMAccountName) o carnet de identidad (employeeID)",
              example: "jperez"
            }
          }
        },
        ResetPasswordRequest: {
          type: "object",
          required: ["userIdentifier", "code", "newPassword"],
          properties: {
            userIdentifier: {
              type: "string",
              description: "Nombre de usuario (sAMAccountName) o carnet de identidad (employeeID)",
              example: "jperez"
            },
            code: {
              type: "string",
              description: "Código de verificación recibido por correo",
              example: "123456"
            },
            newPassword: {
              type: "string",
              description: "Nueva contraseña",
              example: "NuevaContraseña123!"
            }
          }
        },
        BackupEmailUpdateRequest: {
          type: "object",
          required: ["newEmail", "code"],
          properties: {
            newEmail: {
              type: "string",
              format: "email",
              description: "Nuevo correo de respaldo",
              example: "micorreo@gmail.com"
            },
            code: {
              type: "string",
              description: "Código de verificación recibido en el nuevo correo",
              example: "123456"
            }
          }
        },
        ManualAlertsRequest: {
          type: "object",
          properties: {
            grupos: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Grupos de usuarios para enviar alertas",
              example: ["rango7Dias", "rango3Dias"]
            }
          }
        },
        UserExistsResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true
            },
            message: {
              type: "string",
              example: "Usuario encontrado"
            },
            user: {
              type: "object",
              properties: {
                displayName: {
                  type: "string",
                  example: "Juan Pérez"
                },
                sAMAccountName: {
                  type: "string",
                  example: "jperez"
                },
                employeeID: {
                  type: "string",
                  example: "85010112345"
                },
                userPrincipalName: {
                  type: "string",
                  example: "jperez@uniss.edu.cu"
                },
                email: {
                  type: "string",
                  example: "jperez@gmail.com"
                },
                dn: {
                  type: "string",
                  example: "CN=Juan Pérez,OU=Estudiantes,DC=uniss,DC=edu,DC=cu"
                }
              }
            }
          }
        },

        // ✅ SCHEMAS PARA 2FA
        Activate2FARequest: {
          type: "object",
          required: ["sAMAccountName", "secret"],
          properties: {
            sAMAccountName: {
              type: "string",
              description: "Nombre de usuario (sAMAccountName)",
              example: "jperez"
            },
            secret: {
              type: "string",
              description: "Secreto TOTP en base32 (16 o 32 caracteres)",
              example: "JBSWY3DPEHPK3PXP"
            }
          }
        },
        Deactivate2FARequest: {
          type: "object",
          required: ["sAMAccountName"],
          properties: {
            sAMAccountName: {
              type: "string",
              description: "Nombre de usuario (sAMAccountName)",
              example: "jperez"
            }
          }
        },
        Check2FAStatusRequest: {
          type: "object",
          required: ["userIdentifier"],
          properties: {
            userIdentifier: {
              type: "string",
              description: "Nombre de usuario (sAMAccountName) o carnet de identidad (employeeID)",
              example: "jperez"
            }
          }
        },
        Verify2FACodeRequest: {
          type: "object",
          required: ["userIdentifier", "code"],
          properties: {
            userIdentifier: {
              type: "string",
              description: "Nombre de usuario (sAMAccountName) o carnet de identidad (employeeID)",
              example: "jperez"
            },
            code: {
              type: "string",
              description: "Código de verificación de 6 dígitos",
              example: "123456"
            }
          }
        },
        ResetPassword2FARequest: {
          type: "object",
          required: ["userIdentifier", "code", "newPassword"],
          properties: {
            userIdentifier: {
              type: "string",
              description: "Nombre de usuario (sAMAccountName) o carnet de identidad (employeeID)",
              example: "jperez"
            },
            code: {
              type: "string",
              description: "Código de verificación recibido por correo",
              example: "123456"
            },
            newPassword: {
              type: "string",
              description: "Nueva contraseña",
              example: "NuevaContraseña123!"
            }
          }
        },
        TwoFactorStatusResponse: {
          type: "object",
          properties: {
            enabled: {
              type: "boolean",
              description: "Indica si el 2FA está activado",
              example: true
            },
            secret: {
              type: "string",
              description: "Secreto TOTP (solo si está activado y se puede desencriptar)",
              example: "JBSWY3DPEHPK3PXP"
            },
            hasEncryptedSecret: {
              type: "boolean",
              description: "Indica si existe un secreto encriptado en LDAP",
              example: true
            },
            originalEmployeeNumber: {
              type: "string",
              description: "Valor original del employeeNumber antes de activar 2FA",
              example: "12345"
            }
          }
        },
        Check2FAStatusResponse: {
          type: "object",
          properties: {
            enabled: {
              type: "boolean",
              description: "Indica si el 2FA está activado",
              example: true
            },
            sAMAccountName: {
              type: "string",
              description: "Nombre de usuario",
              example: "jperez"
            },
            email: {
              type: "string",
              description: "Correo electrónico del usuario",
              example: "jperez@uniss.edu.cu"
            }
          }
        },
        TwoFactorActivationResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true
            },
            message: {
              type: "string",
              example: "2FA activado correctamente"
            },
            recoveryCodes: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Códigos de recuperación (solo en activación)",
              example: ["123456", "654321", "111222"]
            }
          }
        },
        TwoFactorVerificationResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true
            },
            message: {
              type: "string",
              example: "Código verificado correctamente"
            },
            isValid: {
              type: "boolean",
              example: true
            }
          }
        },

        // ✅ SCHEMAS PARA PIN
        SavePinRequest: {
          type: "object",
          required: ["pin"],
          properties: {
            pin: {
              type: "string",
              description: "PIN de 4 a 6 dígitos",
              example: "123456",
              minLength: 4,
              maxLength: 6
            }
          }
        },
        RemovePinRequest: {
          type: "object",
          description: "No requiere body, se usa el token de autenticación"
        },
        CheckPinRequest: {
          type: "object",
          required: ["pin"],
          properties: {
            pin: {
              type: "string",
              description: "PIN a verificar",
              example: "123456"
            }
          }
        },
        VerifyPinForRecoveryRequest: {
          type: "object",
          required: ["userIdentifier", "pin"],
          properties: {
            userIdentifier: {
              type: "string",
              description: "Nombre de usuario (sAMAccountName) o carnet de identidad (employeeID)",
              example: "jperez"
            },
            pin: {
              type: "string",
              description: "PIN de recuperación",
              example: "123456"
            }
          }
        },
        FindUserForRecoveryRequest: {
          type: "object",
          required: ["userIdentifier"],
          properties: {
            userIdentifier: {
              type: "string",
              description: "Nombre de usuario (sAMAccountName) o carnet de identidad (employeeID)",
              example: "jperez"
            }
          }
        },
        CheckUserHasPinRequest: {
          type: "object",
          required: ["userIdentifier"],
          properties: {
            userIdentifier: {
              type: "string",
              description: "Nombre de usuario (sAMAccountName) o carnet de identidad (employeeID)",
              example: "jperez"
            }
          }
        },
        ResetPasswordWithPINRequest: {
          type: "object",
          required: ["userIdentifier", "pin", "newPassword"],
          properties: {
            userIdentifier: {
              type: "string",
              description: "Nombre de usuario (sAMAccountName) o carnet de identidad (employeeID)",
              example: "jperez"
            },
            pin: {
              type: "string",
              description: "PIN de verificación",
              example: "123456"
            },
            newPassword: {
              type: "string",
              description: "Nueva contraseña",
              example: "NuevaContraseña123!"
            }
          }
        },
        PinStatusResponse: {
          type: "object",
          properties: {
            hasPin: {
              type: "boolean",
              description: "Indica si el usuario tiene PIN configurado",
              example: true
            },
            userIdentifier: {
              type: "string",
              description: "Identificador del usuario",
              example: "jperez"
            }
          }
        },
        PinVerificationResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true
            },
            message: {
              type: "string",
              example: "PIN verificado correctamente"
            },
            isValid: {
              type: "boolean",
              example: true
            }
          }
        },
        SimpleSuccessResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true
            },
            message: {
              type: "string",
              example: "Operación completada exitosamente"
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      responses: {
        UnauthorizedError: {
          description: "No autorizado - Token inválido o expirado",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false
                  },
                  message: {
                    type: "string",
                    example: "Usuario no autenticado"
                  }
                }
              }
            }
          }
        },
        ValidationError: {
          description: "Error de validación en los datos de entrada",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false
                  },
                  message: {
                    type: "string",
                    example: "El correo electrónico es requerido"
                  }
                }
              }
            }
          }
        },
        InternalServerError: {
          description: "Error interno del servidor",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false
                  },
                  message: {
                    type: "string",
                    example: "Error al procesar la solicitud"
                  },
                  error: {
                    type: "string",
                    example: "Detalles del error"
                  }
                }
              }
            }
          }
        },
        TwoFactorError: {
          description: "Error en la operación de 2FA",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false
                  },
                  message: {
                    type: "string",
                    example: "Error al activar 2FA"
                  },
                  error: {
                    type: "string",
                    example: "Detalles del error"
                  }
                }
              }
            }
          }
        },
        TwoFactorNotFound: {
          description: "Usuario no encontrado",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false
                  },
                  message: {
                    type: "string",
                    example: "Usuario no encontrado"
                  }
                }
              }
            }
          }
        },
        InvalidTwoFactorCode: {
          description: "Código 2FA inválido o expirado",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false
                  },
                  message: {
                    type: "string",
                    example: "Código inválido o expirado"
                  },
                  isValid: {
                    type: "boolean",
                    example: false
                  }
                }
              }
            }
          }
        },
        PinError: {
          description: "Error en la operación de PIN",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false
                  },
                  message: {
                    type: "string",
                    example: "Error al guardar el PIN"
                  },
                  error: {
                    type: "string",
                    example: "Detalles del error"
                  }
                }
              }
            }
          }
        },
        InvalidPin: {
          description: "PIN inválido o incorrecto",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    example: false
                  },
                  message: {
                    type: "string",
                    example: "PIN incorrecto"
                  },
                  isValid: {
                    type: "boolean",
                    example: false
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: "Email",
        description: "Endpoints para gestión de correos electrónicos y notificaciones"
      },
      {
        name: "2FA",
        description: "Endpoints para la gestión de la autenticación de dos factores"
      },
      {
        name: "PIN",
        description: "Endpoints para la gestión de PIN de seguridad"
      }
    ]
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;