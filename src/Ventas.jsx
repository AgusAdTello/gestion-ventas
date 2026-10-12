import { useEffect, useState } from "react";
import { getDb } from "./db";
import { ShoppingCart, Plus, Trash2, FileText } from "lucide-react";

// 1. IMPORTACIONES ESTRICTAS (Evitan el error de "no es una función")
import { jsPDF } from "jspdf"; 
import autoTable from "jspdf-autotable"; 

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const db = await getDb();
    const result = await db.select("SELECT * FROM productos ORDER BY nombre ASC");
    setProductos(result);
  };

  const agregarAlCarrito = (e) => {
    e.preventDefault();
    if (!productoSeleccionado || cantidad < 1) return;

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
    setProductoSeleccionado("");
    setCantidad(1);
  };

  const eliminarDelCarrito = (indexToRemove) => {
    setCarrito(carrito.filter((_, index) => index !== indexToRemove));
  };

  const calcularTotal = () => {
    return carrito.reduce((total, item) => total + item.subtotal, 0);
  };

  // 2. FUNCIÓN BLINDADA PARA LA IMAGEN: La convertimos a código (Base64)
  const cargarLogoBase64 = () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = '/logo.jpg';
      img.crossOrigin = "Anonymous"; // Evita bloqueos de seguridad
      
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/jpeg");
          resolve(dataUrl);
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
    });
  };

  const generarComprobantePDF = async (carritoFacturar, totalFacturar, fechaVenta) => {
    try {
      const doc = new jsPDF();
      const numeroTicket = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      
      const logoBase64 = await cargarLogoBase64();
      
      if (logoBase64) {
        // Al pasarle Base64, jsPDF no tiene que procesar archivos locales
        doc.addImage(logoBase64, 'JPEG', 14, 10, 60, 30);
      } else {
        doc.setFontSize(22);
        doc.text("GESTIÓN COMERCIAL", 14, 25);
      }

      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("COMPROBANTE DE VENTA", 196, 20, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Ticket N°: ${numeroTicket}`, 196, 28, { align: 'right' });
      doc.text(`Fecha: ${fechaVenta.toLocaleString()}`, 196, 34, { align: 'right' });

      const columnas = ["Cant.", "Descripción del Artículo", "Precio Unit.", "Subtotal"];
      const filas = carritoFacturar.map(item => [
        item.cantidad.toString(),
        item.nombre,
        `$${item.precio_unitario.toFixed(2)}`,
        `$${item.subtotal.toFixed(2)}`
      ]);

      // 3. USO ESTRICTO DE AUTOTABLE
      autoTable(doc, {
        startY: 50,
        head: [columnas],
        body: filas,
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138] },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          2: { halign: 'right', cellWidth: 30 },
          3: { halign: 'right', cellWidth: 30 }
        }
      });

      // Calculamos dónde terminó la tabla
      const finalY = doc.lastAutoTable.finalY + 10;
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL A PAGAR: $${totalFacturar.toFixed(2)}`, 196, finalY, { align: 'right' });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text("¡Gracias por su compra!", 105, finalY + 20, { align: 'center' });

      // 4. DESCARGA VÍA BLOB (El método infalible en Tauri)
      const blob = doc.output("blob");
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Comprobante_${numeroTicket}.pdf`;
      document.body.appendChild(anchor); 
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Detalle del error jsPDF:", error);
      alert("Hubo un error al generar el PDF. Revisa la consola.");
    }
  };

  const confirmarVenta = async () => {
    if (carrito.length === 0) return;

    try {
      const db = await getDb();
      const fechaActual = new Date();
      const totalFacturar = calcularTotal();

      for (const item of carrito) {
        await db.execute(
          "INSERT INTO ventas (producto_id, cantidad, precio_unitario, total, fecha) VALUES ($1, $2, $3, $4, $5)",
          [item.producto_id, item.cantidad, item.precio_unitario, item.subtotal, fechaActual.toISOString()]
        );

        await db.execute(
          "UPDATE productos SET stock = stock - $1 WHERE id = $2",
          [item.cantidad, item.producto_id]
        );
      }

      await generarComprobantePDF(carrito, totalFacturar, fechaActual);

      setMensaje("✅ ¡Venta registrada y comprobante generado!");
      setCarrito([]); 
      cargarProductos(); 
      
      setTimeout(() => setMensaje(""), 4000);

    } catch (error) {
      console.error(error);
      setMensaje("❌ Error al registrar la venta.");
    }
  };

  return (
    <div className="flex gap-6 items-start">
      <div className="w-1/2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Plus size={24} className="text-blue-600"/> Añadir al Carrito
        </h2>
        
        <form onSubmit={agregarAlCarrito} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Seleccionar Artículo</label>
            <select 
              value={productoSeleccionado} 
              onChange={(e) => setProductoSeleccionado(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="" disabled>-- Elegir un artículo --</option>
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
          className={`flex items-center justify-center gap-2 w-full p-4 rounded-lg font-bold text-lg transition-colors shadow-sm ${carrito.length > 0 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          <FileText size={24} />
          Confirmar Venta y Generar PDF
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