import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_STORAGE_KEY = 'smiivern-theme';
  private isDarkSubject = new BehaviorSubject<boolean>(false);
  
  // Observable para que los componentes se suscriban
  isDark$ = this.isDarkSubject.asObservable();

  constructor() {
    // Cargar tema guardado al iniciar
    this.loadSavedTheme();
    // Aplicar tema inicial
    this.applyTheme(this.isDarkSubject.value);
  }

  get isDarkTheme(): boolean {
    return this.isDarkSubject.value;
  }

  toggleTheme(): void {
    const newTheme = !this.isDarkSubject.value;
    this.setTheme(newTheme);
  }

  setTheme(isDark: boolean): void {
    this.isDarkSubject.next(isDark);
    this.saveTheme(isDark);
    this.applyTheme(isDark);
  }

  private loadSavedTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_STORAGE_KEY);
    if (savedTheme) {
      const isDark = savedTheme === 'dark';
      this.isDarkSubject.next(isDark);
    } else {
      // Si no hay tema guardado, detectar preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkSubject.next(prefersDark);
    }
  }

  private saveTheme(isDark: boolean): void {
    localStorage.setItem(this.THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  }

  private applyTheme(isDark: boolean): void {
    const body = document.body;
    
    if (isDark) {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    }
  }
}