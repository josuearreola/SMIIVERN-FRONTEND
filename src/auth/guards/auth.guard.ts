import { Injectable } from "@angular/core";
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { TokenService } from "../services/token.service";

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(
        private tokenService: TokenService,
        private router: Router
    ) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        const token = this.tokenService.getToken();
        
        if (token) {
            // Si tiene token, verificar que no esté expirado
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const now = Math.floor(Date.now() / 1000);
                
                if (payload.exp && payload.exp > now) {
                    return true;
                } else {
                    // Token expirado
                    this.tokenService.clearAuth();
                    this.router.navigate(['/login']);
                    return false;
                }
            } catch (error) {
                // Token inválido
                this.tokenService.clearAuth();
                this.router.navigate(['/login']);
                return false;
            }
        } else {
            // No hay token
            this.router.navigate(['/login']);
            return false;
        }
    }
}