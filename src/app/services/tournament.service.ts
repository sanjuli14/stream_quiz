import { Injectable, inject } from '@angular/core';
import { Database, ref, set, onValue, push, remove, update } from '@angular/fire/database';
import { Observable } from 'rxjs';

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  eliminated: boolean;
  position?: number;
}

export interface Match {
  id: string;
  round: 'quarter' | 'semi' | 'third_place' | 'final';
  participant1Id: string | null;
  participant2Id: string | null;
  winnerId: string | null;
  loserId: string | null;
  position: number;
  isComplete: boolean;
}

export interface Tournament {
  participants: { [key: string]: Participant };
  matches: { [key: string]: Match };
  currentRound: 'quarter' | 'semi' | 'third_place' | 'final' | 'complete';
  isActive: boolean;
  hasThirdPlace: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  private db = inject(Database);
  private tournamentRef = ref(this.db, 'tournament');

  escucharTorneo(): Observable<Tournament | null> {
    return new Observable(observer => {
      onValue(this.tournamentRef, (snapshot) => {
        observer.next(snapshot.val());
      });
    });
  }

  async agregarParticipante(name: string, avatar?: string): Promise<string> {
    const participantsRef = ref(this.db, 'tournament/participants');
    const newParticipantRef = push(participantsRef);
    
    const participant: Participant = {
      id: newParticipantRef.key!,
      name,
      avatar: avatar || '',
      eliminated: false
    };
    
    await set(newParticipantRef, participant);
    return newParticipantRef.key!;
  }

  async eliminarParticipante(participantId: string): Promise<void> {
    await remove(ref(this.db, `tournament/participants/${participantId}`));
  }

  // Inicializar torneo con 4-8 participantes
  async inicializarTorneo(participantIds: string[], hasThirdPlace: boolean = true): Promise<void> {
    // Máximo 8 participantes
    if (participantIds.length > 8) {
      participantIds = participantIds.slice(0, 8);
    }
    
    // Mezclar aleatoriamente
    const shuffled = this.shuffleArray([...participantIds]);
    
    // Crear los 4 enfrentamientos de cuartos (positions 0-3)
    // Match 0: participantes 0 vs 1 (lado izquierdo arriba)
    // Match 1: participantes 2 vs 3 (lado izquierdo abajo)
    // Match 2: participantes 4 vs 5 (lado derecho arriba)
    // Match 3: participantes 6 vs 7 (lado derecho abajo)
    const matches: { [key: string]: Match } = {};
    
    for (let i = 0; i < 4; i++) {
      const p1 = shuffled[i * 2] || null;
      const p2 = shuffled[i * 2 + 1] || null;
      
      const matchRef = push(ref(this.db, 'tournament/matches'));
      const match: Match = {
        id: matchRef.key!,
        round: 'quarter',
        participant1Id: p1,
        participant2Id: p2,
        winnerId: null,
        loserId: null,
        position: i,
        isComplete: false
      };
      matches[matchRef.key!] = match;
    }

    const tournament: Partial<Tournament> = {
      currentRound: 'quarter',
      isActive: true,
      hasThirdPlace,
      matches
    };

    await update(ref(this.db, 'tournament'), tournament);
  }

  // Eliminar participante manualmente (el streamer elimina al perdedor)
  async eliminarParticipanteManual(participantId: string): Promise<void> {
    await update(ref(this.db, `tournament/participants/${participantId}`), {
      eliminated: true
    });

    // Buscar match activo con este participante
    const matchesSnapshot = await new Promise<any>(resolve => {
      onValue(ref(this.db, 'tournament/matches'), (snap) => resolve(snap.val()), { onlyOnce: true });
    });

    const matchesList: Match[] = Object.values(matchesSnapshot || {});
    const activeMatch = matchesList.find(m =>
      !m.isComplete &&
      (m.participant1Id === participantId || m.participant2Id === participantId)
    );

    if (activeMatch) {
      const winnerId = activeMatch.participant1Id === participantId
        ? activeMatch.participant2Id
        : activeMatch.participant1Id;

      if (winnerId) {
        await this.registrarGanador(activeMatch.id, winnerId);
      }
    }
  }

  // Registrar ganador de un enfrentamiento
  async registrarGanador(matchId: string, winnerId: string): Promise<void> {
    const matchRef = ref(this.db, `tournament/matches/${matchId}`);
    const matchSnapshot = await new Promise<any>(resolve => {
      onValue(matchRef, (snap) => resolve(snap.val()), { onlyOnce: true });
    });

    const match: Match = matchSnapshot;
    const loserId = match.participant1Id === winnerId ? match.participant2Id : match.participant1Id;

    // Actualizar match actual
    await update(matchRef, {
      winnerId,
      loserId,
      isComplete: true
    });

    // Marcar perdedor como eliminado
    if (loserId) {
      await update(ref(this.db, `tournament/participants/${loserId}`), {
        eliminated: true
      });
    }

    // Avanzar ganador a siguiente ronda
    await this.avanzarGanador(match, winnerId);
    
    // Si es semifinal, perdedor va a 3er lugar
    if (match.round === 'semi' && loserId) {
      await this.avanzarPerdedorATercerLugar(match, loserId);
    }
  }

  private async avanzarGanador(currentMatch: Match, winnerId: string): Promise<void> {
    const nextRound = this.getNextRound(currentMatch.round);
    if (!nextRound || nextRound === 'third_place') return;

    // Calcular posición en siguiente ronda
    // Cuartos: positions 0,1,2,3 → Semis: positions 0,1 (0=0+1, 1=2+3)
    // Semis: positions 0,1 → Final: position 0
    const nextPosition = currentRoundPosition(currentMatch.round, currentMatch.position);
    
    const matchesRef = ref(this.db, 'tournament/matches');
    const matchesSnapshot = await new Promise<any>(resolve => {
      onValue(matchesRef, (snap) => resolve(snap.val()), { onlyOnce: true });
    });

    const matchesList: Match[] = Object.values(matchesSnapshot || {});
    let nextMatch = matchesList.find(m => m.round === nextRound && m.position === nextPosition);

    if (!nextMatch) {
      const newMatchRef = push(matchesRef);
      const slot = getSlotForNextRound(currentMatch.round, currentMatch.position);
      const newMatch: Match = {
        id: newMatchRef.key!,
        round: nextRound as Match['round'],
        participant1Id: slot === 1 ? winnerId : null,
        participant2Id: slot === 2 ? winnerId : null,
        winnerId: null,
        loserId: null,
        position: nextPosition,
        isComplete: false
      };
      await set(newMatchRef, newMatch);
    } else {
      const slot = getSlotForNextRound(currentMatch.round, currentMatch.position);
      await update(ref(this.db, `tournament/matches/${nextMatch.id}`), {
        [slot === 1 ? 'participant1Id' : 'participant2Id']: winnerId
      });
    }
  }

  private async avanzarPerdedorATercerLugar(semiMatch: Match, loserId: string): Promise<void> {
    const tournamentSnapshot = await new Promise<any>(resolve => {
      onValue(ref(this.db, 'tournament'), (snap) => resolve(snap.val()), { onlyOnce: true });
    });

    if (!tournamentSnapshot.hasThirdPlace) return;

    const matchesList: Match[] = Object.values(tournamentSnapshot.matches || {});
    let thirdPlaceMatch = matchesList.find(m => m.round === 'third_place');

    const matchesRef = ref(this.db, 'tournament/matches');

    if (!thirdPlaceMatch) {
      // Primero en llegar → participant1
      const newMatchRef = push(matchesRef);
      const newMatch: Match = {
        id: newMatchRef.key!,
        round: 'third_place',
        participant1Id: loserId,
        participant2Id: null,
        winnerId: null,
        loserId: null,
        position: 0,
        isComplete: false
      };
      await set(newMatchRef, newMatch);
    } else {
      // Segundo en llegar → participant2
      if (!thirdPlaceMatch.participant2Id) {
        await update(ref(this.db, `tournament/matches/${thirdPlaceMatch.id}`), {
          participant2Id: loserId
        });
      }
    }
  }

  async avanzarRonda(): Promise<void> {
    const snapshot = await new Promise<any>(resolve => {
      onValue(this.tournamentRef, (snap) => resolve(snap.val()), { onlyOnce: true });
    });

    const nextRound = this.getNextRound(snapshot.currentRound);
    
    if (nextRound) {
      await update(this.tournamentRef, { currentRound: nextRound });
    } else {
      await update(this.tournamentRef, { currentRound: 'complete', isActive: false });
    }
  }

  async reiniciarTorneo(): Promise<void> {
    await remove(this.tournamentRef);
  }

  private getNextRound(current: string): string | null {
    const progression: { [key: string]: string | null } = {
      'quarter': 'semi',
      'semi': 'final',
      'third_place': null,
      'final': null
    };
    return progression[current] || null;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  getMatchesByRound(matches: { [key: string]: Match } | undefined, round: string): Match[] {
    if (!matches) return [];
    return Object.values(matches)
      .filter(m => m.round === round)
      .sort((a, b) => a.position - b.position);
  }

  getParticipant(participants: { [key: string]: Participant } | undefined, id: string): Participant | undefined {
    if (!participants || !id) return undefined;
    return participants[id];
  }
}

// Helper functions for bracket progression
function currentRoundPosition(round: string, position: number): number {
  if (round === 'quarter') {
    // Cuartos 0,1 → Semis 0; Cuartos 2,3 → Semis 1
    return position < 2 ? 0 : 1;
  }
  if (round === 'semi') {
    // Semis 0,1 → Final 0
    return 0;
  }
  return 0;
}

function getSlotForNextRound(round: string, position: number): number {
  if (round === 'quarter') {
    // Cuartos 0,2 → slot 1; Cuartos 1,3 → slot 2
    return (position === 0 || position === 2) ? 1 : 2;
  }
  if (round === 'semi') {
    // Semis 0 → slot 1; Semis 1 → slot 2
    return position === 0 ? 1 : 2;
  }
  return 1;
}
