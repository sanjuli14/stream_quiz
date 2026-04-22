import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { QuizService } from '../../services/quiz.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, OnDestroy {
  quizService = inject(QuizService);
  nuevaPregunta = {
    texto: '',
    opciones: ['', '', '', ''],
    correcta: 0,
    mostrarRespuesta: false
  };

  tiempoRespuesta = 30; // segundos por defecto
  tiempoRestante = 0;
  timerInterval: any = null;
  isTimerRunning = false;

  ngOnInit() {
    // Escuchar estado del juego para sincronizar timer
    this.quizService.escucharJuego().subscribe((data: any) => {
      if (data && data.tiempoRestante !== undefined) {
        this.tiempoRestante = data.tiempoRestante;
      }
      if (data && data.mostrarRespuesta) {
        this.stopTimer();
      }
    });
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  enviar() {
    this.nuevaPregunta.mostrarRespuesta = false;
    this.tiempoRestante = this.tiempoRespuesta;
    this.quizService.enviarPregunta({
      ...this.nuevaPregunta,
      tiempoTotal: this.tiempoRespuesta,
      tiempoRestante: this.tiempoRespuesta,
      mostrarRespuesta: false
    });
    this.startTimer();
  }

  revelar() {
    this.stopTimer();
    this.quizService.enviarPregunta({
      ...this.nuevaPregunta,
      tiempoRestante: this.tiempoRestante,
      mostrarRespuesta: true
    });
  }

  limpiar() {
    this.stopTimer();
    this.nuevaPregunta = {
      texto: '',
      opciones: ['', '', '', ''],
      correcta: 0,
      mostrarRespuesta: false
    };
    this.tiempoRestante = 0;
    this.quizService.enviarPregunta(null);
  }

  startTimer() {
    this.stopTimer();
    this.isTimerRunning = true;
    this.timerInterval = setInterval(() => {
      if (this.tiempoRestante > 0) {
        this.tiempoRestante--;
        // Actualizar en Firebase cada segundo
        this.quizService.enviarPregunta({
          ...this.nuevaPregunta,
          tiempoTotal: this.tiempoRespuesta,
          tiempoRestante: this.tiempoRestante,
          mostrarRespuesta: false
        });
      } else {
        this.stopTimer();
        // Tiempo agotado - revelar respuesta automáticamente
        this.revelar();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning = false;
  }

  tieneOpciones(): boolean {
    return this.nuevaPregunta.opciones.some(opt => opt.trim() !== '');
  }

  getPreviewClass(index: number): string {
    const isCorrect = index === this.nuevaPregunta.correcta;
    return isCorrect ? 'admin-preview-option admin-preview-option-correct' : 'admin-preview-option';
  }

  getFormatoTiempo(): string {
    const minutos = Math.floor(this.tiempoRestante / 60);
    const segundos = this.tiempoRestante % 60;
    return `${minutos}:${segundos.toString().padStart(2, '0')}`;
  }
}
