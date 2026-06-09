import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamStartComponent } from './exam-start.component';

describe('ExamStartComponent', () => {
  let component: ExamStartComponent;
  let fixture: ComponentFixture<ExamStartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamStartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamStartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
