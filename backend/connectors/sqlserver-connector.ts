// generate-connector.ts
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';

// Configurar variables de entorno
dotenv.config();

// Interface para tipado (opcional pero recomendado)
interface SQLServerConnectorConfig {
  name: string;
  config: {
    "connector.class": string;
    "database.hostname": string;
    "database.port": string;
    "database.user": string;
    "database.password": string;
    "database.dbname": string;
    "database.server.name": string;
    "table.include.list": string;
    "database.history.kafka.bootstrap.servers": string;
    "database.history.kafka.topic": string;
    "transforms": string;
    "transforms.unwrap.type": string;
  };
}

// Validar variables de entorno
const validateEnv = () => {
  const requiredVars = [
    'DB_HOST', 'DB_PORT', 'DB_USER', 
    'DB_PASSWORD', 'DB_NAME', 'SERVER_NAME',
    'TABLE_INCLUDE', 'KAFKA_BROKERS'
  ];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      throw new Error(`❌ Variable de entorno faltante: ${varName}`);
    }
  });
};

const generateConnector = () => {
  try {
    validateEnv();
    
    const connectorConfig: SQLServerConnectorConfig = {
      name: "sqlserver-connector",
      config: {
        "connector.class": "io.debezium.connector.sqlserver.SqlServerConnector",
        "database.hostname": process.env.DB_HOST_ASSETS!,
        "database.port": process.env.DB_PORT_ASSETS!,
        "database.user": process.env.DB_USER_ASSETS!,
        "database.password": process.env.DB_PASSWORD_ASSETS!,
        "database.dbname": process.env.DB_NAME_ASSETS!,
        "database.server.name": process.env.SERVER_NAME_ASSETS!,
        "table.include.list": process.env.TABLE_INCLUDE_ASSETS!,
        "database.history.kafka.bootstrap.servers": process.env.KAFKA_BROKERS_ASSETS!,
        "database.history.kafka.topic": `dbhistory.${process.env.SERVER_NAME_ASSETS!}`,
        "transforms": "unwrap",
        "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState"
      }
    };

    writeFileSync(
      './connectors/sqlserver-connector.json',
      JSON.stringify(connectorConfig, null, 2)
    );

    console.log('✅ Configuración de connector generada exitosamente');
  } catch (error) {
    console.error('💥 Error al generar connector:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

generateConnector();