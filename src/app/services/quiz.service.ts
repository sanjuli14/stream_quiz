import { Injectable, inject } from '@angular/core';
import { Database, ref, set, object, onValue } from '@angular/fire/database';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private db = inject(Database);
  // Referencia al nodo principal de tu juego
  private gameRef = ref(this.db, 'game_state');

  // Para el Panel de Admin: Actualizar la pregunta
  enviarPregunta(pregunta: any) {
    return set(this.gameRef, pregunta);
  }

  // Para el Overlay: Escuchar cambios en tiempo real
  escucharJuego(): Observable<any> {
    return new Observable(observer => {
      onValue(this.gameRef, (snapshot) => {
        const data = snapshot.val();
        observer.next(data);
      });
    });
  }
}