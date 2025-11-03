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
    }
    onSubmit(): void {
        if (this.loginForm.valid){
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
