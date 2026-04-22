import { Component, inject, OnInit, afterNextRender } from '@angular/core';
import { QuizService } from '../../services/quiz.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overlay.component.html',
  styleUrl: './overlay.component.css'
})
export class OverlayComponent implements OnInit {
  quizService = inject(QuizService);
  gameData: any;
  audioCorrecto: HTMLAudioElement | null = null;
  audioError: HTMLAudioElement | null = null;

  constructor() {
    afterNextRender(() => {
      // Inicializar audios solo en el browser después del render
      this.audioCorrecto = new Audio('assets/correct.mp3');
      this.audioError = new Audio('assets/Laugh.m4a');
    });
  }

  ngOnInit() {
    this.quizService.escucharJuego().subscribe(data => {
      const prevMostrar = this.gameData?.mostrarRespuesta;
      this.gameData = data;

      // Detectar cuando se revela la respuesta
      if (data?.mostrarRespuesta && !prevMostrar) {
        this.reproducirSonidoCorrecto();
      }
    });
  }

  reproducirSonidoCorrecto() {
    if (this.audioCorrecto) {
      this.audioCorrecto.currentTime = 0;
      this.audioCorrecto.play().catch(e => console.log('Audio error:', e));
    }
  }

  reproducirSonidoError() {
    if (this.audioError) {
      this.audioError.currentTime = 0;
      this.audioError.play().catch(e => console.log('Audio error:', e));
    }
  }

  getOptionClass(index: number): string {
    if (!this.gameData?.mostrarRespuesta) {
      return 'overlay-option overlay-option-default';
    }

    if (index === this.gameData.correcta) {
      return 'overlay-option overlay-option-correct';
    } else {
      return 'overlay-option overlay-option-wrong';
    }
  }

  getLetterClass(index: number): string {
    if (!this.gameData?.mostrarRespuesta) {
      const colors = [
        'overlay-option-letter-a',
        'overlay-option-letter-b',
        'overlay-option-letter-c',
        'overlay-option-letter-d'
      ];
      return 'overlay-option-letter ' + colors[index];
    }

    if (index === this.gameData.correcta) {
      return 'overlay-option-letter overlay-option-letter-correct';
    } else {
      return 'overlay-option-letter overlay-option-letter-wrong';
    }
  }

  getFormatoTiempo(): string {
    const tiempo = this.gameData?.tiempoRestante || 0;
    const minutos = Math.floor(tiempo / 60);
    const segundos = tiempo % 60;
    return `${minutos}:${segundos.toString().padStart(2, '0')}`;
  }
}