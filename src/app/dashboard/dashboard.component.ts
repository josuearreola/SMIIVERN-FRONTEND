import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TokenService } from '../../auth/services/token.service';
import { RoleService } from '../shared/services/role.service';
import { PerfilesPlantas, PerfilPlanta } from '../perfilesPlantas/perfiles-plantas.service';
import { ThemeService } from '../core/services/theme.service';
import { PerfilModalComponent } from '../shared/components/perfil-modal/perfil-modal.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false
})
export class DashboardComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  userInfo: any = null;
  currentTime: string = '';
  isDarkTheme = false;
  showMobileMenu = false;
  irrigationActive = false;

  // Variables para la modal de perfiles
  showPerfilesModal = false;
  perfilActivo: PerfilPlanta | null = null;

  // Variable para modal de configuración
  showConfiguracionModal = false;

  private destroy$ = new Subject<void>();

  temperatureValue = 24.5;
  temperaturePercent = 60;
  humidityValue = 60;
  humidityPercent = 60;
  phValue = 6.8;
  phPercent = 68;

  nitrogenValue = 40;
  phosphorusValue = 30;
  potassiumValue = 50;

  // Rangos dinámicos basados en el perfil seleccionado
  temperatureMin = 10;
  temperatureMax = 30;
  temperatureOptimal = 22;
  humidityMin = 40;
  humidityMax = 80;
  humidityOptimal = 65;
  phMin = 5.0;
  phMax = 7.5;
  phOptimal = 6.5;
  nitrogenMin = 0;
  nitrogenMax = 100;
  nitrogenOptimal = 50;
  phosphorusMin = 0;
  phosphorusMax = 100;
  phosphorusOptimal = 50;
  potassiumMin = 0;
  potassiumMax = 100;
  potassiumOptimal = 50;

  // Control de estado del perfil
  tienePerfilActivo = false;
  private subscriptions: any[] = [];

  constructor(
    private router: Router,
    private tokenService: TokenService,
    private roleService: RoleService,
    private perfilesService: PerfilesPlantas,
    private themeService: ThemeService,
    private modalService: NgbModal
  ) { }
  ngOnInit(): void {
    this.loadUserInfo();
    this.updateTime();
    this.startTimeUpdate();
    this.generateRandomData();
    this.startDataUpdate();
    this.startPerfilesSyncCheck(); // Nuevo método para sincronizar perfiles

    // Prevenir navegación hacia atrás
    this.preventBackNavigation();

    // Suscribirse al tema
    this.themeService.isDark$.pipe(takeUntil(this.destroy$))
      .subscribe(isDark => {
        this.isDarkTheme = isDark;
      });

    // Suscribirse a los perfiles (para detectar cuando se editan)
    const perfilesSub = this.perfilesService.perfiles$.pipe(takeUntil(this.destroy$))
      .subscribe(perfiles => {
        // Si hay un perfil activo, buscar la versión actualizada
        if (this.perfilActivo) {
          const perfilActualizado = perfiles.find(p => p.id === this.perfilActivo!.id);
          if (perfilActualizado && perfilActualizado.activo) {
            this.perfilActivo = perfilActualizado;
            this.updateRangesFromProfile(perfilActualizado);
          }
        }
      });

    // Suscribirse al perfil activo
    this.perfilesService.perfilActivo$.pipe(takeUntil(this.destroy$))
      .subscribe(perfil => {
        this.perfilActivo = perfil;
        this.tienePerfilActivo = !!perfil;
        this.updateRangesFromProfile(perfil);

        if (perfil) {
          console.log('Perfil activo cambiado a:', perfil.nombre);
        } else {
          console.log('No hay perfil activo');
        }
      });

    this.subscriptions.push(perfilesSub);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Limpiar suscripciones adicionales
    this.subscriptions.forEach(sub => {
      if (sub && sub.unsubscribe) {
        sub.unsubscribe();
      }
    });
  }

  private preventBackNavigation(): void {
    // Agregar una entrada al historial para prevenir que el back button salga de la app
    history.pushState(null, '', window.location.href);
    
    // Escuchar el evento popstate (cuando se presiona el botón back)
    window.addEventListener('popstate', (event) => {
      history.pushState(null, '', window.location.href);
      
      // Opcional: Mostrar confirmación antes de salir
      // this.confirmExit();
    });

    // Escuchar cambios de ruta para mantener la sesión activa
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      // Si intentan navegar a login y están autenticados, redirigir al dashboard
      if (event.url.includes('/login') && this.tokenService.getToken()) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private confirmExit(): void {
    const shouldExit = confirm('¿Estás seguro de que quieres salir de SMIIVERN?');
    if (shouldExit) {
      this.logout();
    }
  }
  private loadUserInfo(): void {
    this.userInfo = this.tokenService.getUserInfo();
  }
  private updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleDateString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  private startTimeUpdate(): void {
    setInterval(() => {
      this.updateTime();

    }, 1000);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
  logout(): void {
    this.tokenService.clearAuth();
    this.router.navigate(['/login']);
  }
  navigateTo(route: string): void {
    if (route === 'settings') {
      this.showConfiguracionModal = true;
    } else if (route === 'profile') {
      this.abrirPerfilModal();
    } else {
      this.router.navigate([`/dashboard/${route}`]);
    }
  }
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  closeConfiguracionModal(): void {
    this.showConfiguracionModal = false;
  }

  // Detectar clics fuera del menú hamburguesa
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const hamburgerMenu = target.closest('.hamburger-menu');
    const overlay = target.closest('.mobile-menu-overlay');
    
    // Si el clic no fue dentro del menú hamburguesa y el menú está abierto
    // También cerrar si se hace clic en el overlay
    if ((!hamburgerMenu || overlay) && this.showMobileMenu) {
      this.closeMobileMenu();
    }
  }

  // Detectar tecla Escape para cerrar el menú
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showMobileMenu) {
      this.closeMobileMenu();
    }
  }

  // Prevenir scroll del body cuando el menú esté abierto (útil para PWA)
  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    
    // Prevenir scroll del body en PWA/móvil
    if (this.showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
    // Restaurar scroll del body
    document.body.style.overflow = '';
  }

  toggleIrrigation(): void {
    this.irrigationActive = !this.irrigationActive;
    console.log('Sistema de riego: ', this.irrigationActive ? 'Activado' : 'Desactivado');
  }

  getGaugeBackground(value: number): string {
    const percentage = value;
    const rotation = (percentage / 100) * 180;
    return `conic-gradient(
    from 0deg,
    #dc3545 0deg,
    #ffc107 ${rotation * 0.3}deg,
    #28a745 ${rotation * 0.6}deg,
    #28a745 ${rotation}deg,
    #e9ecef ${rotation}deg,
    #e9ecef 180deg
  )`;
  }

  private generateRandomData(): void {
    // Solo generar datos si hay un perfil activo
    if (!this.tienePerfilActivo) {
      return;
    }

    // Generar valores simulados basados en los rangos del perfil
    this.temperatureValue = +(this.temperatureMin + Math.random() * (this.temperatureMax - this.temperatureMin)).toFixed(1);
    this.temperaturePercent = ((this.temperatureValue - this.temperatureMin) / (this.temperatureMax - this.temperatureMin)) * 100;

    this.humidityValue = +(this.humidityMin + Math.random() * (this.humidityMax - this.humidityMin)).toFixed(0);
    this.humidityPercent = ((this.humidityValue - this.humidityMin) / (this.humidityMax - this.humidityMin)) * 100;

    this.phValue = +(this.phMin + Math.random() * (this.phMax - this.phMin)).toFixed(1);
    this.phPercent = ((this.phValue - this.phMin) / (this.phMax - this.phMin)) * 100;

    this.nitrogenValue = +(this.nitrogenMin + Math.random() * (this.nitrogenMax - this.nitrogenMin)).toFixed(0);
    this.phosphorusValue = +(this.phosphorusMin + Math.random() * (this.phosphorusMax - this.phosphorusMin)).toFixed(0);
    this.potassiumValue = +(this.potassiumMin + Math.random() * (this.potassiumMax - this.potassiumMin)).toFixed(0);
  }

  // Método para actualizar rangos según el perfil seleccionado
  private updateRangesFromProfile(perfil: PerfilPlanta | null): void {
    if (perfil) {
      // Actualizar rangos de temperatura
      this.temperatureMin = perfil.temperaturaMin;
      this.temperatureMax = perfil.temperaturaMax;
      this.temperatureOptimal = perfil.temperaturaOptima || (perfil.temperaturaMin + perfil.temperaturaMax) / 2;

      // Actualizar rangos de humedad
      this.humidityMin = perfil.humedadMin;
      this.humidityMax = perfil.humedadMax;
      this.humidityOptimal = perfil.humedadOptima || (perfil.humedadMin + perfil.humedadMax) / 2;

      // Actualizar rangos de pH
      this.phMin = perfil.phMin;
      this.phMax = perfil.phMax;
      this.phOptimal = perfil.phOptimo || (perfil.phMin + perfil.phMax) / 2;

      // Actualizar rangos de nutrientes
      this.nitrogenMin = perfil.nitrogenoMin;
      this.nitrogenMax = perfil.nitrogenoMax;
      this.nitrogenOptimal = perfil.nitrogenoOptimo || (perfil.nitrogenoMin + perfil.nitrogenoMax) / 2;

      this.phosphorusMin = perfil.fosforoMin;
      this.phosphorusMax = perfil.fosforoMax;
      this.phosphorusOptimal = perfil.fosforoOptimo || (perfil.fosforoMin + perfil.fosforoMax) / 2;

      this.potassiumMin = perfil.potasioMin;
      this.potassiumMax = perfil.potasioMax;
      this.potassiumOptimal = perfil.potasioOptimo || (perfil.potasioMin + perfil.potasioMax) / 2;

      console.log('Rangos actualizados para perfil:', perfil.nombre);
      console.log('Temperatura:', this.temperatureMin, '-', this.temperatureMax, '(óptima:', this.temperatureOptimal, ')');
    } else {
      // Valores por defecto cuando no hay perfil seleccionado
      this.resetToDefaultRanges();
    }
  }

  private resetToDefaultRanges(): void {
    this.temperatureMin = 10;
    this.temperatureMax = 30;
    this.temperatureOptimal = 22;
    this.humidityMin = 40;
    this.humidityMax = 80;
    this.humidityOptimal = 65;
    this.phMin = 5.0;
    this.phMax = 7.5;
    this.phOptimal = 6.5;
    this.nitrogenMin = 0;
    this.nitrogenMax = 100;
    this.nitrogenOptimal = 50;
    this.phosphorusMin = 0;
    this.phosphorusMax = 100;
    this.phosphorusOptimal = 50;
    this.potassiumMin = 0;
    this.potassiumMax = 100;
    this.potassiumOptimal = 50;
  }
  private startDataUpdate(): void {
    setInterval(() => {
      this.generateRandomData();
    }, 3000);
  }

  private startPerfilesSyncCheck(): void {
    // Recargar perfiles cada 30 segundos para detectar cambios de edición
    setInterval(() => {
      if (this.perfilActivo) {
        this.perfilesService.cargarPerfiles();
      }
    }, 30000);
  }

  get puedeAccederConfiguracion(): boolean {
    return this.roleService.puedeAccederConfiguracion();
  }
  get puedeControlarRiego(): boolean {
    return this.roleService.puedeControlarRiego();
  }
  get puedeCrearPerfilesActivos(): boolean {
    return this.roleService.puedeCrearPerfilesActivos();
  }
  get puedeVerPerfilesActivos(): boolean {
    return this.roleService.puedeVerPerfilesActivos();
  }
  get puedeAccederReportes(): boolean {
    return this.roleService.puedeAccederReportes();
  }

  // Métodos para gestión de perfiles
  abrirGestionPerfiles(): void {
    if (this.puedeCrearPerfilesActivos) {
      this.showPerfilesModal = true;
    }
  }

  cerrarModalPerfiles(): void {
    this.showPerfilesModal = false;
  }

  abrirModalPerfiles(): void {
    this.showPerfilesModal = true;
  }

  onPerfilSeleccionado(perfil: PerfilPlanta): void {
    console.log('Perfil seleccionado:', perfil.nombre);
  }

  onCrearPerfil(): void {
    console.log('Crear nuevo perfil');
  }

  onEditarPerfil(perfilId: number): void {
    console.log('Editar perfil:', perfilId);
  }

  onEliminarPerfil(perfilId: number): void {
    console.log('Eliminar perfil:', perfilId);
  }

  get nombrePerfilActivo(): string {
    return this.perfilActivo ? this.perfilActivo.nombre : 'No seleccionado';
  }

  abrirPerfilModal(): void {
    const modalRef = this.modalService.open(PerfilModalComponent, {
      size: 'lg',
      backdrop: 'static'
    });
    
    // Pasar el usuario actual al modal
    modalRef.componentInstance.user = this.userInfo;
    
    modalRef.result.then((result) => {
      // Manejar resultado si es necesario
      console.log('Modal cerrado', result);
    }).catch(() => {
      // Modal fue cerrado/cancelado
    });
  }

  // Métodos para determinar estado de nutrientes
  getNutrientStatus(nutrient: string): string {
    let value: number;
    let min: number;
    let max: number;
    let optimal: number;

    switch (nutrient) {
      case 'nitrogen':
        value = this.nitrogenValue;
        min = this.nitrogenMin;
        max = this.nitrogenMax;
        optimal = this.nitrogenOptimal;
        break;
      case 'phosphorus':
        value = this.phosphorusValue;
        min = this.phosphorusMin;
        max = this.phosphorusMax;
        optimal = this.phosphorusOptimal;
        break;
      case 'potassium':
        value = this.potassiumValue;
        min = this.potassiumMin;
        max = this.potassiumMax;
        optimal = this.potassiumOptimal;
        break;
      default:
        return 'optimal';
    }

    // Calcular tolerancia (±15% del valor óptimo)
    const tolerance = optimal * 0.15;
    const lowerOptimal = optimal - tolerance;
    const upperOptimal = optimal + tolerance;

    // Estados basados en rangos
    if (value >= lowerOptimal && value <= upperOptimal) {
      return 'optimal';
    } else if (value < min || value > max) {
      return 'danger';
    } else {
      return 'warning';
    }
  }

  getNutrientIcon(nutrient: string): string {
    const status = this.getNutrientStatus(nutrient);
    switch (status) {
      case 'optimal':
        return 'bi bi-check-circle-fill';
      case 'warning':
        return 'bi bi-exclamation-triangle-fill';
      case 'danger':
        return 'bi bi-x-circle-fill';
      default:
        return 'bi bi-circle-fill';
    }
  }

  getNutrientStatusText(nutrient: string): string {
    const status = this.getNutrientStatus(nutrient);
    switch (status) {
      case 'optimal':
        return 'Óptimo';
      case 'warning':
        return 'Revisar';
      case 'danger':
        return 'Crítico';
      default:
        return 'Normal';
    }
  }
}


