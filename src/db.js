import Database from "@tauri-apps/plugin-sql";

let dbInstance = null;

// Función para obtener la conexión
export async function getDb() {
  if (!dbInstance) {
    dbInstance = await Database.load("sqlite:mis_sabores.db");
  }
  return dbInstance;
}

// Función para inicializar las tablas
export async function initDB() {
  const db = await getDb();
  
  // Tabla de Productos
  await db.execute(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      precio REAL NOT NULL,
      stock INTEGER NOT NULL
    )
  `);

  // Tabla de Ventas
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      total REAL NOT NULL,
      fecha TEXT NOT NULL,
      FOREIGN KEY(producto_id) REFERENCES productos(id)
    )
  `);
  
  console.log("Base de datos inicializada correctamente");
}