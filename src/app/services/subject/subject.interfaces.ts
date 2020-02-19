import {BasicObject, Dictionary} from '../../interfaces/dictionary';
import {BlockObject} from '../term/term.interfaces';


export interface BlockAwareSubjectList {
  block: BlockObject;
  subjects: BasicObject[];
  instructor?: BasicObject[];
}
