import { Routes } from '@angular/router';
import { AdminComponent } from './components/admin/admin.component';
import { OverlayComponent } from './components/overlay/overlay.component';
import { TournamentAdminComponent } from './components/tournament-admin/tournament-admin.component';
import { TournamentComponent } from './components/tournament/tournament.component';

export const routes: Routes = [
  { path: 'admin', component: AdminComponent },
  { path: 'bracket-admin', component: TournamentAdminComponent },
  { path: 'bracket', component: TournamentComponent },
  { path: '', component: OverlayComponent },
  { path: '**', redirectTo: '' }
];
