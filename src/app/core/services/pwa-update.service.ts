import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {

  constructor(private swUpdate: SwUpdate) {
    if (swUpdate.isEnabled) {
      // Verificar actualizaciones cada 30 segundos
      setInterval(() => {
        swUpdate.checkForUpdate().then(() => {
          console.log('Verificando actualizaciones...');
        });
      }, 30000);

      // Escuchar cuando hay una nueva versión disponible
      swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(event => {
          console.log('Nueva versión disponible');
          this.mostrarNotificacionActualizacion();
        });
    }
  }

  private mostrarNotificacionActualizacion() {
    const actualizar = confirm(
      '¡Hay una nueva versión disponible!\n\n' +
      'Se han realizado mejoras y correcciones.\n' +
      '¿Deseas actualizar ahora?'
    );

    if (actualizar) {
      this.actualizarApp();
    }
  }

  private actualizarApp() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.activateUpdate().then(() => {
        // Mostrar mensaje de carga mientras actualiza
        const loading = document.createElement('div');
        loading.innerHTML = `
          <div style="
            position: fixed; 
            top: 0; left: 0; 
            width: 100vw; height: 100vh; 
            background: rgba(0,0,0,0.8); 
            color: white; 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            justify-content: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
          ">
            <div style="font-size: 24px; margin-bottom: 20px;">🔄</div>
            <div style="font-size: 18px; margin-bottom: 10px;">Actualizando SMIIVERN...</div>
            <div style="font-size: 14px; opacity: 0.8;">Por favor espera un momento</div>
          </div>
        `;
        document.body.appendChild(loading);

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });
    }
  }

  // Método para verificar actualizaciones manualmente
  verificarActualizaciones() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate().then((hasUpdate) => {
        if (!hasUpdate) {
          console.log('La aplicación está actualizada');
        }
      });
    }
  }

  // Método para limpiar cache y forzar actualización
  limpiarCacheYActualizar() {
    if ('serviceWorker' in navigator) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
        window.location.reload();
      });
    }
  }
}