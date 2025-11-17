import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../../../auth/services/auth.service';
import { UsersService, ApiResponse, Usuario } from '../../services/users.service';

@Component({
  selector: 'app-perfil-modal',
  templateUrl: './perfil-modal.component.html',
  styleUrls: ['./perfil-modal.component.scss'],
  standalone: false
})
export class PerfilModalComponent implements OnInit {
  @Input() user: Usuario | null = null;
  
  perfilForm: FormGroup;
  passwordForm: FormGroup;
  currentView: 'profile' | 'edit' | 'password' = 'profile';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private authService: AuthService,
    private usersService: UsersService
  ) {
    this.perfilForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    if (this.user) {
      this.perfilForm.patchValue({
        nombre: this.user.nombre,
        apellido: this.user.apellido,
        email: this.user.email
      });
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    return newPassword && confirmPassword && newPassword.value === confirmPassword.value 
      ? null : { passwordMismatch: true };
  }

  switchView(view: 'profile' | 'edit' | 'password') {
    this.currentView = view;
    if (view === 'edit' && this.user) {
      this.perfilForm.patchValue({
        nombre: this.user.nombre,
        apellido: this.user.apellido,
        email: this.user.email
      });
    }
  }

  onSubmitProfile() {
    if (this.perfilForm.valid && this.user) {
      this.isLoading = true;
      const profileData = this.perfilForm.value;
      
      this.usersService.updateProfile(this.user.id, profileData).subscribe({
        next: (response: ApiResponse<Usuario>) => {
          this.isLoading = false;
          if (response.success) {
            this.user = { ...this.user, ...profileData };
            this.currentView = 'profile';
            // Mostrar mensaje de éxito
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('Error al actualizar perfil:', error);
          // Mostrar mensaje de error
        }
      });
    }
  }

  onSubmitPassword() {
    if (this.passwordForm.valid && this.user) {
      this.isLoading = true;
      const { currentPassword, newPassword } = this.passwordForm.value;
      
      this.usersService.changePassword(this.user.id, currentPassword, newPassword).subscribe({
        next: (response: ApiResponse<any>) => {
          this.isLoading = false;
          if (response.success) {
            this.passwordForm.reset();
            this.currentView = 'profile';
            // Mostrar mensaje de éxito
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error('Error al cambiar contraseña:', error);
          // Mostrar mensaje de error
        }
      });
    }
  }

  dismiss() {
    this.activeModal.dismiss();
  }

  close() {
    this.activeModal.close();
  }

  getTipoUsuarioDisplay(tipo?: string): string {
    if (!tipo) return 'No especificado';
    switch (tipo) {
      case 'administrador':
        return 'Administrador';
      case 'estudiante':
        return 'Estudiante';
      case 'mantenimiento':
        return 'Mantenimiento';
      default:
        return tipo;
    }
  }

  formatDate(date?: Date | string): string {
    if (!date) return 'No disponible';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}