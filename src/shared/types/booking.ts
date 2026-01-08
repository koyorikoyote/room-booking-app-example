export interface BookingFormData {
  roomId: number;
  departmentId: number;
  date: string;
  startTime: string;
  endTime: string;
  repetition: string[];
  remarks?: string;
}

export interface BookingConflict {
  existingBookingId: number;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  room: string;
}

export interface CreateBookingResponse {
  success: boolean;
  data?: {
    id: number;
    roomId: number;
    departmentId: number;
    date: Date;
    startTime: string;
    endTime: string;
    remarks?: string;
    isRecurring: boolean;
  };
  conflicts?: BookingConflict[];
  error?: string;
}
