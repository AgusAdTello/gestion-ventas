import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { LayoutGrid, PlusCircle, TrendingUp, ShoppingCart } from "lucide-react";
import { initDB } from "./db";
import AgregarProducto from "./AgregarProducto";
import Inventario from "./Inventario";
import Ventas from "./Ventas";
import Rendimiento from "./Rendimiento";

export default function App() {
  // Esto corre una sola vez al abrir el programa para crear la base de datos
  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100 font-sans">
        {/* Menú Lateral */}
        <nav className="w-64 bg-white shadow-lg p-4 flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Mis Sabores</h1>
          <Link to="/" className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded text-gray-700 font-medium">
            <ShoppingCart size={20}/> Ventas
          </Link>
          <Link to="/agregar" className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded text-gray-700 font-medium">
            <PlusCircle size={20}/> Agregar Producto
          </Link>
          <Link to="/inventario" className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded text-gray-700 font-medium">
            <LayoutGrid size={20}/> Inventario
          </Link>
          <Link to="/rendimiento" className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded text-gray-700 font-medium">
            <TrendingUp size={20}/> Rendimiento
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