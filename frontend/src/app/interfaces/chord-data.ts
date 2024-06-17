import { ChordNode } from '../interfaces/chord-node';
import { ChordLink } from './chord-link';

export interface ChordData {
  nodes: ChordNode[];
  links: ChordLink[];
}
