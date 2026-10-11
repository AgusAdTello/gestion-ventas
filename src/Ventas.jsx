import { useEffect, useState } from "react";
import { getDb } from "./db";
import { ShoppingCart, Plus, Trash2 } from "lucide-react";

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  
  // Estados para el formulario del carrito
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [mensaje, setMensaje] = useState("");

  // Cargar productos al abrir la pestaña
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const db = await getDb();
    const result = await db.select("SELECT * FROM productos ORDER BY nombre ASC");
    setProductos(result);
  };

  // Agregar un producto a la lista del carrito
  const agregarAlCarrito = (e) => {
    e.preventDefault();
    if (!productoSeleccionado || cantidad < 1) return;

    // Buscamos los datos reales del producto seleccionado
    const prodBD = productos.find(p => p.id === parseInt(productoSeleccionado));
    if (!prodBD) return;

    const subtotal = prodBD.precio * cantidad;

    const nuevoItem = {
      producto_id: prodBD.id,
      nombre: prodBD.nombre,
      precio_unitario: prodBD.precio,
      cantidad: parseInt(cantidad),
      subtotal: subtotal
    };

    setCarrito([...carrito, nuevoItem]);
    
    // Reseteamos los campos
    setProductoSeleccionado("");
    setCantidad(1);
  };

  const eliminarDelCarrito = (indexToRemove) => {
    setCarrito(carrito.filter((_, index) => index !== indexToRemove));
  };

  const calcularTotal = () => {
    return carrito.reduce((total, item) => total + item.subtotal, 0);
  };

  // El botón final: Guardar en la base de datos
  const confirmarVenta = async () => {
    if (carrito.length === 0) return;

    try {
      const db = await getDb();
      const fechaActual = new Date().toISOString();

      // Recorremos cada producto del carrito para registrarlo y descontar stock
      for (const item of carrito) {
        // 1. Guardar el registro de la venta
        await db.execute(
          "INSERT INTO ventas (producto_id, cantidad, precio_unitario, total, fecha) VALUES ($1, $2, $3, $4, $5)",
          [item.producto_id, item.cantidad, item.precio_unitario, item.subtotal, fechaActual]
        );

        // 2. Descontar el stock automáticamente
        await db.execute(
          "UPDATE productos SET stock = stock - $1 WHERE id = $2",
          [item.cantidad, item.producto_id]
        );
      }

      setMensaje("✅ ¡Venta registrada y stock descontado con éxito!");
      setCarrito([]); // Vaciamos el carrito
      cargarProductos(); // Recargamos el stock actualizado
      
      setTimeout(() => setMensaje(""), 4000);

    } catch (error) {
      console.error(error);
      setMensaje("❌ Error al registrar la venta.");
    }
  };

  return (
    <div className="flex gap-6 items-start">
      {/* Columna Izquierda: Selector de Productos */}
      <div className="w-1/2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Plus size={24} className="text-blue-600"/> Añadir al Carrito
        </h2>
        
        <form onSubmit={agregarAlCarrito} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Seleccionar Mermelada</label>
            <select 
              value={productoSeleccionado} 
              onChange={(e) => setProductoSeleccionado(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="" disabled>-- Elegir un producto --</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} - ${p.precio} (Stock: {p.stock})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Cantidad</label>
            <input 
              type="number" 
              value={cantidad} 
              onChange={(e) => setCantidad(e.target.value)}
              required
              min="1"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button type="submit" className="mt-2 bg-gray-800 text-white p-3 rounded-lg hover:bg-gray-900 font-bold transition-colors">
            Agregar a la cuenta
          </button>
        </form>
      </div>

      {/* Columna Derecha: El Ticket / Carrito */}
      <div className="w-1/2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ShoppingCart size={24} className="text-green-600"/> Detalle de Venta
        </h2>

        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-2 mb-4 bg-gray-50">
          {carrito.length === 0 ? (
            <p className="text-center text-gray-400 mt-10">La cuenta está vacía.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {carrito.map((item, index) => (
                <li key={index} className="bg-white p-3 rounded shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-800">{item.nombre}</p>
                    <p className="text-sm text-gray-500">{item.cantidad} un. x ${item.precio_unitario}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-green-700">${item.subtotal}</span>
                    <button onClick={() => eliminarDelCarrito(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-gray-800 text-white p-4 rounded-lg flex justify-between items-center mb-4">
          <span className="text-lg font-bold">TOTAL A COBRAR:</span>
          <span className="text-2xl font-black">${calcularTotal().toFixed(2)}</span>
        </div>

        <button 
          onClick={confirmarVenta}
          disabled={carrito.length === 0}
          className={`w-full p-4 rounded-lg font-bold text-lg transition-colors shadow-sm ${carrito.length > 0 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          Confirmar Venta
        </button>

        {mensaje && (
          <div className={`mt-4 p-3 rounded-lg text-center font-medium ${mensaje.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {mensaje}
          </div>
        )}
      </div>
    </div>
  );
}