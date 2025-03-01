import "dotenv/config";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const env = process.env.NODE_ENV || "development";
const logLevel = env === "production" ? "info" : "debug";
const finalLogLevel = process.env.LOG_LEVEL || logLevel;

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.json(),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Configuración de rotación de logs
const dailyRotateTransport = new DailyRotateFile({
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m", // Rota archivos mayores a 20MB
  maxFiles: "14d", // Conserva logs por 14 días
  level: "http", // Nivel máximo que se registrará aquí
});

const transports = [
  new winston.transports.Console(),
  dailyRotateTransport,
  new winston.transports.File({
    filename: "logs/error.log",
    level: "error", // Solo errores
  }),
];

const logger = winston.createLogger({
  level: finalLogLevel, // Nivel base
  levels,
  format,
  transports,
});

export default logger;
