import { Component, OnInit } from '@angular/core';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
  standalone: false
})
export class AppComponent implements OnInit {
  title = 'SMIIVERN';

  constructor(private pwaUpdateService: PwaUpdateService) {}

  ngOnInit() {
    // El servicio ya se inicializa automáticamente
    console.log('SMIIVERN iniciado - Verificando actualizaciones...');
  }
}