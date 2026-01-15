import { Test, TestingModule } from '@nestjs/testing';
import { DataAccessLogService } from '../../../src/modules/audit/services/dataAccessLog.service';

describe('DataAccessLogService', () => {
  let service: DataAccessLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataAccessLogService],
    }).compile();

    service = module.get<DataAccessLogService>(DataAccessLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO: Add test cases
});












