import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface SensorData {
  id?: string;
  temperature?: string | null;
  humidity?: string | null;
  ph?: string | null;
  n?: string | null;
  p?: string | null;
  k?: string | null;
  timestamp?: string;
}

interface DataAnalysis {
  temperature: {
    avg: number;
    min: number;
    max: number;
    status: string;
  };
  humidity: {
    avg: number;
    min: number;
    max: number;
    status: string;
  };
  ph: {
    avg: number;
    min: number;
    max: number;
    status: string;
  };
  nitrogen: {
    avg: number;
    status: string;
  };
  phosphorus: {
    avg: number;
    status: string;
  };
  potassium: {
    avg: number;
    status: string;
  };
}

interface Recommendation {
  title: string;
  description: string;
  priority: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private currentReport: {
    data: SensorData[];
    analysis?: DataAnalysis;
    recommendations?: Recommendation[];
  } = { data: [] };

  constructor() { }

  generatePDF(data: SensorData[]): void {
    this.currentReport.data = data;
    this.currentReport.analysis = this.analyzeData(data);
    this.currentReport.recommendations = this.generateRecommendations(this.currentReport.analysis);
    
    const doc = new jsPDF();
    
    // Header empresarial
    this.addHeader(doc);
    
    // Configuración de espaciado
    let currentY = 40;
    
    // Resumen ejecutivo
    currentY = this.addExecutiveSummary(doc, this.currentReport.analysis, currentY);
    
    // Análisis detallado
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    currentY = this.addDetailedAnalysis(doc, this.currentReport.analysis, currentY);
    
    // Tabla de datos
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    currentY = this.addDataTable(doc, data, currentY);
    
    // Recomendaciones
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    this.addRecommendations(doc, this.currentReport.recommendations, currentY);
    
    // Footer en todas las páginas
    this.addFooters(doc);
    
    // Descargar PDF
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save('reporte-smiivern-' + timestamp + '.pdf');
  }

  private analyzeData(data: SensorData[]): DataAnalysis {
    const validData = data.filter(d => d.temperature != null && d.humidity != null && d.ph != null);
    
    if (validData.length === 0) {
      return {
        temperature: { avg: 0, min: 0, max: 0, status: 'Sin datos' },
        humidity: { avg: 0, min: 0, max: 0, status: 'Sin datos' },
        ph: { avg: 0, min: 0, max: 0, status: 'Sin datos' },
        nitrogen: { avg: 0, status: 'Sin datos' },
        phosphorus: { avg: 0, status: 'Sin datos' },
        potassium: { avg: 0, status: 'Sin datos' }
      };
    }

    const temps = validData.map(d => parseFloat(d.temperature!)).filter(t => !isNaN(t));
    const hums = validData.map(d => parseFloat(d.humidity!)).filter(h => !isNaN(h));
    const phs = validData.map(d => parseFloat(d.ph!)).filter(p => !isNaN(p));
    const ns = validData.map(d => d.n && d.n !== null ? parseFloat(d.n) : 0).filter(n => !isNaN(n));
    const ps = validData.map(d => d.p && d.p !== null ? parseFloat(d.p) : 0).filter(p => !isNaN(p));
    const ks = validData.map(d => d.k && d.k !== null ? parseFloat(d.k) : 0).filter(k => !isNaN(k));

    return {
      temperature: {
        avg: this.average(temps),
        min: Math.min(...temps),
        max: Math.max(...temps),
        status: this.getTemperatureStatus(this.average(temps))
      },
      humidity: {
        avg: this.average(hums),
        min: Math.min(...hums),
        max: Math.max(...hums),
        status: this.getHumidityStatus(this.average(hums))
      },
      ph: {
        avg: this.average(phs),
        min: Math.min(...phs),
        max: Math.max(...phs),
        status: this.getPHStatus(this.average(phs))
      },
      nitrogen: {
        avg: this.average(ns),
        status: this.getNutrientStatus(this.average(ns), 'nitrogen')
      },
      phosphorus: {
        avg: this.average(ps),
        status: this.getNutrientStatus(this.average(ps), 'phosphorus')
      },
      potassium: {
        avg: this.average(ks),
        status: this.getNutrientStatus(this.average(ks), 'potassium')
      }
    };
  }

  private average(arr: number[]): number {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  private getTemperatureStatus(temp: number): string {
    if (temp < 15) return 'Muy Frío';
    if (temp < 20) return 'Frío';
    if (temp <= 25) return 'Óptimo';
    if (temp <= 30) return 'Caluroso';
    return 'Muy Caluroso';
  }

  private getHumidityStatus(hum: number): string {
    if (hum < 30) return 'Muy Seco';
    if (hum < 50) return 'Seco';
    if (hum <= 70) return 'Óptimo';
    if (hum <= 85) return 'Húmedo';
    return 'Muy Húmedo';
  }

  private getPHStatus(ph: number): string {
    if (ph < 6.0) return 'Muy Ácido';
    if (ph < 6.5) return 'Ácido';
    if (ph <= 7.5) return 'Óptimo';
    if (ph <= 8.0) return 'Alcalino';
    return 'Muy Alcalino';
  }

  private getNutrientStatus(value: number, nutrient: string): string {
    const thresholds = {
      nitrogen: { low: 20, high: 40 },
      phosphorus: { low: 15, high: 30 },
      potassium: { low: 100, high: 200 }
    };
    
    const threshold = thresholds[nutrient as keyof typeof thresholds];
    if (value < threshold.low) return 'Deficiente';
    if (value <= threshold.high) return 'Adecuado';
    return 'Excesivo';
  }

  private addHeader(doc: jsPDF): void {
    // Logo y título empresarial
    doc.setFillColor(0, 102, 51); // Verde corporativo
    doc.rect(0, 0, 210, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SMIIVERN', 20, 16);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Monitoreo Inteligente', 120, 12);
    doc.text('Reporte de Análisis de Cultivos', 120, 20);
    
    // Línea decorativa
    doc.setDrawColor(0, 102, 51);
    doc.setLineWidth(2);
    doc.line(20, 30, 190, 30);
    
    doc.setTextColor(0, 0, 0); // Reset color
  }

  private addExecutiveSummary(doc: jsPDF, analysis: DataAnalysis, startY: number): number {
    let currentY = startY + 10;
    
    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 51);
    doc.text('RESUMEN EJECUTIVO', 20, currentY);
    currentY += 15;
    
    // Caja de resumen
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(20, currentY - 5, 170, 45, 3, 3, 'FD');
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    const summaryText = [
      'Este reporte presenta el análisis de ' + this.currentReport.data.length + ' mediciones de sensores.',
      'Estado general del cultivo: ' + this.getOverallStatus(analysis),
      'Fecha de generación: ' + new Date().toLocaleDateString('es-ES'),
      'Parámetros monitoreados: Temperatura, Humedad, pH y Nutrientes (N-P-K)'
    ];
    
    summaryText.forEach((text, index) => {
      doc.text(text, 25, currentY + (index * 8));
    });
    
    return currentY + 55;
  }

  private getOverallStatus(analysis: DataAnalysis): string {
    const statuses = [
      analysis.temperature.status,
      analysis.humidity.status,
      analysis.ph.status
    ];
    
    if (statuses.includes('Óptimo')) return 'Bueno';
    if (statuses.some(s => s.includes('Muy'))) return 'Requiere Atención';
    return 'Aceptable';
  }

  private addDetailedAnalysis(doc: jsPDF, analysis: DataAnalysis, startY: number): number {
    let currentY = startY;
    
    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 51);
    doc.text('ANÁLISIS DETALLADO', 20, currentY);
    currentY += 20;
    
    // Configuración de columnas
    const col1X = 25;
    const col2X = 110;
    const contentY = currentY;
    
    // Sección Ambiente
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Condiciones Ambientales', col1X, contentY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Temperatura: ' + analysis.temperature.avg.toFixed(1) + '°C (' + analysis.temperature.status + ')', col1X, contentY + 12);
    doc.text('Rango: ' + analysis.temperature.min.toFixed(1) + '°C - ' + analysis.temperature.max.toFixed(1) + '°C', col1X, contentY + 22);
    
    doc.text('Humedad: ' + analysis.humidity.avg.toFixed(1) + '% (' + analysis.humidity.status + ')', col1X, contentY + 38);
    doc.text('Rango: ' + analysis.humidity.min.toFixed(1) + '% - ' + analysis.humidity.max.toFixed(1) + '%', col1X, contentY + 48);
    
    // Sección Suelo
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Análisis de Suelo', col2X, contentY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('pH: ' + analysis.ph.avg.toFixed(1) + ' (' + analysis.ph.status + ')', col2X, contentY + 12);
    doc.text('Rango: ' + analysis.ph.min.toFixed(1) + ' - ' + analysis.ph.max.toFixed(1), col2X, contentY + 22);
    
    // Nutrientes
    const nutrientY = contentY + 65;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Nutrientes', col1X, nutrientY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Nitrógeno (N): ' + analysis.nitrogen.avg.toFixed(0) + ' mg/kg (' + analysis.nitrogen.status + ')', col1X, nutrientY + 12);
    doc.text('Fósforo (P): ' + analysis.phosphorus.avg.toFixed(0) + ' mg/kg (' + analysis.phosphorus.status + ')', col1X, nutrientY + 22);
    doc.text('Potasio (K): ' + analysis.potassium.avg.toFixed(0) + ' mg/kg (' + analysis.potassium.status + ')', col1X, nutrientY + 32);
    
    return nutrientY + 50;
  }

  private addDataTable(doc: jsPDF, data: SensorData[], startY: number): number {
    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 51);
    doc.text('DATOS DETALLADOS', 20, startY);
    
    // Preparar datos para la tabla
    const tableData = data.slice(0, 20).map(item => [
      new Date(item.timestamp || '').toLocaleDateString('es-ES'),
      item.temperature && item.temperature !== null ? parseFloat(item.temperature).toFixed(1) + '°C' : 'N/A',
      item.humidity && item.humidity !== null ? parseFloat(item.humidity).toFixed(1) + '%' : 'N/A',
      item.ph && item.ph !== null ? parseFloat(item.ph).toFixed(1) : 'N/A',
      item.n && item.n !== null ? parseFloat(item.n).toFixed(0) : 'N/A',
      item.p && item.p !== null ? parseFloat(item.p).toFixed(0) : 'N/A',
      item.k && item.k !== null ? parseFloat(item.k).toFixed(0) : 'N/A'
    ]);

    // Usar autoTable importado directamente
    autoTable(doc, {
      head: [['Fecha', 'Temp (°C)', 'Humedad (%)', 'pH', 'N (mg/kg)', 'P (mg/kg)', 'K (mg/kg)']],
      body: tableData,
      startY: startY + 10,
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [0, 102, 51],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      margin: { left: 20, right: 20 }
    });

    return doc.lastAutoTable.finalY + 20;
  }

  private generateRecommendations(analysis: DataAnalysis): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Recomendaciones de temperatura
    if (analysis.temperature.avg < 18) {
      recommendations.push({
        title: 'Incrementar temperatura',
        description: 'Considere implementar sistemas de calefacción o invernaderos para mejorar las condiciones térmicas.',
        priority: 'Alta'
      });
    } else if (analysis.temperature.avg > 28) {
      recommendations.push({
        title: 'Reducir temperatura',
        description: 'Implemente sistemas de ventilación o sombreado para reducir el estrés térmico de los cultivos.',
        priority: 'Alta'
      });
    }
    
    // Recomendaciones de humedad
    if (analysis.humidity.avg < 40) {
      recommendations.push({
        title: 'Aumentar humedad',
        description: 'Incremente la frecuencia de riego o instale sistemas de nebulización.',
        priority: 'Media'
      });
    } else if (analysis.humidity.avg > 80) {
      recommendations.push({
        title: 'Controlar humedad',
        description: 'Mejore la ventilación para prevenir enfermedades fúngicas.',
        priority: 'Media'
      });
    }
    
    // Recomendaciones de pH
    if (analysis.ph.avg < 6.0) {
      recommendations.push({
        title: 'Ajustar pH del suelo',
        description: 'Aplique cal agrícola para neutralizar la acidez del suelo.',
        priority: 'Alta'
      });
    } else if (analysis.ph.avg > 8.0) {
      recommendations.push({
        title: 'Reducir alcalinidad',
        description: 'Aplique azufre elemental o sulfato de hierro para reducir el pH.',
        priority: 'Alta'
      });
    }
    
    // Recomendaciones de nutrientes
    if (analysis.nitrogen.status === 'Deficiente') {
      recommendations.push({
        title: 'Fertilización nitrogenada',
        description: 'Aplique fertilizantes ricos en nitrógeno como urea o nitrato de amonio.',
        priority: 'Alta'
      });
    }
    
    if (analysis.phosphorus.status === 'Deficiente') {
      recommendations.push({
        title: 'Suplementar fósforo',
        description: 'Utilice superfosfato simple o fosfato diamónico.',
        priority: 'Media'
      });
    }
    
    if (analysis.potassium.status === 'Deficiente') {
      recommendations.push({
        title: 'Añadir potasio',
        description: 'Aplique cloruro o sulfato de potasio según las necesidades del cultivo.',
        priority: 'Media'
      });
    }
    
    return recommendations;
  }

  private addRecommendations(doc: jsPDF, recommendations: Recommendation[], startY: number): void {
    let currentY = startY;
    
    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 51);
    doc.text('RECOMENDACIONES', 20, currentY);
    currentY += 15;
    
    if (recommendations.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('No se identificaron áreas de mejora. Condiciones óptimas.', 25, currentY);
      return;
    }
    
    recommendations.forEach((rec, index) => {
      if (currentY > 240) {
        doc.addPage();
        currentY = 30;
      }
      
      // Número y título
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 102, 51);
      doc.text((index + 1) + '. ' + rec.title, 25, currentY);
      
      // Prioridad
      const priorityColor = rec.priority === 'Alta' ? [220, 53, 69] : 
                           rec.priority === 'Media' ? [255, 193, 7] : [40, 167, 69];
      doc.setFontSize(8);
      doc.setTextColor(priorityColor[0], priorityColor[1], priorityColor[2]);
      doc.text('[' + rec.priority + ']', 170, currentY);
      
      // Descripción
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(rec.description, 160);
      doc.text(descLines, 25, currentY + 10);
      
      currentY += 30;
    });
  }

  private addFooters(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Línea de footer
      doc.setDrawColor(0, 102, 51);
      doc.setLineWidth(1);
      doc.line(20, 285, 190, 285);
      
      // Texto de footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      
      doc.text('SMIIVERN - Sistema de Monitoreo Inteligente para Cultivos', 20, 292);
      doc.text('Página ' + i + ' de ' + pageCount, 190, 292, { align: 'right' });
      doc.text('Generado el ' + new Date().toLocaleDateString('es-ES'), 105, 292, { align: 'center' });
    }
  }
}