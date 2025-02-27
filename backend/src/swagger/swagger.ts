import swaggerJSDoc from "swagger-jsdoc";
import dotenv from "dotenv";

dotenv.config();
const PORT = process.env.PORT;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Estudiantes UNISS",
      version: "1.0.0",
      description: "API para consulta de datos estudiantiles",
    },
    servers: [
      { url: `http://localhost:${PORT}/api`, description: "Servidor local" },
    ],
  },
  apis: ["./src/routes/*.ts"], // Ruta a los archivos con comentarios Swagger
};

export default swaggerJSDoc(options);
