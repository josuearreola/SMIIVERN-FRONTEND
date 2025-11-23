import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { PerfilesPlantas, PerfilPlanta } from './perfiles-plantas.service';
import { RoleService } from '../shared/services/role.service';

@Component({
  selector: 'app-modal-perfiles',
  templateUrl: './modal-perfiles.component.html',
  styleUrls: ['./modal-perfiles.component.scss'],
  standalone: false
})
export class ModalPerfilesComponent implements OnInit, OnDestroy, OnChanges {
  @Input() show: boolean = false;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() perfilSeleccionado = new EventEmitter<PerfilPlanta>();

  perfiles: PerfilPlanta[] = [];
  perfilActivo: PerfilPlanta | null = null;
  private subscriptions: Subscription[] = [];
  cargandoPerfiles: boolean = false;

  // Variables para el formulario
  showFormModal: boolean = false;
  perfilParaEditar: PerfilPlanta | null = null;

  // Variables para modal de confirmación de eliminación
  showDeleteModal: boolean = false;
  perfilParaEliminar: PerfilPlanta | null = null;

  // Variables para modal de confirmación de reactivación
  showReactivateModal: boolean = false;
  perfilParaReactivar: PerfilPlanta | null = null;

  constructor(private perfilesService: PerfilesPlantas, private roleService: RoleService) {}

  ngOnInit() {
    // Suscribirse a los perfiles
    const perfilesSub = this.perfilesService.perfiles$.subscribe(perfiles => {
      this.perfiles = perfiles;
      this.cargandoPerfiles = false; // Terminar loading cuando lleguen los perfiles
    });

    // Suscribirse al perfil activo
    const perfilActivoSub = this.perfilesService.perfilActivo$.subscribe(perfil => {
      this.perfilActivo = perfil;
    });

    this.subscriptions.push(perfilesSub, perfilActivoSub);
  }

  ngOnChanges(changes: SimpleChanges) {
    // Cargar perfiles solo cuando se abre la modal
    if (changes['show'] && changes['show'].currentValue === true) {
      this.cargandoPerfiles = true;
      this.perfiles = []; // Limpiar perfiles mientras carga
      this.perfilesService.cargarPerfiles();
      this.perfilesService.cargarPerfilActivoGuardado();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  cerrar() {
    this.cerrarModal.emit();
  }

  crearNuevoPerfil() {
    this.perfilParaEditar = null;
    this.showFormModal = true;
  }

  seleccionarPerfil(perfil: PerfilPlanta) {
    // Solo permitir seleccionar perfiles activos
    if (!perfil.activo) {
      return; // No hacer nada si el perfil está inactivo
    }
    
    this.perfilesService.seleccionarPerfilActivo(perfil);
    this.perfilSeleccionado.emit(perfil);
    this.cerrar();
  }

  editarPerfil(perfil: PerfilPlanta, event: Event) {
    event.stopPropagation();
    this.perfilParaEditar = perfil;
    this.showFormModal = true;
  }

  eliminarPerfil(perfil: PerfilPlanta, event: Event) {
    event.stopPropagation();
    this.perfilParaEliminar = perfil;
    this.showDeleteModal = true;
  }

  confirmarEliminacion() {
    if (!this.perfilParaEliminar) return;

    // Cambiar estado a inactivo (eliminación lógica)
    this.perfilesService.actualizar(this.perfilParaEliminar.id, { activo: false }).subscribe({
      next: () => {
        console.log('Perfil desactivado exitosamente');
        this.perfilesService.cargarPerfiles();
        
        // Si se desactivó el perfil activo, deseleccionarlo
        if (this.perfilActivo?.id === this.perfilParaEliminar?.id) {
          this.perfilesService.seleccionarPerfilActivo(null);
        }
        
        this.cerrarModalEliminar();
      },
      error: (error) => {
        console.error('Error al desactivar perfil:', error);
        alert('Error al desactivar el perfil');
      }
    });
  }

  cerrarModalEliminar() {
    this.showDeleteModal = false;
    this.perfilParaEliminar = null;
  }

  get perfilActivoId(): number | null {
    return this.perfilActivo?.id || null;
  }

  // Métodos para el formulario
  cerrarFormModal() {
    this.showFormModal = false;
    this.perfilParaEditar = null;
  }

  onPerfilGuardado(perfil: PerfilPlanta) {
    console.log('Perfil guardado:', perfil.nombre);
  }

  // Métodos para manejo de roles
  esAdministrador(): boolean {
    return this.roleService.esAdministrador();
  }

  reactivarPerfil(perfil: PerfilPlanta, event: Event) {
    event.stopPropagation();
    this.perfilParaReactivar = perfil;
    this.showReactivateModal = true;
  }

  // Métodos para modal de reactivación
  cerrarModalReactivar() {
    this.showReactivateModal = false;
    this.perfilParaReactivar = null;
  }

  confirmarReactivacion() {
    if (this.perfilParaReactivar) {
      this.perfilesService.reactivar(this.perfilParaReactivar.id).subscribe({
        next: () => {
          console.log('Perfil reactivado exitosamente');
          this.perfilesService.cargarPerfiles();
          this.cerrarModalReactivar();
        },
        error: (error) => {
          console.error('Error al reactivar perfil:', error);
          alert('Error al reactivar el perfil');
        }
      });
    }
  }
}