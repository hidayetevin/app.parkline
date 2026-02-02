# Park Master - AI Development Prompts (High-Definition)

Bu dosya, `car_parking_game_complete_analysis_v2.md` analiz dökümanındaki her bir teknik detayı adıma adıma uygulamanızı sağlayacak **kapsamlı ve detaylı** komutları içerir.

Bu promptları sırasıyla uyguladığınızda, analizdeki mimariye birebir uyan, üretime hazır bir proje elde edeceksiniz.

---

## 🏗️ Phase 1: Foundation & Architecture

### Prompt 01: Project Initialization & Dependency Injection
**Hedef:** Proje iskeletini oluşturmak ve gerekli kütüphaneleri yapılandırmak.
**Dosyalar:** `package.json`, `tsconfig.json`, `capacitor.config.ts`, `src/app/*`

Lütfen aşağıdaki adımları sırasıyla uygula:

1.  **Temizlik ve Kurulum:**
    *   Mevcut `app.parkline` klasöründeki gereksiz dosyaları temizle (varsa).
    *   Tüm npm paketlerini güncelle.
    *   Şu paketleri yükle:
        *   `three` ve `@types/three`
        *   `cannon-es` (Fizik motoru)
        *   `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`
        *   `@capacitor/preferences` (Veri saklama)
        *   `@capacitor/haptics` (Titreşim)
        *   `howler` (Ses)
        *   `@ngx-translate/core` ve `@ngx-translate/http-loader` (Dil desteği)
        *   `@ngrx/store`, `@ngrx/effects`, `@ngrx/store-devtools` (State management)

2.  **Yapılandırma:**
    *   `tsconfig.json` dosyasında `compilerOptions` altına `"skipLibCheck": true` ve `"strict": true` ekle.
    *   `capacitor.config.ts` dosyasını düzenle:
        *   `appId`: "com.yourstudio.parkmaster"
        *   `appName`: "Park Master"
        *   `webDir`: "www"
    
3.  **Klasör Yapısı:**
    *   `src/app/core/services/` (Singleton servisler buraya)
    *   `src/app/core/guards/`
    *   `src/app/store/` (NgRx klasörleri: actions, reducers, selectors, effects)
    *   `src/app/game/scenes/` (Three.js sahneleri)
    *   `src/app/game/managers/` (Oyun mantığı yöneticileri)
    *   `src/app/game/models/` (Interface ve Type tanımları)
    *   `src/app/shared/components/` (UI bileşenleri)
    *   `src/assets/cars/`, `src/assets/levels/`, `src/assets/audio/`, `src/assets/ui/`, `src/assets/i18n/` klasörlerini oluştur.

4.  **Sonuç:** Derlenebilir ve çalıştırılabilir boş bir Angular + Ionic + Capacitor projesi teslim et.

### Prompt 02: NgRx State Management Implementation
**Hedef:** Oyunun tüm veri akışını yönetecek State yapısını kurmak.
**Referans:** Analiz Bölüm 3.1
**Dosyalar:** `src/app/store/*`

State yapısını tam olarak şu detaylarla kur:

1.  **State Interfaces (`src/app/store/app.state.ts`):**
    *   `GameState`: `currentLevel` (string), `gameStatus` ('menu'|'playing'|'paused'|'complete'), `activeScene` (THREE.Scene referansı - *serializable olmadığına dikkat et, gerekirse store dışında tut*).
    *   `EconomyState`: `coins` (number), `gems` (number), `unlockedCars` (string[]), `selectedCar` (string).
    *   `PlayerState`: `settings` ({volume, controlType}), `levelProgress` ({[id]: stars}).

2.  **Actions (`*.actions.ts`):**
    *   `[Game] Start Level` -> props: `{ levelId: string }`
    *   `[Game] Complete Level` -> props: `{ stars: number, coins: number }`
    *   `[Economy] Add Coins` -> props: `{ amount: number }`
    *   `[Economy] Unlock Car` -> props: `{ carId: string, cost: number, currency: 'coins'|'gems' }`
    *   `[Player] Update Settings` -> props: `{ key: string, value: any }`

3.  **Reducers (`*.reducer.ts`):**
    *   Her bir state için reducer fonksiyonlarını yaz. Initial state değerlerini analizdeki varsayılanlara göre ayarla (örn: 0 coins, 'sedan_basic' unlocked).

4.  **Store Module:**
    *   `app.config.ts` (Standalone) veya `app.module.ts` içine `provideStore` ve `provideEffects` ekle.

### Prompt 03: Advanced Asset Manager System
**Hedef:** Three.js varlıklarını performanslı şekilde yüklemek ve yönetmek.
**Referans:** Analiz Bölüm 3.2, Bölüm 15.3, Bölüm 15.4
**Dosyalar:** `src/app/game/managers/asset.manager.ts`

`AssetManager` servisini şu *spesifik* kurallarla oluştur:

1.  **Yükleyiciler:**
    *   `GLTFLoader` örneği oluştur.
    *   `DRACOLoader` yapılandır ve `src/assets/draco/` yolunu ver. GLTF loader'a set et.

2.  **Caching Stratejisi (`LRUCache`):**
    *   Basit bir `Map` veya `LRUCache` yapısı kur.
    *   Kapasite: En fazla 3 Araba Modeli, 2 Level Modeli hafızada tutulsun. Yeni yükleme geldiğinde en eskisi `dispose` edilsin.

3.  **`loadCar(carId: string): Promise<THREE.Group>`:**
    *   Önce cache kontrolü yap.
    *   Dosyayı `assets/cars/{carId}.glb` adresinden yükle.
    *   **Kritik Optimizasyon:** Yüklenen modelin `scene` grafiğini gez (`traverse`):
        *   Tüm `Mesh` nesnelerini bul.
        *   Materyallerini `MeshLambertMaterial` (performanslı) olarak değiştir.
        *   Texture varsa: `minFilter = THREE.LinearFilter` yap, `generateMipmaps = false` yap (Bölüm 15.4 ve 3.2'deki kod bloğunu uygula).
    *   Optimize edilmiş modeli döndür.

4.  **`disposeLevel(levelData: any): void`:**
    *   Sahnedeki tüm meshleri gez.
    *   `geometry.dispose()` çağır.
    *   `material.dispose()` çağır (Texture'ları da dispose etmeyi unutma).
    *   Physics body'lerini temizle.

---

## 🎮 Phase 2: Gameplay Core

### Prompt 04: Physics-Based Car Controller
**Hedef:** Gerçekçi ama kolay park edilen araç fiziği.
**Referans:** Analiz Bölüm 7, Bölüm 15.6
**Dosyalar:** `src/app/game/controllers/car.controller.ts`

1.  **Fizik Yapısı (Cannon-es):**
    *   `RaycastVehicle` sınıfını kullan (Tekerlek süspansiyonu için en iyisi).
    *   Şasi için `CANNON.Box`, tekerlekler için `CANNON.Cylinder` (veya sadece connection point) tanımla.
    *   Fizik özelliklerini ayarla: Sürtünme (`friction`: 0.3), Restitution (0.1).

2.  **Kontroller:**
    *   `update(input: { throttle: number, brake: number, steer: number })`:
    *   **Gaz:** `applyEngineForce` fonksiyonunu kullan. (Max güç analizdeki tabloya göre).
    *   **Fren:** `setBrake` fonksiyonunu kullan.
    *   **Direksiyon:** `setSteeringValue` kullan.
    *   **Dinamik Direksiyon (Bölüm 7.2):** Hız arttıkça direksiyon açısını kısıtlayan formülü uygula. `steering = input * map(speed, 0, maxSpeed, 1.0, 0.3)`.

3.  **Otomatik Fren (Bölüm 7.3):**
    *   Eğer gaz ve fren girdisi 0 ise ve araç hızı çok düşükse (`< 0.5`), aracı tamamen durdurmak için tekerleklere sönümleme (damping) uygula.

### Prompt 05: Scene Manager & Game Loop
**Hedef:** Oyun dünyası, kamera ve döngü.
**Referans:** Analiz Bölüm 3.3, 15.2
**Dosyalar:** `src/app/game/managers/scene.manager.ts`

1.  **Kurulum:**
    *   `createScene()`: `THREE.Scene`, `PerspectiveCamera` (FOV: 60), `WebGLRenderer` oluştur.
    *   Renderer Ayarları: `antialias: false` (Mobil performans için), `powerPreference: 'high-performance'`.
    *   Işıklandırma: Bir `AmbientLight` ve bir `DirectionalLight` (Gölge kapalı) ekle.

2.  **Game Loop (`animate`):**
    *   `requestAnimationFrame` kullan.
    *   `CannonWorld.step(1/60, deltaTime, 3)` ile fiziği ilerlet.
    *   **Senkronizasyon:** Araç Mesh'inin pozisyonunu ve rotasyonunu Fizik Body'sinden kopyala.
    *   **Kamera:** Kamerayı `car.position` + `offset` (arkadan yukarıdan) noktasına `lerp` (yumuşak geçiş) ile taşı.
    *   `renderer.render(scene, camera)` çağır.

### Prompt 06: Level Generation Algorithm
**Hedef:** Analizdeki algoritmaya göre level üretmek.
**Referans:** Analiz Bölüm 6.1
**Dosyalar:** `src/app/game/managers/level.manager.ts`

1.  **`generateLevel(index: number): LevelBlueprint` fonksiyonunu yaz:**
    *   **Zorluk Hesabı:** `difficulty = min(10, floor(index / 5) + 1)`.
    *   **Otopark Tipi:**
        *   Diff 1-3: 'straight' (Düz)
        *   Diff 4-6: 'reverse' (Geri geri)
        *   Diff 7-8: 'angled' (Çapraz)
        *   Diff 9+: 'parallel' (Paralel)
    *   **Ölçüler:** `areaSize = 12 - difficulty`. (Zorlandıkça alan daralır).
    *   **Süre:** `timeLimit = max(30, 70 - difficulty * 4)`.

2.  **Level Oluşturma (3D):**
    *   Konfigürasyondan gelen verilere göre 3D objeleri (Duvarlar, Zemin, Park Çizgileri, Engel Konileri) `Scene`'e ekleyen `buildLevel(blueprint)` metodunu yaz.
    *   Park hedefini (`TargetZone`) şeffaf sarı bir kutu olarak ekle.

### Prompt 07: Game Logic & Arbiter
**Hedef:** Oyun kurallarını (Park etme, Kaza, Süre) denetlemek.
**Referans:** Bölüm 4.2
**Dosyalar:** `src/app/game/managers/game-rules.manager.ts`

1.  **Park Kontrolü (`checkParkingStatus`):**
    *   Her frame'de veya saniyede 10 kez çalıştır.
    *   Araç `TargetZone` içinde mi? (BoundingBox kontrolü).
    *   Araç açısı hedef açıya uygun mu? (Dot Product veya Euler açısı farkı < `angleTolerance`).
    *   Araç hızı `~0` mı?
    *   Hepsi EVET ise -> `LevelComplete`.

2.  **Kaza Kontrolü:**
    *   Cannon-es `collision` event'ini dinle.
    *   Eğer `event.contact.getImpactVelocityAlongNormal() > 2` ise hasar ver.
    *   `currentCollisionCount` değişkenini artır.
    *   Çarpışma anında `Haptics.impact()` tetikle (Prompt 01'de kurulan plugin).

3.  **Yıldız Hesabı (`calculateStars`):**
    *   Varsayılan: 3 Yıldız.
    *   `collisionCount > 0` -> -1 Yıldız.
    *   `timeUsed > timeLimit * 0.7` -> -1 Yıldız.
    *   Sonuç 0'ın altına düşmesin.

---

## 🎨 Phase 3: UI & Interaction

### Prompt 08: Main Menu & Garage Interface
**Hedef:** UI tasarımı ve Garaj mantığı.
**Referans:** Bölüm 11.2, 11.6, 12.2
**Dosyalar:** `src/app/ui/pages/menu/*`, `src/app/ui/pages/garage/*`

1.  **Global Stil:** `variables.scss` içinde analizdeki renk paletini (`--color-primary: #FF6B35`, `--color-bg: #1A1A2E` vb.) tanımla.

2.  **Ana Menü:**
    *   Header: Coin/Gem bilgisi (Store'dan al).
    *   Ortada: `CarShowcaseComponent`. (Bu component, seçili aracı şeffaf bir canvas üzerinde döndüren ufak bir Three.js sahnesi içermeli).
    *   Butonlar: OYNA (Kocaman), Garaj, Ayarlar.

3.  **Garaj:**
    *   Tüm araçları grid listesi olarak göster.
    *   Her kartta: Araç resmi (veya glb), Adı, Fiyatı veya Kilit durumu.
    *   Tıklandığında:
        *   Açıksa -> `SelectCar` action'ı fırlat.
        *   Kapalıysa ve para yetiyorsa -> `UnlockCar` action'ı fırlat.

### Prompt 09: Gameplay HUD Overlay
**Hedef:** Oyun içi kontroller.
**Referans:** Bölüm 11.4
**Dosyalar:** `src/app/ui/components/hud/*`

1.  **Layout:**
    *   Şeffaf bir katman (`position: absolute; top:0; left:0; pointer-events: none`).
    *   Etkileşimli öğeler (`pointer-events: auto`).

2.  **Kontroller:**
    *   **Sol Alt:** Direksiyon (SVG görseli). `touchstart`, `touchmove` ile açıyı hesaplayıp `CarController`'a ilet.
    *   **Sağ Alt:** Gaz (Uzun pedal) ve Fren (Geniş pedal) butonları.
    *   **Vites:** İleri/Geri switch butonu.

3.  **Bilgi:**
    *   Üst Orta: Kalan Süre (Geri sayım), Level No.
    *   Sağ Üst: Duraklat butonu.

### Prompt 10: Tutorial & Hints System
**Hedef:** Kullanıcıyı eğitmek.
**Referans:** Bölüm 9.2, 9.4
**Dosyalar:** `src/app/game/managers/tutorial.manager.ts`

1.  **Overlay Tutorial:**
    *   İlk kez oyun açıldığında şeffaf siyah bir katman göster.
    *   "Direksiyonu Çevir" mesajıyla direksiyonu highlight et (CSS `z-index` veya `box-shadow` ile).
    *   Kullanıcı dokunduğunda bir sonraki adıma ("Gaza Bas") geç.

2.  **Adaptive Hint:**
    *   `GameState` içinde `failCount` tut.
    *   Eğer `failCount >= 3` olursa, level başladığında Toast mesajı göster: "İpucu: Daha yavaş gitmeyi dene!".

---

## � Phase 4: Economy & Services

### Prompt 11: Monetization (Ads & IAP)
**Hedef:** AdMob ve IAP entegrasyonu.
**Referans:** Bölüm 13
**Dosyalar:** `src/app/core/services/ad.service.ts`, `src/app/core/services/iap.service.ts`

1.  **AdService:**
    *   `capacitor-admob` (veya community plugin) kullan.
    *   `showInterstitial()`: Metod çağrıldığında reklamı yükle ve göster. Son gösterimden bu yana `30 saniye` geçtiğini kontrol et (Bölüm 13.1 kuralı).
    *   `showRewarded()`: Promise<boolean> döndür. İzleme tamamlanırsa `true` dön.

2.  **IAPService:**
    *   `InAppPurchase2` (Cordova plugin wrapper) kurulumunu yap.
    *   Ürünleri tanımla: `gems_small`, `remove_ads`.
    *   Satın alma başarılıysa Store'a `AddGems` veya `SetAdFree` action'ı gönder.

### Prompt 12: Data Persistence & Save System
**Hedef:** Verilerin kaybolmamasını sağlamak.
**Referans:** Bölüm 17
**Dosyalar:** `src/app/core/services/storage.service.ts`

1.  **Storage Yapısı:**
    *   Analizdeki `SaveData` interface'ini birebir tanımla (Player, Economy, Levels, Settings objeleri).

2.  **Auto-Save Effect:**
    *   NgRx Effect yaz: `[Game] Complete Level`, `[Economy] *` action'larını dinle.
    *   `debounceTime(1000)` ekle (Sürekli kayıt yapmamak için).
    *   Tüm State'i JSON'a çevirip `Preferences.set({ key: 'park_master_save', value: ... })` ile kaydet.

3.  **Yükleme:**
    *   App açılışında (`APP_INITIALIZER`), veriyi `Preferences.get` ile oku.
    *   Store'a `LoadSaveData` action'ı ile bas.

---

## 🚀 Phase 5: Build & Polish

### Prompt 13: Final Polish & Localization Content
**Hedef:** İçeriklerin girilmesi.
**Dosyalar:** `src/assets/i18n/*.json`, `src/assets/levels/handcrafted.json`

1.  **Çeviriler:**
    *   `tr.json`: `{"PLAY": "OYNA", "LEVEL_COMPLETE": "Harika!", ...}` anahtarlarını doldur.
    *   `en.json`: İngilizce karşılıklarını yaz.

2.  **Handcrafted Levels:**
    *   Analizdeki tabloya göre (Bölüm 6.2) ilk 5 leveli JSON formatında elle tanımla. `LevelManager` bu dosyalardan okuma yapabilsin.

3.  **Icon & Splash:**
    *   `resources/` klasörüne örnek `icon.png` (1024x1024) ve `splash.png` (2732x2732) koyulmasını iste.
    *   `npx capacitor-assets generate` komutunu çalıştır.

### Prompt 14: Build Instructions
**Hedef:** APK/AAB çıktısı almak.
**Referans:** Bölüm 18

1.  `ionic build --prod` çalıştır.
2.  `npx cap sync` çalıştır.
3.  `npx cap open android` komutu ile Android Studio projesini hazırla.
4.  Kullanıcıya "Android Studio'da Build > Generate Signed Bundle yolunu izlemesi gerektiğini" hatırlatan bir not düş.
