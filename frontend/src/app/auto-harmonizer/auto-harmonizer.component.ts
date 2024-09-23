import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HttpClient,
  HttpEvent,
  HttpEventType,
  HttpHeaders,
} from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { environment } from '../../environments/environment';
import { Terminology, Response } from '../interfaces/mapping';
import { MyErrorStateMatcherService } from '../services/my-error-state-matcher.service';

@Component({
  selector: 'app-auto-harmonizer',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    ReactiveFormsModule,
  ],
  templateUrl: './auto-harmonizer.component.html',
  styleUrl: './auto-harmonizer.component.css',
})
export class AutoHarmonizerComponent implements OnInit {
  @ViewChild('paginator') paginator!: MatPaginator;

  autoHarmonizerForm!: FormGroup;
  closestMappings: Response[] = [];
  dataSource!: MatTableDataSource<Response>;
  displayedColumns: string[] = [
    'variable',
    'description',
    'conceptName',
    'text',
    'similarity',
  ];
  embeddingModels: string[] = [];
  fileToUpload: File | null = null;
  fileName: string = '';
  formData = new FormData();
  matcher = new MyErrorStateMatcherService();
  uploadProgress: number | null = null;
  requiredFileType: string =
    '.csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  terminologies: string[] = [];
  private API_URL = environment.INDEX_API_URL;

  constructor(private http: HttpClient, private fb: FormBuilder) {}

  fetchTerminologies(): void {
    this.http.get<Terminology[]>(`${this.API_URL}/terminologies`).subscribe({
      next: (terminologies) => {
        this.terminologies = terminologies.map(
          (terminology) => terminology.name
        );
      },
      error: (error) => console.error('Fetch error:', error),
      complete: () => console.info('Terminologies successfully fetched'),
    });
  }

  fetchEmbeddingModels(): void {
    this.http.get<string[]>(`${this.API_URL}/models`).subscribe({
      next: (v) => (this.embeddingModels = v),
      error: (error) => console.error('Fetch error:', error),
      complete: () => console.info('Embedding models successfully fetched'),
    });
  }

  fetchClosestMappings(formData: FormData): void {
    this.http
      .post<Response[]>(`${this.API_URL}/mappings/dict/`, formData, {
        headers: new HttpHeaders({
          Accept: 'application/json',
        }),
        reportProgress: true,
        observe: 'events',
      })
      .subscribe({
        next: (event: HttpEvent<Response[]>) => {
          switch (event.type) {
            case HttpEventType.UploadProgress:
              if (event.total) {
                this.uploadProgress = Math.round(
                  (100 * event.loaded) / event.total
                );
              }
              break;
            case HttpEventType.Response:
              console.log('Data fetched:', event.body);
              if (event.body) {
                this.closestMappings = event.body;
                this.dataSource = new MatTableDataSource(event.body);
                this.dataSource.paginator = this.paginator;
              }
              this.uploadProgress = null;
              break;
          }
        },
        error: (error) => {
          console.error('Fetch error:', error);
          this.uploadProgress = null;
        },
        complete: () => {
          console.info('Upload complete');
        },
      });
  }

  ngOnInit(): void {
    this.autoHarmonizerForm = this.fb.group({
      selectedTerminology: ['', Validators.required],
      selectedEmbeddingModel: ['', Validators.required],
      variableField: ['', Validators.required],
      descriptionField: ['', Validators.required],
    });

    this.fetchTerminologies();
    this.fetchEmbeddingModels();
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileName = input.files[0].name;
      this.formData.set('file', input.files[0]);
    }
  }

  onSubmit(): void {
    this.formData.set(
      'variable_field',
      this.autoHarmonizerForm.value.variableField
    );
    this.formData.set(
      'description_field',
      this.autoHarmonizerForm.value.descriptionField
    );
    this.formData.set(
      'model',
      this.autoHarmonizerForm.value.selectedEmbeddingModel
    );
    this.formData.set(
      'terminology_name',
      this.autoHarmonizerForm.value.selectedTerminology
    );
    this.fetchClosestMappings(this.formData);
  }
}
