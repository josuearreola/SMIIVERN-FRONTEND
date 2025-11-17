import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService } from '../../../auth/services/token.service';

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  tipoUsuario: 'administrador' | 'estudiante' | 'mantenimiento';
  activo: boolean;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.tokenService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAllUsers(): Observable<ApiResponse<Usuario[]>> {
    return this.http.get<ApiResponse<Usuario[]>>(this.apiUrl, {
      headers: this.getHeaders()
    });
  }

  getUserById(id: number): Observable<ApiResponse<Usuario>> {
    return this.http.get<ApiResponse<Usuario>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  toggleUserStatus(id: number): Observable<ApiResponse<Usuario>> {
    return this.http.patch<ApiResponse<Usuario>>(`${this.apiUrl}/${id}/toggle-status`, {}, {
      headers: this.getHeaders()
    });
  }

  updateUserStatus(id: number, activo: boolean): Observable<ApiResponse<Usuario>> {
    return this.http.patch<ApiResponse<Usuario>>(`${this.apiUrl}/${id}/status`, { activo }, {
      headers: this.getHeaders()
    });
  }

  updateUserType(id: number, tipoUsuario: string): Observable<ApiResponse<Usuario>> {
    return this.http.patch<ApiResponse<Usuario>>(`${this.apiUrl}/${id}/user-type`, { tipoUsuario }, {
      headers: this.getHeaders()
    });
  }
}