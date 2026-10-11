import { useEffect, useState } from "react";
import { getDb } from "./db";
import ExcelJS from "exceljs";
import { Download } from "lucide-react";

export default function Inventario() {
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    cargarInventario();
  }, []);

  const cargarInventario = async () => {
    try {
      const db = await getDb();
      const result = await db.select("SELECT * FROM productos ORDER BY nombre ASC");
      setProductos(result);
    } catch (error) {
      console.error("Error al cargar el inventario:", error);
    }
  };

  const exportarInventarioExcel = async () => {
    if (productos.length === 0) return alert("No hay productos en el inventario");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inventario Actual");

    sheet.columns = [
      { header: "Mermelada", key: "nombre", width: 35 },
      { header: "Precio Actual", key: "precio", width: 18 },
      { header: "Stock Disponible", key: "stock", width: 18 }
    ];

    const filaCabecera = sheet.getRow(1);
    filaCabecera.font = { bold: true, color: { argb: "FFFFFFFF" } };
    filaCabecera.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } }; // Azul claro
    
    productos.forEach(p => {
      sheet.addRow({
        nombre: p.nombre,
        precio: `$${p.precio.toFixed(2)}`,
        stock: p.stock
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Stock_Mis_Sabores.xlsx";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const renderIndicador = (stock) => {
    if (stock <= 0) return <div className="w-4 h-4 rounded-full bg-red-500 shadow-sm" title="Faltante"></div>;
    if (stock < 5) return <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-sm" title="Stock Bajo"></div>;
    return <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm" title="Stock Normal"></div>;
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventario de Stock</h2>
        <div className="flex gap-4">
          <button 
            onClick={cargarInventario}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors font-medium"
          >
            Actualizar Lista
          </button>
          <button 
            onClick={exportarInventarioExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors font-medium shadow-sm"
          >
            <Download size={18} />
            Descargar Stock
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="p-4 font-semibold rounded-tl-lg">Estado</th>
              <th className="p-4 font-semibold">Mermelada</th>
              <th className="p-4 font-semibold">Precio</th>
              <th className="p-4 font-semibold rounded-tr-lg">Stock Disponible</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500">Todavía no hay mermeladas cargadas.</td>
              </tr>
            ) : (
              productos.map((producto) => (
                <tr key={producto.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4"><div className="flex justify-center w-8">{renderIndicador(producto.stock)}</div></td>
                  <td className="p-4 font-medium text-gray-800">{producto.nombre}</td>
                  <td className="p-4 text-gray-600">${producto.precio.toFixed(2)}</td>
                  <td className="p-4 font-bold text-gray-800">{producto.stock} un.</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}