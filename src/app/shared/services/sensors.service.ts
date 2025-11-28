import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, timer } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

export interface SensorData {
  id: number;
  device_id: string;
  timestamp: string;
  temperature: string | null;
  humidity: string | null;
  ph: string | null;
  conductivity: string | null;
  tds: string | null;
  n: string | null;
  p: string | null;
  k: string | null;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SensorsService {
  private apiUrl = 'http://localhost:3000';
  private latestDataSubject = new BehaviorSubject<SensorData | null>(null);
  
  // Observable público para que los componentes se suscriban
  public latestData$ = this.latestDataSubject.asObservable();

  constructor(private http: HttpClient) {
    this.startPolling();
  }

  /**
   * Obtiene la última lectura de sensores
   */
  getLatestSensorData(deviceId?: string): Observable<SensorData> {
    const url = deviceId ? 
      `${this.apiUrl}/sensors/latest?device_id=${deviceId}` : 
      `${this.apiUrl}/sensors/latest`;
    
    return this.http.get<SensorData>(url);
  }

  /**
   * Obtiene el histórico de lecturas
   */
  getSensorHistory(deviceId: string, limit?: number): Observable<SensorData[]> {
    const url = limit ? 
      `${this.apiUrl}/sensors/history?device_id=${deviceId}&limit=${limit}` : 
      `${this.apiUrl}/sensors/history?device_id=${deviceId}`;
    
    return this.http.get<SensorData[]>(url);
  }

  /**
   * Inicia el polling automático para actualizar datos cada 30 segundos
   */
  private startPolling(): void {
    // Actualizar cada 30 segundos
    timer(0, 30000).pipe(
      switchMap(() => this.getLatestSensorData('esp32-001')),
      tap(data => {
        this.latestDataSubject.next(data);
        console.log('Datos de sensores actualizados:', data);
      })
    ).subscribe({
      error: (error) => {
        console.error('Error al obtener datos de sensores:', error);
      }
    });
  }

  /**
   * Fuerza una actualización manual de los datos
   */
  refreshData(deviceId: string = 'esp32-001'): void {
    this.getLatestSensorData(deviceId).subscribe({
      next: (data) => {
        this.latestDataSubject.next(data);
      },
      error: (error) => {
        console.error('Error al refrescar datos:', error);
      }
    });
  }
}