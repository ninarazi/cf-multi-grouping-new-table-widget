
export type ColumnType = 'text' | 'boolean' | 'number' | 'date' | 'person' | 'company' | 'color' | 'files';

export interface Column {
  id: string;
  label: string;
  type: ColumnType;
  width?: string;
  unit?: string; // e.g., 'years', 'percent'
}

export interface TableRow {
  id: string;
  name: string;
  external: boolean;
  age: number;
  exp: number;
  tenure: number;
  score: number;
  birthday: string;
  manager: {
    name: string;
    initials: string;
  };
  company: {
    name: string;
  };
  country: string;
  favSongs: string;
  favColor: string;
  files: string[];
}

export interface GroupNode {
  type: 'group';
  id: string;
  path: string;
  level: number;
  groupKey: string;
  groupValue: string;
  children: TableNode[];
  itemCount: number;
}

export interface RowNode {
  type: 'row';
  id: string;
  data: TableRow;
  level: number;
}

export interface TotalNode {
  type: 'total';
  id: string;
  label: string;
  level: number;
  stats: Record<string, number>;
}

export type TableNode = GroupNode | RowNode | TotalNode;

export type AggregationFunction = 'sum' | 'avg' | 'min' | 'max' | 'count';
