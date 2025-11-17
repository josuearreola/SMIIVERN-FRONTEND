import { NgModule} from '@angular/core';
import { CommonModule} from '@angular/common';
import { RouterModule} from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { ModalPerfilesComponent } from '../perfilesPlantas/modal-perfiles.component';
import { FormPerfilComponent } from '../perfilesPlantas/form-perfil.component';

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
    ],
    providers:[]

})
export class DashboardModule { }