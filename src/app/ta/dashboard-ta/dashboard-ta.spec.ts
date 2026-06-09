// src/app/features/ta-dashboard/pages/dashboard-ta/dashboard-ta.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaDashboardComponent } from './dashboard-ta'; // 👈 حدثنا اسم الملف والـ Import الجديد

describe('TaDashboardComponent', () => {
  let component: TaDashboardComponent;
  let fixture: ComponentFixture<TaDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaDashboardComponent] // 👈 هنا بنختبر الكومبوننت الجديد كـ Standalone
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy(); // التست الأساسي للتأكد إن الكومبوننت بيحصل له Initialize صح
  });
});
