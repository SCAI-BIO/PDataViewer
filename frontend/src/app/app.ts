import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from '@core/layout/footer/footer';
import { Header } from '@core/layout/header/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Footer, Header],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  title = 'pdataviewer';
}
