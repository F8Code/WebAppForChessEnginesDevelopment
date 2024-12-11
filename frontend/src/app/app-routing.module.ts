import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';
import { TournamentComponent } from './pages/tournament/tournament.component';
import { GameComponent } from './pages/game/game.component';
import { ChessEngineManagementComponent } from './pages/chess-engine-management/chess-engine-management.component';
import { AboutComponent } from './pages/about/about.component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'about', component: AboutComponent },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'user-profile', component: UserProfileComponent },
  { path: 'tournament/:id', component: TournamentComponent },
  { path: 'game/:id', component: GameComponent },
  { path: 'chess-engine-management', component: ChessEngineManagementComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
