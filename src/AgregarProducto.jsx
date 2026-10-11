import { useState, useEffect } from "react";
import { getDb } from "./db";

export default function AgregarProducto() {
  const [productosExistentes, setProductosExistentes] = useState([]);
  const [modoNuevo, setModoNuevo] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const db = await getDb();
    const result = await db.select("SELECT * FROM productos ORDER BY nombre ASC");
    setProductosExistentes(result);
  };

  const handleSelectChange = (e) => {
    const valor = e.target.value;
    setProductoSeleccionado(valor);

    if (valor === "NUEVO") {
      setModoNuevo(true);
      setNombre("");
      setPrecio("");
    } else if (valor !== "") {
      setModoNuevo(false);
      // Autocompletamos el nombre y el precio para facilitarle la vida
      const prod = productosExistentes.find(p => p.id === parseInt(valor));
      if (prod) {
        setNombre(prod.nombre);
        setPrecio(prod.precio);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const db = await getDb();
      const cantidadIngresada = parseInt(stock);

      if (modoNuevo) {
        // Validación extra por si escribe un nombre que ya existía sin darse cuenta
        const check = await db.select("SELECT id FROM productos WHERE lower(nombre) = lower($1)", [nombre.trim()]);
        if (check.length > 0) {
          setMensaje("❌ Esa mermelada ya existe. Buscala en la lista.");
          setTimeout(() => setMensaje(""), 4000);
          return;
        }

        await db.execute(
          "INSERT INTO productos (nombre, precio, stock) VALUES ($1, $2, $3)",
          [nombre.trim(), parseFloat(precio), cantidadIngresada]
        );
        setMensaje("✅ Producto nuevo creado con éxito.");
      } else {
        // Actualizamos usando el ID exacto del select, evitando cualquier error de texto
        await db.execute(
          "UPDATE productos SET stock = stock + $1, precio = $2 WHERE id = $3",
          [cantidadIngresada, parseFloat(precio), parseInt(productoSeleccionado)]
        );
        
        if (cantidadIngresada > 0) setMensaje("✅ ¡Stock sumado al producto existente!");
        else if (cantidadIngresada < 0) setMensaje("⚠️ Stock descontado correctamente.");
        else setMensaje("✅ Precio actualizado (stock sin cambios).");
      }

      // Refrescamos todo
      setNombre("");
      setPrecio("");
      setStock("");
      setProductoSeleccionado("");
      setModoNuevo(false);
      cargarProductos();
      setTimeout(() => setMensaje(""), 3000);
      
    } catch (error) {
      console.error(error);
      setMensaje("❌ Hubo un error al guardar en la base de datos.");
    }
  };

  return (
    <div className="max-w-xl bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Cargar Mercadería</h2>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">¿Qué vamos a hacer?</label>
          <select 
            value={productoSeleccionado}
            onChange={handleSelectChange}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
          >
            <option value="" disabled>-- Elegir opción --</option>
            <option value="NUEVO" className="font-bold text-blue-600">+ CREAR NUEVA MERMELADA</option>
            <optgroup label="Actualizar Existentes">
              {productosExistentes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Solo mostramos el input de nombre si elige "NUEVO" */}
        {modoNuevo && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de la NUEVA Mermelada</label>
            <input 
              type="text" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              required={modoNuevo} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="Ej: Frutos Rojos" 
            />
          </div>
        )}

        {/* Si hay algo seleccionado (nuevo o existente), mostramos el resto */}
        {productoSeleccionado !== "" && (
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Precio Unitario ($)</label>
              <input 
                type="number" 
                value={precio} 
                onChange={(e) => setPrecio(e.target.value)} 
                required 
                min="0" step="0.01" 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Stock (+ / - / 0)</label>
              <input 
                type="number" 
                value={stock} 
                onChange={(e) => setStock(e.target.value)} 
                required 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Ej: 10, 0 o -2"
              />
            </div>
          </div>
        )}

        <button 
          type="submit" 
          disabled={productoSeleccionado === ""}
          className={`mt-2 w-full p-3 rounded-lg font-bold transition-colors shadow-sm ${productoSeleccionado === "" ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          {modoNuevo ? "Guardar Nuevo Producto" : "Actualizar Producto"}
        </button>
      </form>

      {mensaje && (
        <div className={`mt-4 p-3 rounded-lg text-center font-medium ${
          mensaje.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 
          mensaje.includes('⚠️') ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {mensaje}
        </div>
      )}
    </div>
  );
}