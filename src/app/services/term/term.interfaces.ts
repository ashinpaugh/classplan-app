import {BasicObject} from '../../interfaces/dictionary';

export interface BlockObject extends BasicObject {
  term?: TermObject;
}

export interface TermObject {
  blocks: BlockObject[];
  id: number;
  name: string;
  year: number;
  semester: string;
}

export interface ApiGetTerm {
  term: TermObject;
}

export interface ApiGetTermCollection {
  terms: TermObject[];
}
