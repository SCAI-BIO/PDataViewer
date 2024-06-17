import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import * as d3 from 'd3';
import { ChordDiagramService } from './chord-diagram.service';

describe('ChordDiagramService', () => {
  let service: ChordDiagramService;
  let httpMock: HttpTestingController;

  // Mock data for testing
  const mockData = {
    nodes: [
      { name: 'Node1', group: 'Group1' },
      { name: 'Node2', group: 'Group2' },
    ],
    links: [{ source: 'Node1', target: 'Node2' }],
  };

  const mockColors = {
    Group1: '#ff0000',
    Group2: '#00ff00',
  };

  // Set up the testing module and inject the service
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ChordDiagramService],
    });
    service = TestBed.inject(ChordDiagramService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  // Verify no outstanding HTTP requests
  afterEach(() => {
    httpMock.verify();
  });

  // Test to ensure the service is created
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Test to ensure colors are loaded correctly
  it('should load and set colors correctly', () => {
    service.loadColors().subscribe((colors) => {
      service.setColors(colors);
      expect(service['colorScale'].domain()).toEqual(Object.keys(colors));
      expect(service['colorScale'].range()).toEqual(Object.values(colors));
    });

    const req = httpMock.expectOne('/assets/colors.json');
    expect(req.request.method).toBe('GET');
    req.flush(mockColors);
  });

  describe('chunkData', () => {
    // Test to verify that chunkData correctly chunks the data
    it('should chunk data correctly', () => {
      const chunkSize = 1;
      const chunks = service.chunkData(mockData, chunkSize);
      expect(chunks.length).toBe(2); // Should create 2 chunks
      expect(chunks[0].nodes.length).toBe(1); // Each chunk should contain 1 node
      expect(chunks[1].nodes.length).toBe(1);
    });
  });

  describe('createChordDiagrams', () => {
    // Test to ensure createChordDiagram is called for each data chunk
    it('should call createChordDiagram for each chunk', fakeAsync(() => {
      const spy = spyOn(service as any, 'createChordDiagram').and.callThrough();
      const chunks = service.chunkData(mockData, 1);
      service.createChordDiagrams(chunks);
      tick(); // Simulate the passage of time
      expect(spy).toHaveBeenCalledTimes(chunks.length); // Should be called for each chunk
    }));
  });

  describe('createChordDiagram', () => {
    // Test to ensure a chord diagram is created with the correct data
    it('should create a chord diagram with correct data', () => {
      const index = 0;
      // Create a container for the SVG element
      const svgElement = document.createElement('div');
      svgElement.classList.add('chord-diagram');
      document.body.appendChild(svgElement);

      // Append an SVG element to the container
      d3.select(svgElement).append('svg');

      // Get a chunk of data and create a chord diagram
      const dataChunk = service.chunkData(mockData, 2)[0];
      service['createChordDiagram'](dataChunk, index);

      // Check that the SVG element contains `g` elements, indicating the chord diagram was created
      const svg = d3.select(svgElement).select('svg');
      expect(svg.selectAll('g').nodes().length).toBeGreaterThan(0);

      // Clean up by removing the container
      document.body.removeChild(svgElement);
    });

    // Test to ensure colors are applied correctly to the chord diagram
    it('should apply colors correctly', () => {
      const index = 0;
      // Create a container for the SVG element
      const svgElement = document.createElement('div');
      svgElement.classList.add('chord-diagram');
      document.body.appendChild(svgElement);

      // Append an SVG element to the container
      d3.select(svgElement).append('svg');

      // Set mock colors
      service.setColors(mockColors);

      // Get a chunk of data and create a chord diagram
      const dataChunk = service.chunkData(mockData, 2)[0];
      service['createChordDiagram'](dataChunk, index);

      // Check that the colors are correctly applied
      const svg = d3.select(svgElement).select('svg');
      const groupPaths = svg.selectAll('g path').nodes();

      // Filter to only group arcs
      const groupArcs = groupPaths.filter((node) => {
        const d = d3.select(node).datum() as any;
        return d && d.startAngle !== undefined && d.endAngle !== undefined;
      });

      expect(groupArcs.length).toBe(2); // Should be exactly 2 groups
      expect(d3.select(groupArcs[0]).style('fill')).toBe('rgb(255, 0, 0)'); // Group1 color
      expect(d3.select(groupArcs[1]).style('fill')).toBe('rgb(0, 255, 0)'); // Group2 color

      // Clean up by removing the container
      document.body.removeChild(svgElement);
    });
  });
});
