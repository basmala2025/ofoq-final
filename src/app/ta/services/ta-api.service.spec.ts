import { TestBed } from '@angular/core/testing';

import { TaApiService } from './ta-api.service';

describe('TaApiService', () => {
  let service: TaApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
