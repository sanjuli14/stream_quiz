import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { TournamentService, Participant, Match, Tournament } from '../../services/tournament.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tournament',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tournament.component.html',
  styleUrl: './tournament.component.css'
})
export class TournamentComponent implements OnInit, OnDestroy {
  private tournamentService = inject(TournamentService);
  private doc = inject(DOCUMENT);
  private subscription: Subscription | null = null;

  tournament: Tournament | null = null;
  participants: Participant[] = [];

  ngOnInit() {
    this.doc.body.classList.add('overlay-mode');
    
    this.subscription = this.tournamentService.escucharTorneo().subscribe(tournament => {
      this.tournament = tournament;
      if (tournament?.participants) {
        this.participants = Object.values(tournament.participants);
      }
    });
  }

  ngOnDestroy() {
    this.doc.body.classList.remove('overlay-mode');
    this.subscription?.unsubscribe();
  }

  getParticipant(id: string | null): Participant | null {
    if (!id || !this.tournament?.participants) return null;
    return this.tournament.participants[id] || null;
  }

  getMatchesByRound(round: string): Match[] {
    return this.tournamentService.getMatchesByRound(
      this.tournament?.matches,
      round
    );
  }

  getWinner(): Participant | null {
    const finalMatches = this.getMatchesByRound('final');
    if (finalMatches.length > 0 && finalMatches[0].winnerId) {
      return this.getParticipant(finalMatches[0].winnerId);
    }
    return null;
  }

  getSecondPlace(): Participant | null {
    const finalMatches = this.getMatchesByRound('final');
    if (finalMatches.length > 0 && finalMatches[0].loserId) {
      return this.getParticipant(finalMatches[0].loserId);
    }
    return null;
  }

  getThirdPlace(): Participant | null {
    const thirdMatches = this.getMatchesByRound('third_place');
    if (thirdMatches.length > 0 && thirdMatches[0].winnerId) {
      return this.getParticipant(thirdMatches[0].winnerId);
    }
    return null;
  }

  getFourthPlace(): Participant | null {
    const thirdMatches = this.getMatchesByRound('third_place');
    if (thirdMatches.length > 0 && thirdMatches[0].loserId) {
      return this.getParticipant(thirdMatches[0].loserId);
    }
    return null;
  }
}
