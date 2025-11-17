import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenService } from '../../auth/services/token.service';
import { RoleService } from '../shared/services/role.service';

export interface PerfilPlanta {
  id: number;
  nombre: string;
  descripcion?: string;
  temperaturaMin: number;
  temperaturaMax: number;
  temperaturaOptima?: number;
  humedadMin: number;
  humedadMax: number;
  humedadOptima?: number;
  phMin: number;
  phMax: number;
  phOptimo?: number;
  nitrogenoMin: number;
  nitrogenoMax: number;
  nitrogenoOptimo?: number;
  fosforoMin: number;
  fosforoMax: number;
  fosforoOptimo?: number;
  potasioMin: number;
  potasioMax: number;
  potasioOptimo?: number;
  luzMin?: number;
  luzMax?: number;
  horasLuzDiarias?: number;
  diasGerminacion?: number;
  diasCosecha?: number;
  tipoPlanta?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PerfilesPlantas {
  private apiUrl = `${environment.apiUrl}/plant-profiles`;
  private perfilesSubject = new BehaviorSubject<PerfilPlanta[]>([]);
  private perfilActivoSubject = new BehaviorSubject<PerfilPlanta | null>(null);

  public perfiles$ = this.perfilesSubject.asObservable();
  public perfilActivo$ = this.perfilActivoSubject.asObservable();

  constructor(private http: HttpClient, private tokenService: TokenService, private roleService: RoleService) {
    // No cargar automáticamente, solo cuando se necesite
  }

  private getHeaders(): HttpHeaders {
    const token = this.tokenService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  cargarPerfiles(): void {
    // Verificar si el usuario está autenticado
    if (!this.tokenService.getToken()) {
      console.log('Usuario no autenticado, no se pueden cargar perfiles');
      this.perfilesSubject.next([]);
      return;
    }

    // Determinar si incluir inactivos según el rol
    const incluirInactivos = this.roleService.esAdministrador();
    const params = incluirInactivos ? '?incluirInactivos=true' : '';

    this.http.get<PerfilPlanta[]>(`${this.apiUrl}${params}`, { headers: this.getHeaders() })
      .subscribe({
        next: (perfiles) => {
          this.perfilesSubject.next(perfiles);
        },
        error: (error) => {
          console.error('Error al cargar perfiles:', error);
          if (error.status === 401) {
            console.log('Token expirado o inválido');
            this.tokenService.clearAuth();
          }
          this.perfilesSubject.next([]);
        }
      });
  }

  obtenerPorId(id: number): Observable<PerfilPlanta> {
    return this.http.get<PerfilPlanta>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  crear(perfil: Partial<PerfilPlanta>): Observable<PerfilPlanta> {
    return this.http.post<PerfilPlanta>(this.apiUrl, perfil, { headers: this.getHeaders() });
  }

  actualizar(id: number, perfil: Partial<PerfilPlanta>): Observable<PerfilPlanta> {
    return this.http.patch<PerfilPlanta>(`${this.apiUrl}/${id}`, perfil, { headers: this.getHeaders() });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/fisico`, { headers: this.getHeaders() });
  }

  reactivar(id: number): Observable<PerfilPlanta> {
    return this.http.patch<PerfilPlanta>(`${this.apiUrl}/${id}/reactivar`, {}, { headers: this.getHeaders() });
  }

  obtenerEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estadisticas`, { headers: this.getHeaders() });
  }

  seleccionarPerfilActivo(perfil: PerfilPlanta | null): void {
    this.perfilActivoSubject.next(perfil);
    if (perfil) {
      localStorage.setItem('perfil_activo_id', perfil.id.toString());
    } else {
      localStorage.removeItem('perfil_activo_id');
    }
  }

  cargarPerfilActivoGuardado(): void {
    if (!this.tokenService.getToken()) {
      return; // No hay sesión activa
    }

    const perfilActivoId = localStorage.getItem('perfil_activo_id');
    if (perfilActivoId) {
      this.obtenerPorId(parseInt(perfilActivoId)).subscribe({
        next: (perfil) => this.perfilActivoSubject.next(perfil),
        error: (error) => {
          console.log('Error al cargar perfil activo:', error);
          this.perfilActivoSubject.next(null);
          localStorage.removeItem('perfil_activo_id');
        }
      });
    }
  }

  get perfiles(): PerfilPlanta[] {
    return this.perfilesSubject.value;
  }

  get perfilActivo(): PerfilPlanta | null {
    return this.perfilActivoSubject.value;
  }
}