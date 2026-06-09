import { TestBed } from '@angular/core/testing';

import { ExamStateService } from './exam-state.services';

describe('ExamStateServices', () => {
  let service: ExamStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExamStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
