import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LevelSelectComponent } from './level-select.component';

describe('LevelSelectComponent', () => {
  let component: LevelSelectComponent;
  let fixture: ComponentFixture<LevelSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LevelSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LevelSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
