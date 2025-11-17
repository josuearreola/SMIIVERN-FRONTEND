import { NgModule} from '@angular/core';
import { CommonModule} from '@angular/common';
import { RouterModule} from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { ModalPerfilesComponent } from '../perfilesPlantas/modal-perfiles.component';
import { FormPerfilComponent } from '../perfilesPlantas/form-perfil.component';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { SharedModule } from '../shared/shared.module';

@NgModule({
    declarations: [ 
        DashboardComponent,
        ModalPerfilesComponent,
        FormPerfilComponent
    ],
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        HttpClientModule,
        DashboardRoutingModule,
        ConfiguracionModule,
        SharedModule,
    ],
    providers:[]

})
export class DashboardModule { }