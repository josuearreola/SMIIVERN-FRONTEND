import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService}  from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { LoginResponse } from '../shared/interfaces/auth.interfaces';
@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    standalone: false
})
export class LoginComponent implements OnInit {
    loginForm!: FormGroup;
    isLoading = false;
    errorMessage: string = '';
    isPasswordTouched = false;
    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private tokenService: TokenService,
        private router: Router
    ){}
    ngOnInit(): void {
        this.initForm();
    }

    private initForm(): void {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required]]
        });
        
        // Detectar cuando el usuario empieza a escribir en el campo password
        this.loginForm.get('password')?.valueChanges.subscribe(value => {
            // Se habilita si hay aunque sea un carácter en password
            this.isPasswordTouched = value && value.length > 0;
        });
    }
    onSubmit(): void {
        // Verificar que al menos haya algo en password para permitir el submit
        if (this.isPasswordTouched) {
            this.isLoading = true;
            this.errorMessage = '';
            
            this.authService.login(this.loginForm.value).subscribe({
                next: (response: LoginResponse) => {
                    this.tokenService.setAuthToken(response.access_token, response.user);
                    this.router.navigate(['/dashboard'])
                },
                error: (error) =>{
                    this.errorMessage = error.error?.message || 'Error al iniciar sesion';
                    this.isLoading = false;
                },
                complete: () => {
                    this.isLoading = false;
                }
            });
        }
    }
}
