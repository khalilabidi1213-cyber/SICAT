// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { MapComponent } from './map/map.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'sicat', 
    component: LayoutComponent,
    children: [
      { path: 'map', component: MapComponent }
    ]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];