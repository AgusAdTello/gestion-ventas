import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { LayoutGrid, PlusCircle, TrendingUp, ShoppingCart } from "lucide-react";
import { initDB, getDb } from "./db";
import AgregarProducto from "./AgregarProducto";
import Inventario from "./Inventario";
import Ventas from "./Ventas";
import Rendimiento from "./Rendimiento";

export default function App() {
  const [alertasStock, setAlertasStock] = useState(0);

  // Inicializar DB y arrancar el motor de alertas
  useEffect(() => {
    initDB().then(() => {
      // Hacemos la primera verificación al abrir
      verificarStockCritico();
      
      // Configuramos el radar: revisa la base de datos cada 5 segundos
      const intervalo = setInterval(verificarStockCritico, 5000);
      
      // Limpieza cuando se cierra el programa
      return () => clearInterval(intervalo);
    }).catch(console.error);
  }, []);

  const verificarStockCritico = async () => {
    try {
      const db = await getDb();
      // Buscamos cuántos artículos tienen 4 o menos de stock
      const result = await db.select("SELECT COUNT(*) as cantidad FROM productos WHERE stock <= 4");
      if (result && result.length > 0) {
        setAlertasStock(result[0].cantidad);
      }
    } catch (error) {
      console.error("Error al revisar alertas de stock:", error);
    }
  };

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100 font-sans">
        {/* Menú Lateral */}
        <nav className="w-64 bg-white shadow-lg p-4 flex flex-col gap-4">
          <h1 className="text-2xl font-black text-gray-800 mb-6 tracking-tight">Gestión Comercial</h1>
          
          <Link to="/" className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg text-gray-700 font-medium transition-colors">
            <ShoppingCart size={20} className="text-blue-600"/> Punto de Venta
          </Link>
          <Link to="/agregar" className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg text-gray-700 font-medium transition-colors">
            <PlusCircle size={20} className="text-green-600"/> Cargar Mercadería
          </Link>
          
          <Link to="/inventario" className="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg text-gray-700 font-medium transition-colors">
            <div className="flex items-center gap-2">
              <LayoutGrid size={20} className="text-orange-500"/> Inventario
            </div>
            
            {/* Burbuja Roja de Alerta (solo aparece si hay faltantes) */}
            {alertasStock > 0 && (
              <span 
                className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm"
                title={`${alertasStock} artículos con bajo stock`}
              >
                {alertasStock}
              </span>
            )}
          </Link>
          
          <Link to="/rendimiento" className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg text-gray-700 font-medium transition-colors">
            <TrendingUp size={20} className="text-purple-600"/> Rendimiento
          </Link>
        </nav>

        {/* Contenido Principal */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Ventas />} />
            <Route path="/agregar" element={<AgregarProducto />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/rendimiento" element={<Rendimiento />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}