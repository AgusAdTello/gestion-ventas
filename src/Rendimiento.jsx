import { useEffect, useState } from "react";
import { getDb } from "./db";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import ExcelJS from "exceljs";
import { Download, Calendar } from "lucide-react";

export default function Rendimiento() {
  const [ventasTotales, setVentasTotales] = useState([]);
  const [ventasFiltradas, setVentasFiltradas] = useState([]);
  const [datosGraficoBarras, setDatosGraficoBarras] = useState([]);
  const [datosGraficoArea, setDatosGraficoArea] = useState([]);
  const [filtroTiempo, setFiltroTiempo] = useState("todo");

  useEffect(() => {
    cargarDatos();
  }, []);

  // Cada vez que cambia el filtro o los datos originales, recalculamos
  useEffect(() => {
    aplicarFiltro();
  }, [ventasTotales, filtroTiempo]);

  const cargarDatos = async () => {
    try {
      const db = await getDb();
      const result = await db.select(`
        SELECT v.id, v.cantidad, v.precio_unitario, v.total, v.fecha, p.nombre 
        FROM ventas v
        JOIN productos p ON v.producto_id = p.id
        ORDER BY v.fecha ASC
      `);
      setVentasTotales(result);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
    }
  };

  const aplicarFiltro = () => {
    const ahora = new Date();
    
    const filtradas = ventasTotales.filter(v => {
      if (filtroTiempo === "todo") return true;
      
      const fechaVenta = new Date(v.fecha);
      const diffTiempo = Math.abs(ahora - fechaVenta);
      const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

      if (filtroTiempo === "dia") return diffDias <= 1; // Últimas 24 hs
      if (filtroTiempo === "semana") return diffDias <= 7;
      if (filtroTiempo === "mes") return diffDias <= 30;
      if (filtroTiempo === "ano") return diffDias <= 365;
      
      return true;
    });

    setVentasFiltradas(filtradas);
    procesarDatosGraficos(filtradas);
  };

  const procesarDatosGraficos = (datos) => {
    // 1. Gráfico de Barras (Productos)
    const ventasPorProducto = {};
    datos.forEach(v => {
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

    // 2. Gráfico de Montaña (Ingresos por día)
    const ingresosPorDia = {};
    datos.forEach(v => {
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
    if (ventasFiltradas.length === 0) return alert("No hay ventas para exportar en el período seleccionado.");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reporte de Ventas");

    sheet.columns = [
      { header: "Fecha", key: "fecha", width: 15 },
      { header: "Producto", key: "nombre", width: 30 },
      { header: "Cantidad Vendida", key: "cantidad", width: 18 },
      { header: "Precio Unitario", key: "precio", width: 18 },
      { header: "Total", key: "total", width: 20 }
    ];

    const filaCabecera = sheet.getRow(1);
    filaCabecera.font = { bold: true, color: { argb: "FFFFFFFF" } };
    filaCabecera.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }; 
    filaCabecera.alignment = { vertical: 'middle', horizontal: 'center' };

    let granTotal = 0;

    ventasFiltradas.forEach(v => {
      granTotal += v.total;
      sheet.addRow({
        fecha: new Date(v.fecha).toLocaleDateString(),
        nombre: v.nombre,
        cantidad: v.cantidad,
        precio: `$${v.precio_unitario.toFixed(2)}`,
        total: `$${v.total.toFixed(2)}`
      });
    });

    sheet.addRow({});

    const filaTotal = sheet.addRow({
      precio: "TOTAL RECAUDADO:",
      total: `$${granTotal.toFixed(2)}`
    });
    
    filaTotal.font = { bold: true, size: 12 };
    filaTotal.getCell('precio').alignment = { horizontal: 'right' };
    filaTotal.getCell('total').fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } }; 
    filaTotal.getCell('total').font = { color: { argb: "FFFFFFFF" }, bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Reporte_Comercial_${filtroTiempo}.xlsx`; // Nombre genérico y dinámico
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
        
        <div className="flex items-center gap-4">
          {/* Componente de Filtro de Tiempo */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <Calendar size={18} className="text-gray-500" />
            <select 
              value={filtroTiempo} 
              onChange={(e) => setFiltroTiempo(e.target.value)}
              className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer"
            >
              <option value="todo">Histórico Completo</option>
              <option value="dia">Últimas 24 horas</option>
              <option value="semana">Últimos 7 días</option>
              <option value="mes">Último mes</option>
              <option value="ano">Último año</option>
            </select>
          </div>

          <button 
            onClick={exportarAExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold transition-colors shadow-sm"
          >
            <Download size={20} />
            Exportar Reporte
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-1/2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-6">Productos más vendidos (Unidades)</h3>
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

        <div className="w-1/2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-700 mb-6">Ingresos generados ($)</h3>
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