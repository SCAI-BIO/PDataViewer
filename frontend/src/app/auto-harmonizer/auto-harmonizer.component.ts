import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../environments/environment';
import { Terminology, Response } from '../interfaces/mapping';

@Component({
  selector: 'app-auto-harmonizer',
  templateUrl: './auto-harmonizer.component.html',
  styleUrls: ['./auto-harmonizer.component.css'],
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    ReactiveFormsModule,
  ],
})
export class AutoHarmonizerComponent implements OnInit {
  @ViewChild('paginator') paginator!: MatPaginator;

  autoHarmonizerForm: FormGroup;
  closestMappings: Response[] = [];
  dataSource = new MatTableDataSource<Response>([]);
  displayedColumns = [
    'variable',
    'description',
    'conceptName',
    'text',
    'similarity',
  ];
  embeddingModels: string[] = [];
  fileToUpload: File | null = null;
  fileName = '';
  formData = new FormData();
  loading = false;
  requiredFileType =
    '.csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  terminologies: string[] = [];
  private readonly API_URL = environment.INDEX_API_URL;

  constructor(private http: HttpClient, private fb: FormBuilder) {
    this.autoHarmonizerForm = this.fb.group({
      selectedTerminology: ['', Validators.required],
      selectedEmbeddingModel: ['', Validators.required],
      variableField: ['', Validators.required],
      descriptionField: ['', Validators.required],
    });
  }

  convertToCSV(data: Response[]): string {
    const headers = [
      'Variable',
      'Description',
      'Concept Name',
      'Text',
      'Similarity',
    ];

    const escapeCSV = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const rows = data.map((item) =>
      [
        escapeCSV(item.variable),
        escapeCSV(item.description),
        escapeCSV(item.mappings[0].concept.name),
        escapeCSV(item.mappings[0].text),
        item.mappings[0].similarity,
      ].join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  downloadTableAsCSV(): void {
    const csvData = this.convertToCSV(this.closestMappings);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdataviewer-harmonization-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  ngOnInit(): void {
    this.loadTerminologies();
    this.loadEmbeddingModels();
  }

  loadTerminologies(): void {
    this.http.get<Terminology[]>(`${this.API_URL}/terminologies`).subscribe({
      next: (terminologies) => {
        this.terminologies = terminologies.map((t) => t.name);
      },
      error: (err) => console.error('Error fetching terminologies:', err),
    });
  }

  loadEmbeddingModels(): void {
    this.http.get<string[]>(`${this.API_URL}/models`).subscribe({
      next: (models) => (this.embeddingModels = models),
      error: (err) => console.error('Error fetching embedding models:', err),
    });
  }

  fetchClosestMappings(): void {
    if (!this.autoHarmonizerForm.valid) {
      console.error('Form is invalid:', this.autoHarmonizerForm.value);
      return;
    }

    this.loading = true;

    this.http
      .post<Response[]>(`${this.API_URL}/mappings/dict/`, this.formData, {
        headers: new HttpHeaders({ Accept: 'application/json' }),
      })
      .subscribe({
        next: (response) => {
          this.closestMappings = response;
          this.dataSource.data = response;
          this.dataSource.paginator = this.paginator;
        },
        error: (err) => {
          console.error('Error fetching closest mappings:', err);

          const errorMessage =
            err.error?.message || err.message || 'Unknown error occurred';

          this.loading = false;
          alert(`An error occurred while fetching mappings: ${errorMessage}`);
        },
        complete: () => {
          this.loading = false;
        },
      });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileToUpload = input.files[0];
      this.fileName = this.fileToUpload.name;
      this.formData.set('file', this.fileToUpload);
    }
  }

  onSubmit(): void {
    if (this.autoHarmonizerForm.valid) {
      const {
        variableField,
        descriptionField,
        selectedEmbeddingModel,
        selectedTerminology,
      } = this.autoHarmonizerForm.value;

      this.formData.set('variable_field', variableField);
      this.formData.set('description_field', descriptionField);
      this.formData.set('model', selectedEmbeddingModel);
      this.formData.set('terminology_name', selectedTerminology);

      this.fetchClosestMappings();
    } else {
      console.error('Form is invalid:', this.autoHarmonizerForm.value);
    }
  }
}
