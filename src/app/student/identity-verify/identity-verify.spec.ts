import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdentityVerify } from './identity-verify';

describe('IdentityVerify', () => {
  let component: IdentityVerify;
  let fixture: ComponentFixture<IdentityVerify>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdentityVerify]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IdentityVerify);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
