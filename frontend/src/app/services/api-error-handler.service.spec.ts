import { TestBed } from '@angular/core/testing';

import { ApiErrorHandlerService } from './api-error-handler.service';

describe('ApiErrorHandlerService', () => {
  let service: ApiErrorHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiErrorHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
