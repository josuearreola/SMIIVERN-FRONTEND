import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginCredentials, LoginResponse} from '../shared/interfaces/auth.interfaces'
import { environment } from '../../environments/environment';
import { HttpHeaders } from '@angular/common/http';

const httpOptions = {
    headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    })
};
@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly API_BASE_URL = environment.apiUrl
    private readonly AUTH_ENDPOINTS = {
        login: `${this.API_BASE_URL}/auth/login`,
        registro: `${this.API_BASE_URL}/auth/register`
    }
    constructor(private http: HttpClient) {}

    login(credentials: { email: string, password: string }): Observable<any> {
        return this.http.post(this.AUTH_ENDPOINTS.login, credentials, httpOptions);
    }
    register(userData: {
        email: string,
        password: string,
        nombre: string,
        apellido: string,
        tipoUsuario: string
    }): Observable<any> {
        return this.http.post(this.AUTH_ENDPOINTS.registro, userData)
    }
}