import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TournamentService, Participant, Match, Tournament } from '../../services/tournament.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tournament-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tournament-admin.component.html',
  styleUrl: './tournament-admin.component.css'
})
export class TournamentAdminComponent implements OnInit, OnDestroy {
  private tournamentService = inject(TournamentService);
  private subscription: Subscription | null = null;

  tournament: Tournament | null = null;
  participants: Participant[] = [];
  newParticipantName = '';
  newParticipantAvatar = '';
  hasThirdPlace = true;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  rounds = [
    { key: 'quarter', label: 'Cuartos de Final' },
    { key: 'semi', label: 'Semifinales' },
    { key: 'third_place', label: 'Tercer Lugar' },
    { key: 'final', label: 'Final' },
    { key: 'complete', label: 'Completado' }
  ];

  ngOnInit() {
    this.subscription = this.tournamentService.escucharTorneo().subscribe(tournament => {
      this.tournament = tournament;
      if (tournament?.participants) {
        this.participants = Object.values(tournament.participants);
      } else {
        this.participants = [];
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  async agregarParticipante() {
    if (!this.newParticipantName.trim()) {
      this.errorMessage = 'Ingresa un nombre';
      return;
    }
    
    // Máximo 8 participantes
    if (this.participants.length >= 8) {
      this.errorMessage = 'Máximo 8 participantes permitidos';
      return;
    }

    this.isLoading = true;
    try {
      await this.tournamentService.agregarParticipante(
        this.newParticipantName.trim(),
        this.newParticipantAvatar.trim() || undefined
      );
      this.newParticipantName = '';
      this.newParticipantAvatar = '';
      this.successMessage = 'Participante agregado';
      setTimeout(() => this.successMessage = '', 2000);
    } catch (error) {
      this.errorMessage = 'Error al agregar participante';
    } finally {
      this.isLoading = false;
    }
  }

  async eliminarParticipante(id: string) {
    if (!confirm('¿Eliminar este participante?')) return;
    
    this.isLoading = true;
    try {
      await this.tournamentService.eliminarParticipante(id);
      this.successMessage = 'Participante eliminado';
      setTimeout(() => this.successMessage = '', 2000);
    } catch (error) {
      this.errorMessage = 'Error al eliminar';
    } finally {
      this.isLoading = false;
    }
  }

  async iniciarTorneo() {
    if (this.participants.length < 2) {
      this.errorMessage = 'Se necesitan al menos 2 participantes';
      return;
    }

    if (!confirm(`¿Iniciar torneo con ${this.participants.length} participantes?`)) return;

    this.isLoading = true;
    try {
      const ids = this.participants.map(p => p.id);
      await this.tournamentService.inicializarTorneo(ids, this.hasThirdPlace);
      this.successMessage = 'Torneo iniciado';
      setTimeout(() => this.successMessage = '', 2000);
    } catch (error) {
      this.errorMessage = 'Error al iniciar torneo';
    } finally {
      this.isLoading = false;
    }
  }

  async registrarGanador(matchId: string, winnerId: string) {
    this.isLoading = true;
    try {
      await this.tournamentService.registrarGanador(matchId, winnerId);
      this.successMessage = 'Ganador registrado';
      setTimeout(() => this.successMessage = '', 2000);
    } catch (error) {
      this.errorMessage = 'Error al registrar ganador';
    } finally {
      this.isLoading = false;
    }
  }

  async avanzarRonda() {
    if (!confirm('¿Avanzar a la siguiente ronda?')) return;
    
    this.isLoading = true;
    try {
      await this.tournamentService.avanzarRonda();
      this.successMessage = 'Ronda avanzada';
      setTimeout(() => this.successMessage = '', 2000);
    } catch (error) {
      this.errorMessage = 'Error al avanzar';
    } finally {
      this.isLoading = false;
    }
  }

  async reiniciarTorneo() {
    if (!confirm('¿Reiniciar todo el torneo? Se perderán todos los datos.')) return;
    
    this.isLoading = true;
    try {
      await this.tournamentService.reiniciarTorneo();
      this.successMessage = 'Torneo reiniciado';
      setTimeout(() => this.successMessage = '', 2000);
    } catch (error) {
      this.errorMessage = 'Error al reiniciar';
    } finally {
      this.isLoading = false;
    }
  }

  async eliminarManualmente(participantId: string) {
    if (!confirm('¿Eliminar este participante del torneo? El oponente avanzará automáticamente.')) return;

    this.isLoading = true;
    try {
      await this.tournamentService.eliminarParticipanteManual(participantId);
      this.successMessage = 'Participante eliminado';
      setTimeout(() => this.successMessage = '', 2000);
    } catch (error) {
      this.errorMessage = 'Error al eliminar';
    } finally {
      this.isLoading = false;
    }
  }

  getParticipant(id: string): Participant | undefined {
    return this.tournamentService.getParticipant(this.tournament?.participants, id);
  }

  getMatchesByRound(round: string): Match[] {
    return this.tournamentService.getMatchesByRound(
      this.tournament?.matches,
      round
    );
  }

  getCurrentRoundLabel(): string {
    const round = this.rounds.find(r => r.key === this.tournament?.currentRound);
    return round?.label || 'No iniciado';
  }

  canStartTournament(): boolean {
    return this.participants.length >= 2 && !this.tournament?.isActive;
  }

  isMatchComplete(match: Match): boolean {
    return !!match.winnerId;
  }

  getBracketUrl(): string {
    return `${window.location.origin}/bracket`;
  }
}
