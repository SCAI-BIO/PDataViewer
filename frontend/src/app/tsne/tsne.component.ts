import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Observable, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-tsne',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './tsne.component.html',
  styleUrl: './tsne.component.css',
})
export class TsneComponent implements OnInit, OnDestroy {
  apiErrorMessage: string | null = null;
  tsneHtml: SafeHtml | null = null;
  private API_URL = environment.INDEX_API_URL;
  private subscriptions: Subscription[] = [];

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  loadTsne(): void {
    const sub = this.serveTsne().subscribe({
      next: (html) => {
        this.tsneHtml = this.sanitizer.bypassSecurityTrustHtml(html);
        this.apiErrorMessage = null;
      },
      error: (error) => {
        console.error('Error loading t-SNE visualization', error);
        if (error.status === 404) {
          this.apiErrorMessage = 'API is currently down.';
        } else {
          this.apiErrorMessage = 'An unexpected error occurred';
        }
      },
      complete: () => console.info('t-SNE visualization loaded successfully.'),
    });

    this.subscriptions.push(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnInit(): void {
    const sub = this.updateTsne().subscribe({
      next: (response) => {
        console.log('t-SNE updated successfully:', response);
        this.loadTsne();
      },
      error: (error) => console.error('Error updating t-SNE:', error),
      complete: () => console.info('t-SNE update process completed.'),
    });

    this.subscriptions.push(sub);
  }

  serveTsne(): Observable<string> {
    return this.http.get(`${this.API_URL}/visualization`, {
      responseType: 'text',
    });
  }

  updateTsne(): Observable<any> {
    return this.http.patch(`${this.API_URL}/visualization`, {});
  }
}
