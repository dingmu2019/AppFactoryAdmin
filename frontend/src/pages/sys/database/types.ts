export interface SchemaTableInfo {
  name: string;
  comment: string | null;
}

export interface SchemaColumnInfo {
  name: string;
  type: string;
  length: string | null;
  nullable: boolean;
  is_pk: boolean;
  comment: string | null;
}

export interface SchemaIndexInfo {
  name: string;
  is_unique: boolean;
  definition: string;
}

export interface SchemaForeignKeyInfo {
  name: string;
  column: string;
  ref_table: string;
  ref_column: string;
}

export interface SchemaInfo {
  table: SchemaTableInfo;
  columns: SchemaColumnInfo[];
  indexes: SchemaIndexInfo[];
  foreignKeys: SchemaForeignKeyInfo[];
}
