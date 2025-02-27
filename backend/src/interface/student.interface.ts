export interface RawStudentData {
  personalData: any;
  docentData: any;
  motherData: any;
  fatherData: any;
}

// Interfaces para cada endpoint
export interface StudentMainData {
  personalData: {
    fullName: string;
    identification: string;
    birthDate: string;
    address: string;
    contact: string;
    origin: string;
  };
  academicData: {
    faculty: string;
    career: string;
    year: string;
    status: string;
    academicIndex: string;
  };
  familyData: {
    mother: string;
    father: string;
  };
  rawData: any;
}

export interface StudentPhoto {
  photoBase64: string;
}

export interface AcademicStatus {
  id: string;
  name: string;
  description?: string;
}

// Interface combinada
export interface StudentCompleteData {
  mainData: StudentMainData;
  photoData: StudentPhoto;
  statusData: AcademicStatus[];
}

// Interface para respuesta genérica
export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string };
