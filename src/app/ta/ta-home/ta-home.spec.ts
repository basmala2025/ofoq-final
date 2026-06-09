import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaHome } from './ta-home';

describe('TaHome', () => {
  let component: TaHome;
  let fixture: ComponentFixture<TaHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
