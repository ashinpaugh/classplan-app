import {BlockObject} from '../term/term.interfaces';
import {BasicObject} from '../../interfaces/dictionary';
import {ApiParams} from '../abstract-service';


export enum SectionMeetingType {
  Exam = 0,
  Class = 1,
  Web = 2,
  Lab = 3,
  Conference = 4,
}

export interface SectionFetchAllParams extends ApiParams {
  block: number | number[];
  subject: number | number[];
  instructor: number | number[];
  building: number[];
  room: number[];
  meetingType: SectionMeetingType[];
}



export interface SectionObject {
  id: number;
  crn: number;
  status: number;
  number: string;
  days: string;
  num_enrolled: number
  maximum_enrollment: number;
  meeting_type: number;
  meeting_type_str: string;
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
