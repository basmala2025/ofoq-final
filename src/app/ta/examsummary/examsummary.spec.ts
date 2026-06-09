import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Examsummary } from './examsummary';

describe('Examsummary', () => {
  let component: Examsummary;
  let fixture: ComponentFixture<Examsummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Examsummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Examsummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
