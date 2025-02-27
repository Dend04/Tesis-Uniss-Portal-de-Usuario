// tests/sigenu.service.test.ts
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { SigenuService } from '../src/services/sigenu.services';
import { AcademicStatus, StudentMainData, StudentPhoto } from '../src/interface/student.interface';

const mock = new MockAdapter(axios);
const MOCK_CI = '00000000000'; // CI genérico para pruebas

// Datos mockeados
const mockMainData: StudentMainData = {
  personalData: {
    fullName: 'Juan Pérez García',
    identification: MOCK_CI,
    birthDate: '2000-01-01',
    address: 'Calle 123 #456',
    contact: '5551234567',
    origin: 'La Habana, Cuba'
  },
  academicData: {
    faculty: 'Facultad de Ingeniería',
    career: 'Ingeniería en Ciencias Informáticas',
    year: '2° Año',
    status: '02',
    academicIndex: '4.50'
  },
  familyData: {
    mother: 'Ana García - Doctora (Nivel Superior)',
    father: 'Carlos Pérez - Ingeniero (Nivel Medio)'
  },
  rawData: {}
};

const mockPhoto: StudentPhoto = {
  photoBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
};

const mockStatuses: AcademicStatus[] = [
  { id: '02', name: 'Activo', description: 'Estudiante regular' }
];

describe('SigenuService', () => {
  afterEach(() => {
    mock.reset();
  });

  describe('getStudentData', () => {
    test('Obtener todos los datos combinados exitosamente', async () => {
      // Configurar mocks
      mock.onGet(/getStudentAllData/).reply(200, [mockMainData.rawData]);
      mock.onGet(/photo-base64/).reply(200, mockPhoto.photoBase64);
      mock.onGet(/getstudentstatus/).reply(200, mockStatuses);

      const result = await SigenuService.getStudentData(MOCK_CI);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mainData).toMatchObject(mockMainData);
        expect(result.data.photoData).toEqual(mockPhoto);
        expect(result.data.statusData).toEqual(mockStatuses);
      }
    });

    test('Manejar error en múltiples endpoints', async () => {
      mock.onGet(/getStudentAllData/).reply(500);
      mock.onGet(/photo-base64/).reply(404);
      mock.onGet(/getstudentstatus/).reply(200, mockStatuses);

      const result = await SigenuService.getStudentData(MOCK_CI);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Principal/);
        expect(result.error).toMatch(/Foto/);
      }
    });

    test('Manejar datos incompletos', async () => {
      mock.onGet(/getStudentAllData/).reply(200, []);
      mock.onGet(/photo-base64/).reply(200, 'invalid-base64');
      mock.onGet(/getstudentstatus/).reply(200, {});

      const result = await SigenuService.getStudentData(MOCK_CI);
      
      expect(result.success).toBe(false);
    });
  });

  // Test para casos específicos
  describe('Casos especiales', () => {
    test('Manejar CI inválido', async () => {
      const result = await SigenuService.getStudentData('123');
      expect(result.success).toBe(false);
    });

    test('Manejar timeout', async () => {
      mock.onGet(/getStudentAllData/).timeout();
      const result = await SigenuService.getStudentData(MOCK_CI);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/timeout/i);
    });
  });
});