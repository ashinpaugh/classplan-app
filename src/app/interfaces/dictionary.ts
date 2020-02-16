export interface Dictionary<T> {
  [ idx: string ]: T;
}

export interface Dictionary<T> {
  [ idx: number ]: T;
}

export interface BasicObject {
  id: number;
  name: string;
  meta?: any;
}
