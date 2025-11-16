import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TokenService } from '../../auth/services/token.service';
import { RoleService } from '../shared/services/role.service';

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

  // Destroy subject para subscripciones
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

  constructor(
    private router: Router,
    private tokenService: TokenService,
    private roleService: RoleService
  ) { }
  ngOnInit(): void {
    this.loadUserInfo();
    this.updateTime();
    this.startTimeUpdate();
    this.generateRandomData();
    this.startDataUpdate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.router.navigate([`/dashboard/${route}`]);
  }
  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    console.log('Tema cambiado. isDarkTheme:', this.isDarkTheme);
  }
  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
  }
  closeMobileMenu(): void {
    this.showMobileMenu = false;
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
    this.temperatureValue = +(20 + Math.random() * 10).toFixed(1);
    this.temperaturePercent = ((this.temperatureValue - 10) / 20) * 100;

    this.humidityValue = +(40 + Math.random() * 40).toFixed(0);
    this.humidityPercent = ((this.humidityValue - 40) / 40) * 100;

    this.phValue = +(5.5 + Math.random() * 2).toFixed(1);
    this.phPercent = ((this.phValue - 5.0) / 2.5) * 100;

    this.nitrogenValue = +(Math.random() * 100).toFixed(0);
    this.phosphorusValue = +(Math.random() * 100).toFixed(0);
    this.potassiumValue = +(Math.random() * 100).toFixed(0);
  }
  private startDataUpdate(): void {
    setInterval(() => {
      this.generateRandomData();
    }, 3000);
  }

  get puedeAccederConfiguracion(): boolean {
    return this.roleService.puedeAccederConfiguracion();
  }
  get puedeControlarRiego(): boolean {
    return this.roleService.puedeControlarRiego();
  }
  get puedeAccederReportes(): boolean {
    return this.roleService.puedeAccederReportes();
  }
}


