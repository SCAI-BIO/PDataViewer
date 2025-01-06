import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';

@Component({
    selector: 'app-imprint',
    imports: [MatCardModule, MatGridListModule],
    templateUrl: './imprint.component.html',
    styleUrl: './imprint.component.css'
})
export class ImprintComponent {}
