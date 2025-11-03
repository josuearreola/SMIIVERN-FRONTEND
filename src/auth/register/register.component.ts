import { Component, OnInit } from '@angular/core';
import { Form, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  standalone: false
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  errorMessage: string = '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  // Validadores personalizados
  private passwordValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(value);
    const hasNoSpaces = !/\s/.test(value);
    const isLengthValid = value.length >= 8;

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecial && hasNoSpaces && isLengthValid;

    return passwordValid ? null : {
      passwordStrength: {
        hasUpperCase,
        hasLowerCase, 
        hasNumeric,
        hasSpecial,
        hasNoSpaces,
        isLengthValid
      }
    };
  }

  private nameValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value?.trim();
    if (!value) return null;

    const hasOnlyLettersAndSpaces = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value);
    const isLengthValid = value.length >= 2 && value.length <= 50;

    return hasOnlyLettersAndSpaces && isLengthValid ? null : {
      nameInvalid: { hasOnlyLettersAndSpaces, isLengthValid }
    };
  }

  ngOnInit(): void {
    this.initForm();
  }
  private initForm(): void {
    this.registerForm = this.fb.group({
      email: ['', [
        Validators.required, 
        Validators.email,
        Validators.maxLength(254),
        (control: AbstractControl) => {
          const value = control.value;
          return value && /\s/.test(value) ? { hasSpaces: true } : null;
        }
      ]],
      password: ['', [
        Validators.required, 
        this.passwordValidator
      ]],
      nombre: ['', [
        Validators.required,
        this.nameValidator
      ]],
      apellido: ['', [
        Validators.required,
        this.nameValidator  
      ]],
      tipoUsuario: ['estudiante']
    });
  }
  onSubmit(): void {
    this.markFormGroupTouched(this.registerForm);
    
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.authService.register(this.registerForm.value).subscribe({
        next: () => {
          this.router.navigate(['/login']);
        },
        error: (error) => {
          if (error.status === 409) {
            this.errorMessage = 'Este email ya está registrado';
          } else if (error.status === 404) {
            this.errorMessage = 'Error de conexión con el servidor';
          } else {
            this.errorMessage = error.error?.message || 'Error en el registro';
          }
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    
    if (field?.errors && (field.touched || field.dirty || field?.value)) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['email']) return 'Ingresa un email válido (ejemplo@dominio.com)';
      if (field.errors['hasSpaces']) return 'No debe contener espacios';
      if (field.errors['maxlength']) return 'Demasiado largo';
      
      // Para contraseña ya no mostramos mensaje simple, usamos el componente visual
      if (field.errors['passwordStrength']) {
        return ''; // El componente visual maneja esto
      }
      
      if (field.errors['nameInvalid']) {
        const errors = field.errors['nameInvalid'];
        if (!errors.hasOnlyLettersAndSpaces) return 'Solo se permiten letras y espacios';
        if (!errors.isLengthValid) return 'Debe tener entre 2 y 50 caracteres';
      }
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field?.invalid && (field?.touched || field?.dirty || field?.value));
  }
}
