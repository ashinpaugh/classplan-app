import {Dictionary} from '../../interfaces/dictionary';

export interface BlockObject {
  id: number;
  display_name: string;
}

export interface TermObject {
  blocks: Dictionary<BlockObject>[];
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
