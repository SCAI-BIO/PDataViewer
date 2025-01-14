export interface Terminology {
  id: string;
  name: string;
}

export interface Concept {
  id: string;
  name: string;
  terminology: Terminology;
}

export interface Mapping {
  concept: Concept;
  text: string;
  similarity: number;
}

export interface Response {
  variable: string;
  description: string;
  mappings: Mapping[];
}
