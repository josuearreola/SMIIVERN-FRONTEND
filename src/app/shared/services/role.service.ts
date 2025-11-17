import { Inject, Injectable} from '@angular/core'
import { TokenService } from '../../../auth/services/token.service';

export enum RolUsuario {
    ADMINISTRADOR = 'administrador',
    USUARIO = 'estudiante',
    MANTENIMIENTO = 'mantenimiento'
}
@Injectable({
    providedIn: 'root'
})
export class RoleService {
    constructor(private tokenService: TokenService) {}

    obtenerRolUsuarioActivo(): RolUsuario | null {
        const infoUsuario = this.tokenService.getUserInfo();
        return infoUsuario ? infoUsuario.tipoUsuario as RolUsuario : null;
    }
    esAdministrador(): boolean {
        return this.obtenerRolUsuarioActivo() === RolUsuario.ADMINISTRADOR;
    }
    esEstudiante(): boolean {
        return this.obtenerRolUsuarioActivo() === RolUsuario.USUARIO;
    }
    esMantenimiento(): boolean {
        return this.obtenerRolUsuarioActivo() === RolUsuario.MANTENIMIENTO;
    }

    puedeAccederConfiguracion(): boolean{
        const rol = this.obtenerRolUsuarioActivo();
        return rol === RolUsuario.ADMINISTRADOR
    }
    puedeControlarRiego(): boolean{
        const rol = this.obtenerRolUsuarioActivo();
        return rol === RolUsuario.ADMINISTRADOR || rol === RolUsuario.MANTENIMIENTO;
    }
    puedeCrearPerfilesActivos(): boolean{
        const rol = this.obtenerRolUsuarioActivo();
        return rol === RolUsuario.ADMINISTRADOR || rol === RolUsuario.MANTENIMIENTO;
    }
    puedeVerPerfilesActivos(): boolean {
        // Todos los usuarios pueden ver perfiles activos
        return true;
    }
     puedeAccederReportes(): boolean{
        const rol = this.obtenerRolUsuarioActivo();
        return rol === RolUsuario.ADMINISTRADOR || rol === RolUsuario.MANTENIMIENTO;
    }

}


