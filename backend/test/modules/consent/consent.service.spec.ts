import { Test, TestingModule } from '@nestjs/testing';
import { ConsentService } from '../../../src/modules/consent/services/consent.service';
import { ConsentRepository } from '../../../src/modules/consent/repositories/consent.repository';
import { DomainEventService } from '../../../src/services/domainEvent.service';
import { CorrelationService } from '../../../src/services/correlation.service';

describe('ConsentService', () => {
  let service: ConsentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        {
          provide: ConsentRepository,
          useValue: {
            createInstance: jest.fn(),
            findInstanceById: jest.fn(),
            updateInstance: jest.fn(),
            setRevocationEvent: jest.fn(),
            findAllInstances: jest.fn(),
          },
        },
        {
          provide: DomainEventService,
          useValue: {
            createEvent: jest.fn(),
          },
        },
        {
          provide: CorrelationService,
          useValue: {
            getContext: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConsentService>(ConsentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO: Add test cases
});












