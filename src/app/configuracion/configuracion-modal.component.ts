import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UsersService, Usuario } from '../shared/services/users.service';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-configuracion-modal',
  templateUrl: './configuracion-modal.component.html',
  styleUrls: ['./configuracion-modal.component.scss'],
  standalone: false
})
export class ConfiguracionModalComponent implements OnInit, OnDestroy {
  @Output() closeModal = new EventEmitter<void>();
  
  usuarios: Usuario[] = [];
  loading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private usersService: UsersService,
    public themeService: ThemeService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers() {
    this.loading = true;
    this.error = null;

    this.usersService.getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.usuarios = response.data;
          } else {
            this.error = response.message || 'Error al cargar usuarios';
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading users:', err);
          this.error = 'Error de conexión al cargar usuarios';
          this.loading = false;
        }
      });
  }

  toggleUserStatus(usuario: Usuario) {
    this.usersService.toggleUserStatus(usuario.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            // Actualizar el usuario en la lista
            const index = this.usuarios.findIndex(u => u.id === usuario.id);
            if (index !== -1) {
              this.usuarios[index] = response.data;
            }
            
            // Mostrar mensaje de éxito
            console.log(response.message);
          } else {
            this.error = response.message || 'Error al cambiar estado del usuario';
          }
        },
        error: (err: any) => {
          console.error('Error toggling user status:', err);
          this.error = 'Error de conexión al cambiar estado del usuario';
        }
      });
  }

  updateUserType(usuario: Usuario, newType: string) {
    this.usersService.updateUserType(usuario.id, newType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            // Actualizar el usuario en la lista
            const index = this.usuarios.findIndex(u => u.id === usuario.id);
            if (index !== -1) {
              this.usuarios[index] = response.data;
            }
            
            // Mostrar mensaje de éxito
            console.log(response.message);
          } else {
            this.error = response.message || 'Error al cambiar tipo de usuario';
          }
        },
        error: (err: any) => {
          console.error('Error updating user type:', err);
          this.error = 'Error de conexión al cambiar tipo de usuario';
        }
      });
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTipoUsuarioDisplay(tipo: string): string {
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

  getTipoUsuarioClass(tipo: string): string {
    switch (tipo) {
      case 'administrador':
        return 'tipo-admin';
      case 'estudiante':
        return 'tipo-estudiante';
      case 'mantenimiento':
        return 'tipo-mantenimiento';
      default:
        return '';
    }
  }

  getStatusClass(activo: boolean): string {
    return activo ? 'status-active' : 'status-inactive';
  }

  getStatusText(activo: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }

  getActionText(activo: boolean): string {
    return activo ? 'Deshabilitar' : 'Habilitar';
  }

  getActionClass(activo: boolean): string {
    return activo ? 'btn-disable' : 'btn-enable';
  }

  trackByUserId(index: number, usuario: Usuario): number {
    return usuario.id;
  }

  onCloseModal(): void {
    this.closeModal.emit();
  }

  getUserTypeOptions(): Array<{value: string, label: string}> {
    return [
      { value: 'administrador', label: 'Administrador' },
      { value: 'estudiante', label: 'Estudiante' },
      { value: 'mantenimiento', label: 'Mantenimiento' }
    ];
  }

  getNextUserType(currentType: string): string {
    const types = ['administrador', 'estudiante', 'mantenimiento'];
    const currentIndex = types.indexOf(currentType);
    const nextIndex = (currentIndex + 1) % types.length;
    return types[nextIndex];
  }

  onUserTypeChange(usuario: Usuario, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newType = target.value;
    if (newType !== usuario.tipoUsuario) {
      this.updateUserType(usuario, newType);
    }
  }
}