import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AdService } from './core/services/ad.service';
import { StorageService } from './core/services/storage.service';
import { AudioService } from './core/services/audio.service';

import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, IonicModule],
  template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`,
  styles: [`:host { width: 100%; height: 100%; display: block; }`]
})
export class AppComponent implements OnInit {
  constructor(
    private translate: TranslateService,
    private adService: AdService,
    private storage: StorageService,
    private audio: AudioService
  ) {
    this.initApp();
  }

  ngOnInit() { }

  private async initApp() {
    // 1. Setup Localization
    this.translate.addLangs(['en', 'tr']);
    this.translate.setDefaultLang('en');

    // Detect browser language
    const browserLang = this.translate.getBrowserLang();
    this.translate.use(browserLang?.match(/en|tr/) ? browserLang : 'en');

    // 2. Load Save Data
    await this.storage.loadSaveData();

    // 3. Initialize Ads
    this.adService.initialize();

    // 4. Preload Audio
    this.audio.preloadAudio();
  }
}
