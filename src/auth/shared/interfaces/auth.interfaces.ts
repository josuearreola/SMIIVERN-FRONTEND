export interface LoginCredentials {
    email:string;
    password:string;
}
export interface LoginResponse {
    access_token: string;
    user: UserInfo;
}
export interface UserInfo {
    id: number;
    email: string;
    nombre: string;
    apellido: string;
    tipoUsuario: string;
}