export interface Mapping {
  concept: {
    id: string;
    name: string;
    terminology: {
      id: string;
      name: string;
    };
    text: string;
    similarity: number;
  };
}

export interface Terminology {
  name: string;
  id: string;
}

export interface Response {
  variable: string;
  description: string;
  mappings: Mapping[];
}
