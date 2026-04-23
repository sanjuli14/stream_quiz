import { Component, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

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
  isOverlay = false;

  ngOnInit() {
    this.router.events.subscribe(() => {
      this.isOverlay = this.router.url === '' || this.router.url === '/';
      
      if (this.isOverlay) {
        document.body.classList.add('overlay-mode');
      } else {
        document.body.classList.remove('overlay-mode');
      }
    });
  }
}
