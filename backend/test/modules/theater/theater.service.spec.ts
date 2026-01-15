import { Test, TestingModule } from '@nestjs/testing';
import { TheaterService } from '../../../src/modules/theater/services/theater.service';
import { TheaterRepository } from '../../../src/modules/theater/repositories/theater.repository';
import { DomainEventService } from '../../../src/services/domainEvent.service';
import { CorrelationService } from '../../../src/services/correlation.service';

describe('TheaterService', () => {
  let service: TheaterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TheaterService,
        {
          provide: TheaterRepository,
          useValue: {
            createCase: jest.fn(),
            findCaseById: jest.fn(),
            updateCase: jest.fn(),
            createStatusHistory: jest.fn(),
            findAllCases: jest.fn(),
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

    service = module.get<TheaterService>(TheaterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO: Add test cases
});












