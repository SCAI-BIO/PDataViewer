import { TestBed } from '@angular/core/testing';

import { ApiErrorHandler } from './api-error-handler';

describe('ApiErrorHandler', () => {
  let service: ApiErrorHandler;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiErrorHandler);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
