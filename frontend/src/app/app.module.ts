import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxSliderModule } from '@angular-slider/ngx-slider';

import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { TournamentCreatorComponent } from './pages/home/tournament-creator/tournament-creator.component';
import { TournamentComponent } from './pages/tournament/tournament.component';
import { GameComponent } from './pages/game/game.component';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';
import { AppRoutingModule } from './app-routing.module';
import { ChessEngineManagementComponent } from './pages/chess-engine-management/chess-engine-management.component';
import { ChessBoardComponent } from './pages/game/chess-board/chess-board.component';
import { LoginComponent } from './pages/login/login.component';
import { NavbarComponent } from './navbar/navbar.component';
import { AboutComponent } from './pages/about/about.component';
import { GameCreatorComponent } from './pages/home/game-creator/game-creator.component';
import { GameTournamentListComponent } from './pages/home/game-tournament-list/game-tournament-list.component';
import { ChatComponent } from './shared/chat/chat.component';
import { EngineControlsComponent } from './pages/chess-engine-management/engine-controls/engine-controls.component';
import { MoveListComponent } from './pages/game/move-list/move-list.component';
import { GameActionsComponent } from './pages/game/game-actions/game-actions.component';
import { GameTournamentFiltersComponent } from './pages/home/game-tournament-list/game-tournament-filters/game-tournament-filters.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    TournamentCreatorComponent,
    TournamentComponent,
    GameComponent,
    UserProfileComponent,
    ChessEngineManagementComponent,
    ChessBoardComponent,
    LoginComponent,
    NavbarComponent,
    AboutComponent,
    GameCreatorComponent,
    GameTournamentListComponent,
    ChatComponent,
    EngineControlsComponent,
    MoveListComponent,
    GameActionsComponent,
    GameTournamentFiltersComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    NgxSliderModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
