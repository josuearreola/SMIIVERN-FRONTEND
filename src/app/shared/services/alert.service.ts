import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AlertData } from '../components/alert-modal/alert-modal.component';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertSubject = new BehaviorSubject<AlertData | null>(null);
  public alert$ = this.alertSubject.asObservable();

  showSuccess(title: string, message: string, confirmText?: string) {
    this.alertSubject.next({
      title,
      message,
      type: 'success',
      confirmText: confirmText || 'Aceptar',
      showCancel: false
    });
  }

  showError(title: string, message: string, confirmText?: string) {
    this.alertSubject.next({
      title,
      message,
      type: 'error',
      confirmText: confirmText || 'Aceptar',
      showCancel: false
    });
  }

  showWarning(title: string, message: string, confirmText?: string) {
    this.alertSubject.next({
      title,
      message,
      type: 'warning',
      confirmText: confirmText || 'Aceptar',
      showCancel: false
    });
  }

  showInfo(title: string, message: string, confirmText?: string) {
    this.alertSubject.next({
      title,
      message,
      type: 'info',
      confirmText: confirmText || 'Aceptar',
      showCancel: false
    });
  }

  showConfirm(title: string, message: string, confirmText?: string, cancelText?: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.alertSubject.next({
        title,
        message,
        type: 'info',
        confirmText: confirmText || 'Confirmar',
        cancelText: cancelText || 'Cancelar',
        showCancel: true
      });

      // Resolver la promesa en el próximo ciclo para permitir que el componente se suscriba
      setTimeout(() => {
        const subscription = this.alert$.subscribe(data => {
          if (data === null) {
            subscription.unsubscribe();
            resolve(true);
          }
        });
      }, 100);
    });
  }

  close() {
    this.alertSubject.next(null);
  }
}