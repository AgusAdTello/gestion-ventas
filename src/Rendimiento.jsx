import { useEffect, useState } from "react";
import { getDb } from "./db";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import ExcelJS from "exceljs";
import { Download } from "lucide-react";

export default function Rendimiento() {
  const [ventas, setVentas] = useState([]);
  const [datosGraficoBarras, setDatosGraficoBarras] = useState([]);
  const [datosGraficoArea, setDatosGraficoArea] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const db = await getDb();
      // Traemos las ventas uniendo la tabla con los nombres de los productos
      const result = await db.select(`
        SELECT v.id, v.cantidad, v.precio_unitario, v.total, v.fecha, p.nombre 
        FROM ventas v
        JOIN productos p ON v.producto_id = p.id
        ORDER BY v.fecha ASC
      `);
      
      setVentas(result);
      procesarDatosGraficos(result);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
    }
  };

  const procesarDatosGraficos = (datosVentas) => {
    // 1. Procesar datos para el gráfico de barras (Productos más vendidos)
    const ventasPorProducto = {};
    datosVentas.forEach(v => {
      if (!ventasPorProducto[v.nombre]) {
        ventasPorProducto[v.nombre] = 0;
      }
      ventasPorProducto[v.nombre] += v.cantidad;
    });

    const formatoBarras = Object.keys(ventasPorProducto).map(nombre => ({
      nombre,
      cantidad: ventasPorProducto[nombre]
    }));
    setDatosGraficoBarras(formatoBarras);

    // 2. Procesar datos para el gráfico de montaña (Ingresos por día)
    const ingresosPorDia = {};
    datosVentas.forEach(v => {
      const fechaCorta = new Date(v.fecha).toLocaleDateString();
      if (!ingresosPorDia[fechaCorta]) {
        ingresosPorDia[fechaCorta] = 0;
      }
      ingresosPorDia[fechaCorta] += v.total;
    });

    const formatoArea = Object.keys(ingresosPorDia).map(fecha => ({
      fecha,
      ingreso: ingresosPorDia[fecha]
    }));
    setDatosGraficoArea(formatoArea);
  };

  const exportarAExcel = async () => {
    if (ventas.length === 0) return alert("No hay ventas para exportar");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reporte de Ventas");

    sheet.columns = [
      { header: "Fecha", key: "fecha", width: 15 },
      { header: "Mermelada", key: "nombre", width: 30 },
      { header: "Cantidad Vendida", key: "cantidad", width: 18 },
      { header: "Precio Unitario", key: "precio", width: 18 },
      { header: "Total", key: "total", width: 20 }
    ];

    const filaCabecera = sheet.getRow(1);
    filaCabecera.font = { bold: true, color: { argb: "FFFFFFFF" } };
    filaCabecera.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }; 
    filaCabecera.alignment = { vertical: 'middle', horizontal: 'center' };

    let granTotal = 0; // Variable para ir sumando

    ventas.forEach(v => {
      granTotal += v.total; // Sumamos al total general
      sheet.addRow({
        fecha: new Date(v.fecha).toLocaleDateString(),
        nombre: v.nombre,
        cantidad: v.cantidad,
        precio: `$${v.precio_unitario.toFixed(2)}`,
        total: `$${v.total.toFixed(2)}`
      });
    });

    // Dejamos una fila en blanco por prolijidad
    sheet.addRow({});

    // Agregamos la fila del TOTAL RECAUDADO
    const filaTotal = sheet.addRow({
      precio: "TOTAL RECAUDADO:",
      total: `$${granTotal.toFixed(2)}`
    });
    
    // Le damos estilo negrita a la fila del total
    filaTotal.font = { bold: true, size: 12 };
    filaTotal.getCell('precio').alignment = { horizontal: 'right' };
    filaTotal.getCell('total').fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } }; // Verde
    filaTotal.getCell('total').font = { color: { argb: "FFFFFFFF" }, bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Reporte_Mis_Sabores.xlsx";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rendimiento del Negocio</h2>
          <p className="text-gray-500">Métricas y exportación de datos</p>
        </div>
        <button 
          onClick={exportarAExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold transition-colors shadow-sm"
        >
          <Download size={20} />
          Exportar Excel Profesional
        </button>
      </div>

      <div className="flex gap-6">
        {/* Gráfico de Barras: Unidades vendidas por producto */}
        <div className="w-1/2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-6">Mermeladas más vendidas (Unidades)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGraficoBarras}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Montaña: Ingresos por día */}
        <div className="w-1/2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-6">Ingresos generados por día ($)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={datosGraficoArea}>
                <defs>
                  <linearGradient id="colorIngreso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="ingreso" stroke="#10b981" fillOpacity={1} fill="url(#colorIngreso)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}