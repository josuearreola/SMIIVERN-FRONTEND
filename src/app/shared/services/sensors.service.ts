import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, throwError } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';

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
  getSensorHistory(deviceId?: string, limit?: number): Observable<SensorData[]> {
    let url = `${this.apiUrl}/sensors/history`;
    const params: string[] = [];

    if (deviceId) {
      params.push(`device_id=${deviceId}`);
    }
    if (limit) {
      params.push(`limit=${limit}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    console.log(`Solicitando histórico de sensores: ${url}`);
    
    return this.http.get<SensorData[]>(url).pipe(
      tap(data => console.log(`Histórico recibido: ${data.length} registros`)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al obtener histórico de sensores:', error);
        if (error.status === 401) {
          console.error('Error de autenticación - Token JWT inválido o expirado');
        } else if (error.status === 403) {
          console.error('Error de autorización - Sin permisos');
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Inicia el polling automático para actualizar datos cada 2 segundos
   */
  private startPolling(): void {
    // Actualizar cada 2 segundos
    timer(0, 2000).pipe(
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