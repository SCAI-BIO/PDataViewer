import { TestBed } from '@angular/core/testing';

import { MyErrorStateMatcherService } from './my-error-state-matcher.service';

describe('MyErrorStateMatcherService', () => {
  let service: MyErrorStateMatcherService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MyErrorStateMatcherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
