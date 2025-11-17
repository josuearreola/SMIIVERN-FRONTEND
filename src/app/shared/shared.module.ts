import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { PerfilModalComponent } from './components/perfil-modal/perfil-modal.component';

@NgModule({
  declarations: [
    PerfilModalComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbModule
  ],
  exports: [
    PerfilModalComponent
  ]
})
export class SharedModule { }