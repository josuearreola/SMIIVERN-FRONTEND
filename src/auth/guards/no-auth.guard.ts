import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { TokenService } from "../services/token.service";

@Injectable({
    providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {
    constructor(
        private tokenService: TokenService,
        private router: Router
    ) {}

    canActivate(): boolean {
        // Si ya está autenticado, redirigir al dashboard
        if (this.tokenService.getToken()) {
            this.router.navigate(['/dashboard']);
            return false;
        } else {
            // Si no está autenticado, puede acceder al login
            return true;
        }
    }
}