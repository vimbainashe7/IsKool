import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateStudentDto, UpdateStudentDto, StudentListDto, CreateTermDto } from '../student.dto';
describe('student request validation', () => {
  it('normalizes admission numbers and names', async () => {
    const dto=plainToInstance(CreateStudentDto,{admissionNumber:' a-001 ',givenName:' Alpha ',familyName:' Learner '});
    expect(await validate(dto)).toHaveLength(0);expect(dto.admissionNumber).toBe('A-001');expect(dto.givenName).toBe('Alpha');
  });
  it('rejects client supplied tenant/role fields', async () => {
    const dto=plainToInstance(CreateStudentDto,{admissionNumber:'A-1',givenName:'Alpha',familyName:'Learner',schoolId:'other',roles:['admin']});
    expect(await validate(dto,{whitelist:true,forbidNonWhitelisted:true})).toHaveLength(2);
  });
  it.each([{givenName:null},{givenName:''},{status:null},{version:0},{version:'1'}])('rejects invalid update %j', async fields => {
    expect((await validate(plainToInstance(UpdateStudentDto,{version:1,...fields}))).length).toBeGreaterThan(0);
  });
  it('bounds pagination', async () => {expect((await validate(plainToInstance(StudentListDto,{limit:500}))).length).toBeGreaterThan(0);});
  it('validates inherited calendar fields and real dates', async () => {
    expect((await validate(plainToInstance(CreateTermDto,{label:'Term',academicYearId:'not-uuid',startsOn:'2026-02-30',endsOn:'2026-04-30'}))).length).toBeGreaterThan(0);
  });
});
