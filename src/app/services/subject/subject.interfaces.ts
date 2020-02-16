import {BasicObject, Dictionary} from '../../interfaces/dictionary';
import {BlockObject} from '../term/term.interfaces';


export interface ApiGetBlockAwareSubjectList {
  block: BlockObject;
  subjects: BasicObject[];
}
