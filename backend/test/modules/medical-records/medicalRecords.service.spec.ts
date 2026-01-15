import { Test, TestingModule } from '@nestjs/testing';
import { MedicalRecordsService } from '../../../src/modules/medical-records/services/medicalRecords.service';
import { MedicalRecordsRepository } from '../../../src/modules/medical-records/repositories/medicalRecords.repository';
import { DomainEventService } from '../../../src/services/domainEvent.service';
import { CorrelationService } from '../../../src/services/correlation.service';

describe('MedicalRecordsService', () => {
  let service: MedicalRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalRecordsService,
        {
          provide: MedicalRecordsRepository,
          useValue: {
            createRecord: jest.fn(),
            findRecordById: jest.fn(),
            updateRecord: jest.fn(),
            createMergeHistory: jest.fn(),
            findAllRecords: jest.fn(),
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

    service = module.get<MedicalRecordsService>(MedicalRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO: Add test cases
});












