import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// ==========================================
// 1. TICKET DE CIERRE DE CAJA (Reporte A4)
// ==========================================

interface DatosReporte {
  empleado: string
  fechaApertura: string
  fechaCierre: string | null
  montoInicial: number
  totalVentas: number
  totalGastos: number
  cajaEsperada: number
  cajaReal: number | null
  diferencia: number | null
  gastos: { descripcion: string; monto: number }[]
}

export const generarTicketPDF = (datos: DatosReporte) => {
  // Crear documento A4
  const doc = new jsPDF()

  // Encabezado
  doc.setFontSize(22)
  doc.text("Planeta ZEGA", 105, 20, { align: "center" })
  
  doc.setFontSize(12)
  doc.text("Reporte de Cierre de Caja", 105, 30, { align: "center" })
  doc.line(20, 35, 190, 35) // Línea separadora

  // Info General
  doc.setFontSize(10)
  doc.text(`Empleado: ${datos.empleado}`, 20, 45)
  doc.text(`Apertura: ${datos.fechaApertura}`, 20, 50)
  doc.text(`Cierre: ${datos.fechaCierre || '---'}`, 20, 55)

  // Tabla de Resumen Financiero
  autoTable(doc, {
    startY: 65,
    head: [['Concepto', 'Monto']],
    body: [
      ['Caja Inicial', `$${datos.montoInicial}`],
      ['+ Ventas Totales', `$${datos.totalVentas}`],
      ['- Gastos/Retiros', `-$${datos.totalGastos}`],
      ['= CAJA ESPERADA', `$${datos.cajaEsperada}`],
      ['CAJA DECLARADA (Real)', datos.cajaReal ? `$${datos.cajaReal}` : '---'],
      ['DIFERENCIA', datos.diferencia ? `$${datos.diferencia}` : '---'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74] }, // Verde
  })

  // Detalle de Gastos (si hay)
  if (datos.gastos.length > 0) {
    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY + 15
    doc.text("Detalle de Gastos:", 20, finalY)
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Descripción', 'Monto']],
      body: datos.gastos.map(g => [g.descripcion, `$${g.monto}`]),
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] }, // Rojo
    })
  }

  // Pie de página
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.text("Generado automáticamente por el Sistema Planeta ZEGA", 105, pageHeight - 10, { align: "center" })

  // Descargar
  const nombreArchivo = `Cierre_${datos.empleado}_${datos.fechaApertura.replace(/[\/\s:]/g, '-')}.pdf`
  doc.save(nombreArchivo)
}


// ==========================================
// 2. TICKET DE VENTA (Térmico 80mm)
// ==========================================

interface ItemVenta {
  cantidad: number
  producto: string
  precioUnitario: number
  subtotal: number
}

interface DatosVenta {
  organizacion: string
  fecha: string
  items: ItemVenta[]
  total: number
  metodoPago: string
  vendedor?: string
}

export const generarTicketVenta = (datos: DatosVenta) => {
  // 1. Calcular altura dinámica del ticket según items (base 100mm + 7mm por producto)
  const alturaBase = 100 
  const alturaTicket = alturaBase + (datos.items.length * 7)
  
  // 2. Crear documento con ancho 80mm (Estándar Térmico)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, alturaTicket] 
  })

  // Configuración de fuente "Monospace" para apariencia de ticket
  doc.setFont("Courier", "normal")
  let y = 10 // Cursor vertical inicial

  // --- CABECERA ---
  doc.setFontSize(14)
  doc.setFont("Courier", "bold")
  // Centramos el título (40 es la mitad de 80mm)
  doc.text(datos.organizacion.toUpperCase(), 40, y, { align: "center" }) 
  
  y += 5
  doc.setFontSize(8)
  doc.setFont("Courier", "normal")
  doc.text("--------------------------------", 40, y, { align: "center" })
  
  y += 5
  doc.text(`Fecha: ${datos.fecha}`, 5, y)
  y += 4
  if(datos.vendedor) {
      doc.text(`Atendió: ${datos.vendedor}`, 5, y)
      y += 4
  }
  
  y += 2
  doc.text("--------------------------------", 40, y, { align: "center" })
  y += 5

  // --- LISTA DE PRODUCTOS ---
  // Encabezados: CANT | PROD | TOTAL
  doc.setFont("Courier", "bold")
  doc.text("CANT", 5, y)
  doc.text("PRODUCTO", 20, y)
  doc.text("TOTAL", 75, y, { align: "right" })
  y += 4

  doc.setFont("Courier", "normal")
  datos.items.forEach((item) => {
    // Nombre del producto truncado si es muy largo para que entre en una línea
    const nombre = item.producto.length > 18 
      ? item.producto.substring(0, 18) + ".." 
      : item.producto
    
    doc.text(item.cantidad.toString(), 5, y)
    doc.text(nombre, 20, y)
    doc.text(`$${item.subtotal}`, 75, y, { align: "right" })
    y += 5
  })

  // --- TOTALES ---
  y += 2
  doc.text("--------------------------------", 40, y, { align: "center" })
  y += 5

  doc.setFontSize(14)
  doc.setFont("Courier", "bold")
  doc.text(`TOTAL: $${datos.total}`, 75, y, { align: "right" })
  
  y += 6
  doc.setFontSize(9)
  doc.setFont("Courier", "normal")
  doc.text(`Pago: ${datos.metodoPago.toUpperCase()}`, 75, y, { align: "right" })

  // --- PIE DE PÁGINA ---
  y += 10
  doc.setFontSize(8)
  doc.text("¡Gracias por su compra!", 40, y, { align: "center" })
  y += 4
  doc.text("vuelva pronto", 40, y, { align: "center" })

  // Guardar PDF
  const nombreArchivo = `Ticket_${datos.fecha.replace(/[\/\s:]/g, '-')}.pdf`
  
  // Abre el PDF en una nueva pestaña para imprimirlo directo (funciona mejor en móviles)
  // const pdfBlob = doc.output('bloburl');
  // window.open(pdfBlob, '_blank');
  
  doc.save(nombreArchivo)
}