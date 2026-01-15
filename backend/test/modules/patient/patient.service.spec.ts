import { Test, TestingModule } from '@nestjs/testing';
import { PatientService } from '../../../src/modules/patient/services/patient.service';
import { PatientRepository } from '../../../src/modules/patient/repositories/patient.repository';
import { DomainEventService } from '../../../src/services/domainEvent.service';
import { CorrelationService } from '../../../src/services/correlation.service';

describe('PatientService', () => {
  let service: PatientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        {
          provide: PatientRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findAll: jest.fn(),
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

    service = module.get<PatientService>(PatientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO: Add test cases
});












