import { Routes } from '@angular/router';
import { MenuComponent } from './ui/pages/menu/menu.component';
import { GameComponent } from './ui/pages/game/game.component';
import { GarageComponent } from './ui/pages/garage/garage.component';
import { LevelSelectComponent } from './ui/pages/level-select/level-select.component';

export const routes: Routes = [
    { path: '', redirectTo: 'menu', pathMatch: 'full' },
    { path: 'menu', component: MenuComponent },
    { path: 'levels', component: LevelSelectComponent },
    { path: 'game', component: GameComponent },
    { path: 'garage', component: GarageComponent }
];
