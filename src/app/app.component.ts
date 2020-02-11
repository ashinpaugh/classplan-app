import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {TermService} from './services/term/term.service';
import {Observable} from 'rxjs';
import {map, shareReplay} from 'rxjs/operators';
import {TermObject} from './services/term/term.interfaces';

@Component({
  selector: 'classplan-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  title = 'classplan';

  protected terms$: Observable<TermObject[]>;

  constructor(
    protected terms: TermService,
  ) {
  }

  ngOnInit(): void {
    this.terms$ = this.terms.fetchAll()
      .pipe(
        map(data => data.terms),
        shareReplay(1),
      )
    ;
  }
}
