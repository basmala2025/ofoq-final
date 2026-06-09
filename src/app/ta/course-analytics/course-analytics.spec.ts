import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseAnalyticsComponent } from './course-analytics';

describe('CourseAnalytics', () => {
  let component: CourseAnalyticsComponent;
  let fixture: ComponentFixture<CourseAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CourseAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
