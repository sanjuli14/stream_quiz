import { Routes } from '@angular/router';
import { AdminComponent } from './components/admin/admin.component';
import { OverlayComponent } from './components/overlay/overlay.component';

export const routes: Routes = [


  { path: 'admin', component: AdminComponent },
  { path: '', component: OverlayComponent },
  { path: '**', redirectTo: '' }
];
