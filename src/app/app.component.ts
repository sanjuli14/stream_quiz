import { Component, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'stream_quiz';
  router = inject(Router);
  doc = inject(DOCUMENT);
  isOverlay = false;

  ngOnInit() {
    this.router.events.subscribe(() => {
      const url = this.router.url;
      // Modo overlay para página principal y bracket
      this.isOverlay = url === '' || url === '/' || url === '/bracket';

      if (this.isOverlay) {
        this.doc.body.classList.add('overlay-mode');
      } else {
        this.doc.body.classList.remove('overlay-mode');
      }
    });
  }
}
