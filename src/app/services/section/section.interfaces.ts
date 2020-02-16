import {BlockObject} from '../term/term.interfaces';
import {BasicObject} from '../../interfaces/dictionary';

export interface SectionFetchAllParams {
  block: number | number[];
  subject: number | number[];
  instructor: number | number[];
}



export interface SectionObject {
  id: number;
  crn: number;
  status: number;
  number: string;
  days: number
  num_enrolled: number
  maximum_enrollment: number;
  meeting_type: number;
  start: string;
  end: string;
  start_time: string;
  end_time: string;

  subject: BasicObject;
  course: {
    id: number;
    number: number;
    name: string;
    level: string;
  }

  block: BlockObject;
  campus: BasicObject;
  building: BasicObject;
  room: {id: number, number: string};
  instructor: BasicObject;
}
