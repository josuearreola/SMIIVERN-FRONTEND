import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, firstValueFrom, takeUntil, filter } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TokenService } from '../../auth/services/token.service';
import { RoleService } from '../shared/services/role.service';
import { PerfilesPlantas, PerfilPlanta } from '../perfilesPlantas/perfiles-plantas.service';
import { ThemeService } from '../core/services/theme.service';
import { PerfilModalComponent } from '../shared/components/perfil-modal/perfil-modal.component';
import { SensorsService, SensorData } from '../shared/services/sensors.service';
import { ReportService } from '../shared/services/report.service';
import { AlertService } from '../shared/services/alert.service';

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  sensor: string;
  message: string;
  value: number;
  range: { min: number; max: number; optimal?: number };
  timestamp: Date;
}

type CardState = 'optimal' | 'warning' | 'danger';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly maxChartPoints = 30;
  private readonly defaultDeviceId = 'esp32-001';
  private timeIntervalId: ReturnType<typeof setInterval> | null = null;
  private perfilesSyncIntervalId: ReturnType<typeof setInterval> | null = null;

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

  // Variable para generación de reportes
  generatingReport = false;

  // Observable para alertas personalizadas
  alerts$: any;

  private readonly destroy$ = new Subject<void>();

  temperatureValue = 24.5;
  temperaturePercent = 60;
  humidityValue = 60;
  humidityPercent = 60;
  phValue = 6.8;
  phPercent = 68;

  nitrogenValue = 0;
  phosphorusValue = 0;
  potassiumValue = 0;

  // Valores originales en mg/kg para mostrar en UI
  nitrogenRawValue = 0;
  phosphorusRawValue = 0;
  potassiumRawValue = 0;

  // Sistema de alertas
  activeAlerts: Alert[] = [];

  // Rangos dinámicos basados en el perfil seleccionado
  temperatureMin = 10;
  temperatureMax = 30;
  temperatureOptimal = 22;
  humidityMin = 50;  // Rangos más realistas para humedad
  humidityMax = 95;
  humidityOptimal = 70;
  phMin = 5;
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
  private readonly subscriptions: any[] = [];

  // Datos reales de sensores
  latestSensorData: SensorData | null = null;
  sensorDataAvailable = false;
  sensorDataStatus: 'live' | 'stale' | 'offline' = 'offline';

  environmentChartData: any = {
    labels: [],
    datasets: [
      { label: 'Temperatura (C)', data: [], borderColor: '#ef4444', tension: 0.35 },
      { label: 'Humedad (%)', data: [], borderColor: '#2563eb', tension: 0.35 },
      { label: 'pH', data: [], borderColor: '#16a34a', tension: 0.35 },
    ],
  };

  nutrientsChartData: any = {
    labels: [],
    datasets: [
      { label: 'Nitrogeno (mg/kg)', data: [], borderColor: '#10b981', tension: 0.35 },
      { label: 'Fosforo (mg/kg)', data: [], borderColor: '#f59e0b', tension: 0.35 },
      { label: 'Potasio (mg/kg)', data: [], borderColor: '#8b5cf6', tension: 0.35 },
    ],
  };

  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    normalized: true,
    animation: {
      duration: 420,
      easing: 'easeOutCubic',
    },
    animations: {
      x: {
        duration: 420,
        easing: 'easeOutQuart',
      },
      y: {
        duration: 420,
        easing: 'easeOutQuart',
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        backgroundColor: 'rgba(18, 24, 38, 0.92)',
        titleColor: '#ffffff',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(148, 163, 184, 0.35)',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
      },
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 3,
      },
      line: {
        borderWidth: 2,
      },
    },
    scales: {
      x: {
        ticks: { maxTicksLimit: 6 },
        grid: {
          color: 'rgba(148, 163, 184, 0.12)',
        },
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.12)',
        },
      },
    },
  };

  constructor(
    private router: Router,
    private tokenService: TokenService,
    private roleService: RoleService,
    private perfilesService: PerfilesPlantas,
    private themeService: ThemeService,
    private modalService: NgbModal,
    private sensorsService: SensorsService,
    private reportService: ReportService,
    public alertService: AlertService
  ) { }
  ngOnInit(): void {
    // Inicializar el observable de alertas
    this.alerts$ = this.alertService.alert$;

    this.loadUserInfo();
    this.initializeCharts();
    this.preloadHistoryData();
    this.updateTime();
    this.startTimeUpdate();
    this.initSensorData(); // Inicializar datos reales de sensores
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

    if (this.timeIntervalId) {
      clearInterval(this.timeIntervalId);
    }

    if (this.perfilesSyncIntervalId) {
      clearInterval(this.perfilesSyncIntervalId);
    }
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
    this.timeIntervalId = setInterval(() => {
      this.updateTime();

    }, 500); // Actualizar cada 500ms para mayor dinamismo
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

  getGaugeBackground(value: number, nutrient: string): string {
    const percentage = Math.max(0, Math.min(100, value));
    const rotation = (percentage / 100) * 360;
    const state = this.getNutrientStatus(nutrient);
    const trackColor = this.isDarkTheme
      ? 'rgba(71, 85, 105, 0.5)'
      : 'rgba(203, 213, 225, 0.8)';
    let color = '#ef4444';

    if (state === 'optimal') {
      color = '#16a34a';
    } else if (state === 'warning') {
      color = '#f59e0b';
    }

    return `conic-gradient(
    from -90deg,
    ${color} 0deg,
    ${color} ${rotation}deg,
    ${trackColor} ${rotation}deg,
    ${trackColor} 360deg
  )`;
  }

  getGaugeNeedleTransform(value: number): string {
    const clamped = Math.max(0, Math.min(100, value));
    // 0% = -90deg, 100% = 270deg.
    const degrees = (clamped * 3.6) - 90;
    return `translateX(-50%) rotate(${degrees}deg)`;
  }

  private initSensorData(): void {
    // Suscribirse a los datos de sensores en tiempo real
    this.sensorsService.latestData$.pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (data) {
          this.latestSensorData = data;
          this.updateSensorValues(data);
          this.sensorDataAvailable = true;
          this.sensorDataStatus = this.getLiveDataStatus(data.timestamp);
        } else {
          this.sensorDataStatus = 'offline';
        }
      });
  }

  private updateSensorValues(data: SensorData): void {
    // Actualizar temperatura
    if (data.temperature) {
      this.temperatureValue = Number.parseFloat(data.temperature);
      this.temperaturePercent = this.calculatePercent(this.temperatureValue, this.temperatureMin, this.temperatureMax);
    }

    // Actualizar humedad (usar escala completa 0-100% para la barra visual)
    if (data.humidity) {
      this.humidityValue = Number.parseFloat(data.humidity);
      // Para la barra visual, usar siempre 0-100% para que sea proporcional
      this.humidityPercent = Math.max(0, Math.min(100, this.humidityValue));
    }

    // Actualizar pH
    if (data.ph) {
      this.phValue = Number.parseFloat(data.ph);
      this.phPercent = this.calculatePercent(this.phValue, this.phMin, this.phMax);
    }

    // Actualizar nutrientes (mantener valores originales en mg/kg)
    if (data.n) {
      this.nitrogenRawValue = Number.parseFloat(data.n);
      this.nitrogenValue = this.convertNutrientToPercent(this.nitrogenRawValue, 'nitrogen');
    }
    if (data.p) {
      this.phosphorusRawValue = Number.parseFloat(data.p);
      this.phosphorusValue = this.convertNutrientToPercent(this.phosphorusRawValue, 'phosphorus');
    }
    if (data.k) {
      this.potassiumRawValue = Number.parseFloat(data.k);
      this.potassiumValue = this.convertNutrientToPercent(this.potassiumRawValue, 'potassium');
    }

    this.pushLiveChartPoints(data);

    // Generar alertas basadas en los valores actuales
    this.generateAlerts();

  }

  private calculatePercent(value: number, min: number, max: number): number {
    if (max === min) return 50; // Evitar división por cero
    const percent = ((value - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, percent)); // Limitar entre 0 y 100
  }

  private convertNutrientToPercent(value: number, nutrient: string): number {
    // Conversión aproximada de mg/kg a porcentaje basado en rangos típicos
    // Estos valores pueden ajustarse según las necesidades específicas
    let maxValue: number;

    switch (nutrient) {
      case 'nitrogen':
        maxValue = 500; // mg/kg máximo esperado para nitrógeno
        break;
      case 'phosphorus':
        maxValue = 800; // mg/kg máximo esperado para fósforo
        break;
      case 'potassium':
        maxValue = 800; // mg/kg máximo esperado para potasio
        break;
      default:
        maxValue = 100;
    }

    return Math.round((value / maxValue) * 100);
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
    this.humidityMin = 50;  // Rangos más realistas
    this.humidityMax = 95;
    this.humidityOptimal = 70;
    this.phMin = 5;
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
  // Método para forzar actualización de datos de sensores
  refreshSensorData(): void {
    this.sensorsService.refreshData('esp32-001');
  }

  // Sistema de alertas inteligente
  private generateAlerts(): void {
    this.activeAlerts = []; // Limpiar alertas previas

    // No generar alertas si no hay perfil seleccionado
    if (!this.tienePerfilActivo) {
      return;
    }

    const timestamp = new Date();

    // Verificar temperatura
    if (this.temperatureValue < this.temperatureMin || this.temperatureValue > this.temperatureMax) {
      this.activeAlerts.push({
        id: 'temp-' + timestamp.getTime(),
        type: 'error',
        sensor: 'Temperatura',
        message: `Temperatura fuera del rango (${this.temperatureValue}°C). Rango: ${this.temperatureMin}°C - ${this.temperatureMax}°C`,
        value: this.temperatureValue,
        range: { min: this.temperatureMin, max: this.temperatureMax, optimal: this.temperatureOptimal },
        timestamp
      });
    }

    // Verificar humedad  
    if (this.humidityValue < this.humidityMin || this.humidityValue > this.humidityMax) {
      this.activeAlerts.push({
        id: 'humidity-' + timestamp.getTime(),
        type: 'warning',
        sensor: 'Humedad',
        message: `Humedad fuera del rango (${this.humidityValue}%). Rango: ${this.humidityMin}% - ${this.humidityMax}%`,
        value: this.humidityValue,
        range: { min: this.humidityMin, max: this.humidityMax, optimal: this.humidityOptimal },
        timestamp
      });
    }

    // Verificar pH
    if (this.phValue < this.phMin || this.phValue > this.phMax) {
      this.activeAlerts.push({
        id: 'ph-' + timestamp.getTime(),
        type: 'error',
        sensor: 'pH',
        message: `pH fuera del rango (${this.phValue}). Rango: ${this.phMin} - ${this.phMax}`,
        value: this.phValue,
        range: { min: this.phMin, max: this.phMax, optimal: this.phOptimal },
        timestamp
      });
    }

    // Verificar nutrientes (usando rangos en mg/kg)
    const nitrogenMinMg = this.nitrogenMin * 5; // Conversión aproximada
    const nitrogenMaxMg = this.nitrogenMax * 5;
    if (this.nitrogenRawValue < nitrogenMinMg || this.nitrogenRawValue > nitrogenMaxMg) {
      this.activeAlerts.push({
        id: 'nitrogen-' + timestamp.getTime(),
        type: 'warning',
        sensor: 'Nitrógeno',
        message: `Nivel de Nitrógeno (N) fuera del rango (${this.nitrogenRawValue} mg/kg).`,
        value: this.nitrogenRawValue,
        range: { min: nitrogenMinMg, max: nitrogenMaxMg },
        timestamp
      });
    }

    const phosphorusMinMg = this.phosphorusMin * 8;
    const phosphorusMaxMg = this.phosphorusMax * 8;
    if (this.phosphorusRawValue < phosphorusMinMg || this.phosphorusRawValue > phosphorusMaxMg) {
      this.activeAlerts.push({
        id: 'phosphorus-' + timestamp.getTime(),
        type: 'warning',
        sensor: 'Fósforo',
        message: `Nivel de Fósforo (P) fuera del rango (${this.phosphorusRawValue} mg/kg).`,
        value: this.phosphorusRawValue,
        range: { min: phosphorusMinMg, max: phosphorusMaxMg },
        timestamp
      });
    }

    const potassiumMinMg = this.potassiumMin * 8;
    const potassiumMaxMg = this.potassiumMax * 8;
    if (this.potassiumRawValue < potassiumMinMg || this.potassiumRawValue > potassiumMaxMg) {
      this.activeAlerts.push({
        id: 'potassium-' + timestamp.getTime(),
        type: 'warning',
        sensor: 'Potasio',
        message: `Nivel de Potasio (K) fuera del rango (${this.potassiumRawValue} mg/kg).`,
        value: this.potassiumRawValue,
        range: { min: potassiumMinMg, max: potassiumMaxMg },
        timestamp
      });
    }

    console.log('Alertas generadas:', this.activeAlerts.length);
  }

  private startPerfilesSyncCheck(): void {
    // Recargar perfiles cada 30 segundos para detectar cambios de edición
    this.perfilesSyncIntervalId = setInterval(() => {
      if (this.perfilActivo) {
        this.perfilesService.cargarPerfiles();
      }
    }, 30000);
  }

  private initializeCharts(): void {
    this.environmentChartData = {
      ...this.environmentChartData,
      datasets: this.environmentChartData.datasets.map((dataset: any) => ({
        ...dataset,
        pointRadius: 0,
        fill: true,
        cubicInterpolationMode: 'monotone',
        spanGaps: true,
      })),
    };

    this.nutrientsChartData = {
      ...this.nutrientsChartData,
      datasets: this.nutrientsChartData.datasets.map((dataset: any) => ({
        ...dataset,
        pointRadius: 0,
        fill: true,
        cubicInterpolationMode: 'monotone',
        spanGaps: true,
      })),
    };

    this.environmentChartData.datasets[0].backgroundColor = 'rgba(239, 68, 68, 0.12)';
    this.environmentChartData.datasets[1].backgroundColor = 'rgba(37, 99, 235, 0.12)';
    this.environmentChartData.datasets[2].backgroundColor = 'rgba(22, 163, 74, 0.12)';

    this.nutrientsChartData.datasets[0].backgroundColor = 'rgba(16, 185, 129, 0.12)';
    this.nutrientsChartData.datasets[1].backgroundColor = 'rgba(245, 158, 11, 0.12)';
    this.nutrientsChartData.datasets[2].backgroundColor = 'rgba(139, 92, 246, 0.12)';
  }

  private pushLiveChartPoints(data: SensorData): void {
    const label = new Date(data.timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const temperature = this.parseNumericValue(data.temperature);
    const humidity = this.parseNumericValue(data.humidity);
    const ph = this.parseNumericValue(data.ph);
    const nitrogen = this.parseNumericValue(data.n);
    const phosphorus = this.parseNumericValue(data.p);
    const potassium = this.parseNumericValue(data.k);

    this.environmentChartData = {
      labels: this.appendPoint(this.environmentChartData.labels, label),
      datasets: [
        {
          ...this.environmentChartData.datasets[0],
          data: this.appendPoint(this.environmentChartData.datasets[0].data, temperature),
        },
        {
          ...this.environmentChartData.datasets[1],
          data: this.appendPoint(this.environmentChartData.datasets[1].data, humidity),
        },
        {
          ...this.environmentChartData.datasets[2],
          data: this.appendPoint(this.environmentChartData.datasets[2].data, ph),
        },
      ],
    };

    this.nutrientsChartData = {
      labels: this.appendPoint(this.nutrientsChartData.labels, label),
      datasets: [
        {
          ...this.nutrientsChartData.datasets[0],
          data: this.appendPoint(this.nutrientsChartData.datasets[0].data, nitrogen),
        },
        {
          ...this.nutrientsChartData.datasets[1],
          data: this.appendPoint(this.nutrientsChartData.datasets[1].data, phosphorus),
        },
        {
          ...this.nutrientsChartData.datasets[2],
          data: this.appendPoint(this.nutrientsChartData.datasets[2].data, potassium),
        },
      ],
    };
  }

  private appendPoint<T>(series: T[], value: T): T[] {
    const updated = [...series, value];
    if (updated.length > this.maxChartPoints) {
      return updated.slice(updated.length - this.maxChartPoints);
    }
    return updated;
  }

  private parseNumericValue(value: string | null): number | null {
    if (value == null) {
      return null;
    }

    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private async preloadHistoryData(): Promise<void> {
    try {
      const historyData = await firstValueFrom(
        this.sensorsService.getSensorHistory(this.defaultDeviceId, this.maxChartPoints)
      );

      if (!historyData || historyData.length === 0) {
        const latest = await firstValueFrom(
          this.sensorsService.getLatestSensorData(this.defaultDeviceId)
        );

        if (latest) {
          this.latestSensorData = latest;
          this.updateSensorValues(latest);
          this.sensorDataAvailable = true;
          this.sensorDataStatus = this.getLiveDataStatus(latest.timestamp);
        }
        return;
      }

      // Backend entrega DESC; para chart en vivo se renderiza ASC.
      const ordered = [...historyData].reverse();
      this.applyNutrientFallbackFromHistory(ordered);

      const latest = ordered.at(-1);
      const initialPoints = latest ? ordered.slice(0, -1) : ordered;
      initialPoints.forEach((item) => this.pushLiveChartPoints(item));

      if (latest) {
        this.latestSensorData = latest;
        this.updateSensorValues(latest);
        this.sensorDataAvailable = true;
        this.sensorDataStatus = this.getLiveDataStatus(latest.timestamp);
      }
    } catch {
      this.sensorDataStatus = 'offline';
    }
  }

  private getLiveDataStatus(timestamp: string): 'live' | 'stale' | 'offline' {
    const value = new Date(timestamp).getTime();
    if (Number.isNaN(value)) {
      return 'offline';
    }

    const ageSeconds = (Date.now() - value) / 1000;
    if (ageSeconds <= 5) {
      return 'live';
    }
    if (ageSeconds <= 30) {
      return 'stale';
    }
    return 'offline';
  }

  private applyNutrientFallbackFromHistory(entries: SensorData[]): void {
    const latestN = this.findLatestNumeric(entries, 'n');
    const latestP = this.findLatestNumeric(entries, 'p');
    const latestK = this.findLatestNumeric(entries, 'k');

    if (latestN !== null) {
      this.nitrogenRawValue = latestN;
      this.nitrogenValue = this.convertNutrientToPercent(latestN, 'nitrogen');
    }

    if (latestP !== null) {
      this.phosphorusRawValue = latestP;
      this.phosphorusValue = this.convertNutrientToPercent(latestP, 'phosphorus');
    }

    if (latestK !== null) {
      this.potassiumRawValue = latestK;
      this.potassiumValue = this.convertNutrientToPercent(latestK, 'potassium');
    }
  }

  private findLatestNumeric(entries: SensorData[], key: 'n' | 'p' | 'k'): number | null {
    // 1) Preferir el último valor positivo para evitar mostrar 0 si hay lecturas útiles previas.
    for (let index = entries.length - 1; index >= 0; index--) {
      const current = entries[index][key];
      if (current == null || current === '') {
        continue;
      }

      const parsed = Number.parseFloat(current);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    // 2) Si no existe positivo, usar cualquier valor numérico válido (incluye 0).
    for (let index = entries.length - 1; index >= 0; index--) {
      const current = entries[index][key];
      if (current == null || current === '') {
        continue;
      }

      const parsed = Number.parseFloat(current);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  getSensorStatusLabel(): string {
    if (this.sensorDataStatus === 'live') {
      return 'Datos en vivo';
    }
    if (this.sensorDataStatus === 'stale') {
      return 'Datos recientes';
    }
    return 'Sin señal';
  }

  getSensorStatusClass(): string {
    if (this.sensorDataStatus === 'live') {
      return 'status-live';
    }
    if (this.sensorDataStatus === 'stale') {
      return 'status-stale';
    }
    return 'status-offline';
  }

  getTemperatureCardState(): CardState {
    return this.getRangeState(this.temperatureValue, this.temperatureMin, this.temperatureMax, this.temperatureOptimal);
  }

  getHumidityCardState(): CardState {
    return this.getRangeState(this.humidityValue, this.humidityMin, this.humidityMax, this.humidityOptimal);
  }

  getPhCardState(): CardState {
    return this.getRangeState(this.phValue, this.phMin, this.phMax, this.phOptimal);
  }

  private getRangeState(value: number, min: number, max: number, optimal: number): CardState {
    if (value < min || value > max) {
      return 'danger';
    }

    const tolerance = Math.abs((max - min) * 0.12);
    if (Math.abs(value - optimal) <= tolerance) {
      return 'optimal';
    }

    return 'warning';
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
    if (this.puedeVerPerfilesActivos) {  // Cambiar para permitir ver a estudiantes
      this.showPerfilesModal = true;
    }
  }

  cerrarModalPerfiles(): void {
    this.showPerfilesModal = false;
  }

  abrirModalPerfiles(): void {
    this.showPerfilesModal = true;
  }

  onPerfilSeleccionado(perfil: PerfilPlanta | null): void {
    if (perfil) {
      console.log('Perfil seleccionado:', perfil.nombre);
    } else {
      console.log('Perfil deseleccionado');
    }
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

  async generateHistoryReport(): Promise<void> {
    if (this.generatingReport || !this.tienePerfilActivo) {
      return;
    }

    try {
      this.generatingReport = true;

      // Primero intentar obtener cualquier dato histórico sin filtro
      console.log('Intentando obtener datos históricos sin filtro de device_id...');
      let historyData = await firstValueFrom(this.sensorsService.getSensorHistory(undefined, 50));

      // Si no hay datos, intentar con device_id específico
      if (!historyData || historyData.length === 0) {
        console.log('No se encontraron datos sin filtro, intentando con device_id específico...');
        const deviceId = 'esp32-001';
        historyData = await firstValueFrom(this.sensorsService.getSensorHistory(deviceId, 50));
      }

      console.log(`Datos obtenidos del servidor: ${historyData?.length || 0} registros`);

      if (!historyData || historyData.length === 0) {
        this.alertService.showError(
          'Sin Datos Históricos',
          'No hay datos históricos disponibles en la base de datos para generar el reporte. Asegúrate de que el sistema haya registrado lecturas de sensores.',
          'Entendido'
        );
        return;
      }

      console.log(`Generando reporte con ${historyData.length} registros disponibles`);

      // Obtener el perfil activo para incluir en el reporte
      const perfilActivo = this.perfilActivo;

      if (!perfilActivo) {
        this.alertService.showWarning(
          'Perfil No Seleccionado',
          'Debes seleccionar un perfil de cultivo antes de generar el reporte. Por favor, selecciona un perfil desde el menú.',
          'Entendido'
        );
        return;
      }

      // Generar el reporte PDF
      const reportData = historyData.map(item => ({
        ...item,
        id: item.id?.toString()
      }));
      await this.reportService.generatePDF(reportData);

      // Mostrar confirmación de éxito
      this.alertService.showSuccess(
        '¡Reporte Generado!',
        `Se ha generado exitosamente el reporte con ${historyData.length} registros de datos del perfil "${perfilActivo.nombre}". El archivo se ha descargado automáticamente.`,
        'Excelente'
      );

    } catch (error: any) {
      console.error('Error generating report:', error);

      let title = 'Error al Generar Reporte';
      let message = '';

      if (error.status === 401) {
        title = 'Sesión Expirada';
        message = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente para continuar.';
      } else if (error.status === 403) {
        title = 'Sin Permisos';
        message = 'No tienes permisos para acceder a este recurso. Contacta al administrador si crees que es un error.';
      } else if (error.status === 0) {
        title = 'Sin Conexión';
        message = 'No se puede conectar con el servidor. Verifica tu conexión a internet e inténtalo nuevamente.';
      } else {
        message = 'Ha ocurrido un error inesperado al generar el reporte. Por favor, inténtalo de nuevo en unos momentos.';
      }

      this.alertService.showError(title, message, 'Reintentar');
    } finally {
      this.generatingReport = false;
    }
  }
}


