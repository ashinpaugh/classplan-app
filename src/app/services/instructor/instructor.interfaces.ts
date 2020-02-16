import {BlockObject} from '../term/term.interfaces';
import {BasicObject, Dictionary} from '../../interfaces/dictionary';


export interface InstructorFetchAllParams {
  block: number | number[];
}



export interface ApiGetBlockAwareInstructorList {
  block: BlockObject;
  instructors: Dictionary<BasicObject[]>;
}
