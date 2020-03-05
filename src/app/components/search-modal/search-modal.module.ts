import {NgModule} from '@angular/core';
import {SearchModalComponent} from './search-modal.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatDialogModule} from '@angular/material/dialog';
import {MatGridListModule} from '@angular/material/grid-list';
import {NgSelectModule} from '@ng-select/ng-select';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatListModule} from '@angular/material/list';
import {ColorGithubModule} from 'ngx-color/github';
import {MatExpansionModule} from '@angular/material/expansion';


@NgModule({
  declarations: [
    SearchModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BrowserAnimationsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatGridListModule,
    NgSelectModule,
    MatCheckboxModule,
    MatListModule,
    ColorGithubModule,
    MatExpansionModule,
  ],
  bootstrap: [SearchModalComponent],
  exports: [SearchModalComponent],
})
export class SearchModalComponentModule { }
