import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PerfilesPlantas, PerfilPlanta } from './perfiles-plantas.service';

@Component({
  selector: 'app-form-perfil',
  templateUrl: './form-perfil.component.html',
  styleUrls: ['./form-perfil.component.scss'],
  standalone: false
})
export class FormPerfilComponent implements OnInit, OnChanges {
  @Input() show: boolean = false;
  @Input() perfilParaEditar: PerfilPlanta | null = null;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() perfilGuardado = new EventEmitter<PerfilPlanta>();

  perfilForm: FormGroup;
  guardando: boolean = false;
  esEdicion: boolean = false;

  constructor(
    private fb: FormBuilder,
    private perfilesService: PerfilesPlantas
  ) {
    this.perfilForm = this.crearFormulario();
  }

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['perfilParaEditar']) {
      this.esEdicion = !!this.perfilParaEditar;
      if (this.perfilParaEditar) {
        this.cargarDatosEnFormulario(this.perfilParaEditar);
      } else {
        this.resetearFormulario();
      }
    }
  }

  private crearFormulario(): FormGroup {
    return this.fb.group({
      // Información básica
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: [''],
      tipoPlanta: [''],

      // Parámetros ambientales
      temperaturaMin: ['', [Validators.required, Validators.min(-50), Validators.max(100)]],
      temperaturaMax: ['', [Validators.required, Validators.min(-50), Validators.max(100)]],
      temperaturaOptima: ['', [Validators.min(-50), Validators.max(100)]],

      humedadMin: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      humedadMax: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      humedadOptima: ['', [Validators.min(0), Validators.max(100)]],

      phMin: ['', [Validators.required, Validators.min(0), Validators.max(14)]],
      phMax: ['', [Validators.required, Validators.min(0), Validators.max(14)]],
      phOptimo: ['', [Validators.min(0), Validators.max(14)]],

      // Nutrientes NPK (opcionales)
      nitrogenoMin: ['', [Validators.min(0)]],
      nitrogenoMax: ['', [Validators.min(0)]],
      nitrogenoOptimo: ['', [Validators.min(0)]],

      fosforoMin: ['', [Validators.min(0)]],
      fosforoMax: ['', [Validators.min(0)]],
      fosforoOptimo: ['', [Validators.min(0)]],

      potasioMin: ['', [Validators.min(0)]],
      potasioMax: ['', [Validators.min(0)]],
      potasioOptimo: ['', [Validators.min(0)]],

      // Estado
      activo: [true]
    }, { validators: this.validadorRangos });
  }

  private validadorRangos(form: FormGroup) {
    const errors: any = {};

    // Validar rangos de temperatura
    const tempMin = form.get('temperaturaMin')?.value;
    const tempMax = form.get('temperaturaMax')?.value;
    if (tempMin && tempMax && tempMin > tempMax) {
      errors.temperaturaRange = 'La temperatura mínima no puede ser mayor que la máxima';
    }

    // Validar rangos de humedad
    const humMin = form.get('humedadMin')?.value;
    const humMax = form.get('humedadMax')?.value;
    if (humMin && humMax && humMin > humMax) {
      errors.humedadRange = 'La humedad mínima no puede ser mayor que la máxima';
    }

    // Validar rangos de pH
    const phMin = form.get('phMin')?.value;
    const phMax = form.get('phMax')?.value;
    if (phMin && phMax && phMin > phMax) {
      errors.phRange = 'El pH mínimo no puede ser mayor que el máximo';
    }

    // Validar NPK
    const nMin = form.get('nitrogenoMin')?.value;
    const nMax = form.get('nitrogenoMax')?.value;
    if (nMin && nMax && nMin > nMax) {
      errors.nitrogenoRange = 'El nitrógeno mínimo no puede ser mayor que el máximo';
    }

    const pMin = form.get('fosforoMin')?.value;
    const pMax = form.get('fosforoMax')?.value;
    if (pMin && pMax && pMin > pMax) {
      errors.fosforoRange = 'El fósforo mínimo no puede ser mayor que el máximo';
    }

    const kMin = form.get('potasioMin')?.value;
    const kMax = form.get('potasioMax')?.value;
    if (kMin && kMax && kMin > kMax) {
      errors.potasioRange = 'El potasio mínimo no puede ser mayor que el máximo';
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  private cargarDatosEnFormulario(perfil: PerfilPlanta) {
    this.perfilForm.patchValue({
      nombre: perfil.nombre,
      descripcion: perfil.descripcion,
      tipoPlanta: perfil.tipoPlanta,
      temperaturaMin: perfil.temperaturaMin,
      temperaturaMax: perfil.temperaturaMax,
      temperaturaOptima: perfil.temperaturaOptima,
      humedadMin: perfil.humedadMin,
      humedadMax: perfil.humedadMax,
      humedadOptima: perfil.humedadOptima,
      phMin: perfil.phMin,
      phMax: perfil.phMax,
      phOptimo: perfil.phOptimo,
      nitrogenoMin: perfil.nitrogenoMin,
      nitrogenoMax: perfil.nitrogenoMax,
      nitrogenoOptimo: perfil.nitrogenoOptimo,
      fosforoMin: perfil.fosforoMin,
      fosforoMax: perfil.fosforoMax,
      fosforoOptimo: perfil.fosforoOptimo,
      potasioMin: perfil.potasioMin,
      potasioMax: perfil.potasioMax,
      potasioOptimo: perfil.potasioOptimo,
      activo: perfil.activo
    });
  }

  private resetearFormulario() {
    this.perfilForm.reset();
    this.perfilForm.patchValue({ activo: true });
  }

  onSubmit() {
    if (this.perfilForm.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.guardando = true;
    const formData = this.perfilForm.value;

    const operacion = this.esEdicion
      ? this.perfilesService.actualizar(this.perfilParaEditar!.id, formData)
      : this.perfilesService.crear(formData);

    operacion.subscribe({
      next: (perfil) => {
        this.guardando = false;
        this.perfilGuardado.emit(perfil);
        this.cerrar();
        
        // Recargar la lista de perfiles
        this.perfilesService.cargarPerfiles();
      },
      error: (error) => {
        this.guardando = false;
        console.error('Error al guardar perfil:', error);
        
        let mensaje = 'Error al guardar el perfil';
        if (error.error?.message) {
          mensaje = error.error.message;
        } else if (error.message) {
          mensaje = error.message;
        }
        
        alert(mensaje);
      }
    });
  }

  private marcarCamposComoTocados() {
    Object.keys(this.perfilForm.controls).forEach(key => {
      this.perfilForm.get(key)?.markAsTouched();
    });
  }

  cerrar() {
    this.resetearFormulario();
    this.cerrarModal.emit();
  }

  // Getters para mostrar errores de validación de rangos
  get erroresRangos() {
    return this.perfilForm.errors || {};
  }

  // Métodos para mejorar la experiencia de edición
  obtenerTituloModal(): string {
    if (this.esEdicion && this.perfilParaEditar) {
      return `Editando: ${this.perfilParaEditar.nombre}`;
    }
    return 'Crear Perfil de Planta';
  }

  obtenerPlaceholderConValor(campo: string, placeholder: string): string {
    if (this.esEdicion && this.perfilParaEditar) {
      const valor = (this.perfilParaEditar as any)[campo];
      if (valor !== null && valor !== undefined) {
        return `${placeholder} (actual: ${valor})`;
      }
    }
    return placeholder;
  }

}