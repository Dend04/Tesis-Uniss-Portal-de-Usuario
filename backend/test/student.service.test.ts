import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { SigenuService } from '../src/services/sigenu.services';

const mock = new MockAdapter(axios);
const CI_VALIDO = '03021373180';

describe('SigenuService', () => {
  afterEach(() => {
    mock.reset();
  });

  describe('getStudentMainData', () => {
    test('Obtener datos principales exitosamente', async () => {
      mock.onGet(/getStudentAllData/).reply(200, [{ personalData: { identification: CI_VALIDO } }]);
      
      const result = await SigenuService.getStudentMainData(CI_VALIDO);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('personalData');
    });
  });

  describe('getStudentPhoto', () => {
    test('Obtener foto en base64 exitosamente', async () => {
      mock.onGet(/photo-base64/).reply(200, 'iVBORw0KGgoAAAANSUhEUgAA...');
      
      const result = await SigenuService.getStudentPhoto(CI_VALIDO);
      
      expect(result.success).toBe(true);
      expect(result.data).toMatch(/^iVBORw0KGgo/);
    });
  });

  describe('getStudentStatusList', () => {
    test('Obtener lista de estados académicos', async () => {
      mock.onGet(/getstudentstatus/).reply(200, [{ id: '02', name: 'Activo' }]);
      
      const result = await SigenuService.getStudentStatusList();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: '02' })]));
    });
  });

  describe('getCompleteStudentData', () => {
    test('Obtener todos los datos combinados', async () => {
      mock.onGet(/getStudentAllData/).reply(200, [{}]);
      mock.onGet(/photo-base64/).reply(200, 'base64data');
      mock.onGet(/getstudentstatus/).reply(200, []);
      
      const result = await SigenuService.getCompleteStudentData(CI_VALIDO);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('photo');
      expect(result.data).toHaveProperty('statusMetadata');
    });

    test('Manejar error parcial en endpoints', async () => {
      mock.onGet(/getStudentAllData/).reply(200, [{}]);
      mock.onGet(/photo-base64/).reply(500);
      mock.onGet(/getstudentstatus/).reply(200, []);
      
      const result = await SigenuService.getCompleteStudentData(CI_VALIDO);
      
      expect(result.success).toBe(true);
      expect(result.data.photo).toBeNull();
    });
  });
});